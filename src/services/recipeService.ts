import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Dish {
  name: string;
  type: 'main' | 'side' | 'soup';
  description: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  mealType?: string;
  dishes?: Dish[];
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
    usedIn?: string;
  }>;
  instructions: string[];
  detailedSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    duration: string;
    tips?: string;
  }>;
  tips?: string[];
  nutritionInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

export interface RecipeRequest {
  ingredients: string[];
  skillLevel: string;
  mealDays: number;
  allowShopping: boolean;
  peopleCount: number;
  mealType: string;
  occasionType: string;
  cuisineType: string;
  apiKey: string;
  language?: string;
}

export class RecipeService {
  private genAI: GoogleGenerativeAI | null = null;
  private supabaseUrl = "https://jamywhzmeizbbobiuhcn.supabase.co";
  private apiEndpoint = `${this.supabaseUrl}/functions/v1/generate-recipes`;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateRecipes(request: RecipeRequest): Promise<Recipe[]> {
    console.log('Starting recipe generation with request:', {
      ingredients: request.ingredients,
      skillLevel: request.skillLevel,
      mealDays: request.mealDays,
      mealType: request.mealType,
      cuisineType: request.cuisineType
    });

    try {
      // Use the edge function which now includes Deepseek fallback
      console.log('Calling edge function with Deepseek fallback capability...');
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: request.ingredients,
          skillLevel: request.skillLevel,
          mealDays: request.mealDays,
          allowShopping: request.allowShopping,
          peopleCount: request.peopleCount,
          mealType: request.mealType,
          occasionType: request.occasionType,
          cuisineType: request.cuisineType,
          language: request.language || 'zh'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Recipe generation successful via edge function');
        
        // Convert edge function format to our expected format
        const convertedRecipes = data.recipes.map((recipe: any, index: number) => ({
          id: recipe.id || `recipe-${Date.now()}-${index}`,
          title: recipe.title || 'Untitled Recipe',
          description: recipe.description || '',
          prepTime: recipe.prepTime || 30,
          cookTime: recipe.cookTime || 45,
          servings: recipe.servings || request.peopleCount,
          difficulty: recipe.difficulty || request.skillLevel,
          mealType: recipe.mealType || request.mealType,
          dishes: recipe.dishes || [],
          ingredients: this.processIngredients(recipe.ingredients || [], request.ingredients),
          instructions: recipe.instructions || [],
          detailedSteps: recipe.dishInstructions?.[0]?.steps || [],
          tips: recipe.coordinationTips || [],
          nutritionInfo: recipe.nutritionInfo
        }));
        
        
        return convertedRecipes;
      } else {
        const errorData = await response.json();
        console.error('Edge function failed with detailed error:', errorData);
        
        // Show detailed API error information for debugging
        if (errorData.debugInfo) {
          throw new Error(`Recipe generation failed: ${errorData.debugInfo}. Details: ${JSON.stringify(errorData.details)}`);
        } else {
          throw new Error(`Recipe generation failed: ${errorData.message || response.statusText}`);
        }
      }
    } catch (edgeFunctionError) {
      console.error('Edge function error, falling back to mock recipes:', edgeFunctionError);
      
      // If edge function fails, fall back to mock recipes instead of trying Gemini again
      return this.getMockRecipes(request.ingredients, request.allowShopping);
    }
  }

  private async generateWithGemini(request: RecipeRequest): Promise<Recipe[]> {
    if (!this.genAI) {
      console.error('API key not set in RecipeService');
      throw new Error('API key not set and OpenAI fallback failed');
    }

    console.log('Using Gemini fallback...');
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = this.createPrompt(request);
    
    try {
      console.log('Calling Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('Gemini API response received');
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw Gemini response:', text);
      
      return await this.parseRecipeResponse(text, request.ingredients, request.allowShopping);
    } catch (error) {
      console.error('Gemini generation also failed:', error);
      
      // Return mock recipes as final fallback
      console.log('Falling back to mock recipes');
      return this.getMockRecipes(request.ingredients, request.allowShopping);
    }
  }

  private createPrompt(request: RecipeRequest): string {
    const { ingredients, skillLevel, allowShopping, peopleCount, mealType, occasionType, cuisineType, language } = request;
    const isEnglish = language === 'en';
    
    // 根据用餐人数计算菜的数量：每2-3人一道菜，最少4道菜
    const dishCount = Math.max(4, Math.ceil(peopleCount / 2));
    
    return `
You are a professional cooking assistant helping home cooks create perfect meal combinations. Create 1 complete rich meal plan with ${dishCount} different dishes.

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

MEAL REQUIREMENTS:
- Number of people: ${peopleCount}
- Number of dishes needed: ${dishCount} (${isEnglish ? 'rich meal, not just one dish' : '丰富的一顿饭，不能只有一道菜'})
- Meal type: ${mealType} (breakfast/lunch/dinner/brunch/snack)
- Occasion: ${occasionType} (daily meal or gathering/party)
- Cuisine preference: ${cuisineType}
- Skill level: ${skillLevel}
- Planning for: 1 meal (${isEnglish ? 'one complete rich meal' : '一顿丰富的饭'})
- Shopping allowed: ${allowShopping ? 'Yes (can suggest a few additional ingredients)' : 'No (use only available ingredients)'}
- Language: ${isEnglish ? 'Generate ALL content in English' : '所有内容必须用中文生成'}

CRITICAL MEAL PLANNING PRINCIPLES:
1. **RICH MEAL COMPOSITION**: Create exactly ${dishCount} different dishes for one complete meal
2. **DISH VARIETY**: Must include at least: 1-2 main dishes, 2-3 side dishes, 1 soup or beverage
3. **SMART INGREDIENT SELECTION**: Select 3-6 ingredients per dish that work well together
4. **LOGICAL COMBINATIONS**: Choose ingredients that complement each other in flavor, texture, and cooking method
5. **CUISINE CONSISTENCY**: Ensure selected ingredients align with ${cuisineType} cuisine traditions
6. **NUTRITIONAL BALANCE**: Select ingredients that provide protein, vegetables, and carbohydrates in proper proportions
7. Create complete meal combinations for ${peopleCount} people
8. Match the ${mealType} meal type and ${occasionType} occasion style
9. Match the ${skillLevel} skill level with appropriate techniques
10. Consider cooking coordination and timing for all ${dishCount} dishes

${isEnglish ? 'IMPORTANT: Generate ALL recipe content in English including dish names, descriptions, ingredients, and instructions.' : 'IMPORTANT: 所有食谱内容必须用中文生成，包括菜名、描述、食材和步骤说明。'}

Please respond with meal plans in this JSON format:
{
  "recipes": [
    {
      "id": "rich-meal-1",
      "title": "${isEnglish ? `Complete ${mealType} Meal (${dishCount} dishes)` : `丰富的${mealType}搭配 (${dishCount}道菜)`}",
      "description": "${isEnglish ? `Balanced ${cuisineType} rich meal perfect for ${occasionType}, serving ${peopleCount} people with ${dishCount} dishes` : `适合${occasionType}的均衡${cuisineType}丰富餐食，为${peopleCount}人提供${dishCount}道菜`}",
      "prepTime": 30,
      "cookTime": 45,
      "servings": ${peopleCount},
      "difficulty": "${skillLevel}",
      "mealType": "${mealType}",
      "dishes": [
        {
          "name": "${isEnglish ? 'Main Dish Name' : '主菜名称'}",
          "type": "main",
          "description": "${isEnglish ? 'Main dish description' : '主菜描述'}"
        },
        {
          "name": "${isEnglish ? 'Side Dish Name' : '配菜名称'}", 
          "type": "side",
          "description": "${isEnglish ? 'Side dish description' : '配菜描述'}"
        },
        {
          "name": "${isEnglish ? 'Second Side Dish Name' : '第二个配菜名称'}",
          "type": "side", 
          "description": "${isEnglish ? 'Second side dish description' : '第二个配菜描述'}"
        },
        {
          "name": "${isEnglish ? 'Soup/Beverage Name' : '汤/饮品名称'}",
          "type": "soup",
          "description": "${isEnglish ? 'Soup or beverage description' : '汤或饮品描述'}"
        }
      ],
      "ingredients": [
        {"item": "${isEnglish ? 'ingredient name' : '食材名称'}", "amount": "${isEnglish ? 'quantity' : '用量'}", "needed": false, "usedIn": "${isEnglish ? 'main dish' : '主菜'}"},
        {"item": "${isEnglish ? 'ingredient to buy' : '需购买食材'}", "amount": "${isEnglish ? 'quantity' : '用量'}", "needed": true, "usedIn": "${isEnglish ? 'side dish' : '配菜'}"}
      ],
      "instructions": [
        "${isEnglish ? 'Step 1: Detailed cooking instructions' : '步骤1：详细烹饪说明'}",
        "${isEnglish ? 'Step 2: Detailed cooking instructions' : '步骤2：详细烹饪说明'}",
        "${isEnglish ? 'Step 3: Coordination of all dishes and timing' : '步骤3：所有菜品的协调和时间安排'}"
      ],
      "detailedSteps": [
        {
          "stepNumber": 1,
          "title": "${isEnglish ? 'Preparation Phase' : '准备阶段'}",
          "description": "${isEnglish ? 'Detailed step-by-step description of what to do, including exact measurements, techniques, and timing. Be very specific about cutting techniques, temperatures, and cooking methods.' : '详细的步骤说明，包括精确的用量、技巧和时间。具体说明切配技巧、温度和烹饪方法。'}",
          "duration": "${isEnglish ? '5-10 minutes' : '5-10分钟'}",
          "tips": "${isEnglish ? 'Pro tip for this specific step' : '这个步骤的专业提示'}"
        },
        {
          "stepNumber": 2,
          "title": "${isEnglish ? 'Cooking Phase' : '烹饪阶段'}",
          "description": "${isEnglish ? 'Very detailed cooking instructions with specific temperatures, timing, and visual cues to look for. Include what the food should look, smell, and sound like.' : '非常详细的烹饪说明，包括具体温度、时间和视觉提示。包括食物应该呈现的外观、气味和声音。'}",
          "duration": "${isEnglish ? '15-20 minutes' : '15-20分钟'}",
          "tips": "${isEnglish ? 'Important cooking tip for this step' : '这个步骤的重要烹饪提示'}"
        }
      ],
      "tips": [
        "${isEnglish ? 'Cooking tip 1: How to coordinate timing' : '烹饪提示1：如何协调时间'}",
        "${isEnglish ? 'Cooking tip 2: Nutritional balance suggestions' : '烹饪提示2：营养均衡建议'}"
      ],
      "nutritionInfo": {
        "calories": 650,
        "protein": "35g", 
        "carbs": "45g",
        "fat": "18g"
      }
    }
  ]
}

CRITICAL INSTRUCTIONS FOR DETAILED STEPS:
- Generate 6-10 detailed cooking steps with specific techniques, temperatures, and timing
- Each step should include a descriptive title, detailed instructions (100-200 words), estimated duration, and helpful tips
- Include visual cues like "${isEnglish ? 'until golden brown' : '直到金黄色'}", "${isEnglish ? 'when it sizzles' : '当发出滋滋声'}", "${isEnglish ? 'soft to touch' : '触感柔软'}"
- Provide specific measurements, temperatures (°C), and timing for each step
- Add professional cooking tips for each step
- Make instructions so detailed that a beginner could follow them successfully
- Include coordination between ${dishCount} different dishes being prepared simultaneously
- ${isEnglish ? 'ALL content must be in English' : '所有内容必须用中文'}

Important Guidelines:
- Create exactly ${dishCount} different dishes for this one meal
- Prioritize available ingredients as main components
- Consider cooking time coordination for all ${dishCount} dishes
- Provide practical meal combination tips and nutritional advice
- Use specific and appealing dish names
- Match ${cuisineType} cuisine flavor profiles and cooking methods
- Consider dietary needs for ${occasionType} occasions
- Adapt portion sizes and complexity for ${peopleCount} people
- Ensure the meal is rich and complete with ${dishCount} dishes
- ${isEnglish ? 'Generate everything in English language' : '用中文生成所有内容'}
    `;
  }

  private async parseRecipeResponse(response: string, availableIngredients: string[], allowShopping: boolean): Promise<Recipe[]> {
    try {
      console.log('Parsing recipe response, length:', response.length);
      
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No valid JSON found in response. Raw response:', response);
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      console.log('Extracted JSON string:', jsonStr);
      
      const data = JSON.parse(jsonStr);
      console.log('Parsed JSON data:', data);

      if (!data.recipes || !Array.isArray(data.recipes)) {
        console.error('Invalid recipe format. Data structure:', data);
        throw new Error('Invalid recipe format');
      }

      console.log(`Successfully parsed ${data.recipes.length} recipes`);

      const parsedRecipes = data.recipes.map((recipe: any, index: number) => ({
        id: recipe.id || `recipe-${Date.now()}-${index}`,
        title: recipe.title || 'Untitled Recipe',
        description: recipe.description || '',
        prepTime: recipe.prepTime || 30,
        cookTime: recipe.cookTime || 45,
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || 'beginner',
        mealType: recipe.mealType || 'lunch',
        dishes: recipe.dishes || [],
        ingredients: this.processIngredients(recipe.ingredients || [], availableIngredients),
        instructions: recipe.instructions || [],
        detailedSteps: recipe.detailedSteps || [],
        tips: recipe.tips || [],
        nutritionInfo: recipe.nutritionInfo
      }));

      
      return parsedRecipes;
    } catch (error) {
      console.error('Error parsing recipe response:', {
        error: error,
        responsePreview: response.substring(0, 500),
        responseLength: response.length
      });
      
      // Return mock recipes as fallback
      console.log('Falling back to mock recipes');
      return this.getMockRecipes(availableIngredients, allowShopping);
    }
  }


  private processIngredients(ingredients: any[], availableIngredients: string[]): Array<{item: string, amount: string, needed?: boolean, usedIn?: string}> {
    return ingredients.map(ing => {
      const ingredient = typeof ing === 'string' ? { item: ing, amount: '1 unit' } : ing;
      const isAvailable = availableIngredients.some(available => 
        available.toLowerCase().includes(ingredient.item.toLowerCase()) ||
        ingredient.item.toLowerCase().includes(available.toLowerCase())
      );
      
      return {
        item: ingredient.item,
        amount: ingredient.amount,
        needed: !isAvailable,
        usedIn: ingredient.usedIn
      };
    });
  }

  private getMockRecipes(ingredients: string[], allowShopping: boolean): Recipe[] {
    // Fallback mock recipes for demo purposes
    return [
      {
        id: 'mock-1',
        title: 'Today\'s Lunch Combination',
        description: 'Balanced meal combination perfect for the whole family',
        prepTime: 20,
        cookTime: 35,
        servings: 4,
        difficulty: 'beginner',
        mealType: 'lunch',
        dishes: [
          {
            name: 'Stir-fried ' + (ingredients[0] || 'vegetables'),
            type: 'main',
            description: 'Simple and delicious main dish'
          },
          {
            name: 'Fresh side salad',
            type: 'side', 
            description: 'Light and refreshing side dish'
          },
          {
            name: 'Nutritious soup',
            type: 'soup',
            description: 'Warming and healthy soup'
          }
        ],
        ingredients: [
          { item: ingredients[0] || 'vegetables', amount: '300g', needed: false, usedIn: 'main dish' },
          { item: ingredients[1] || 'protein', amount: '200g', needed: false, usedIn: 'main dish' },
          { item: 'soy sauce', amount: '2 tbsp', needed: allowShopping, usedIn: 'seasoning' },
          { item: 'garlic', amount: '3 cloves', needed: false, usedIn: 'main dish' },
          { item: 'oil', amount: 'as needed', needed: false, usedIn: 'cooking' }
        ],
        instructions: [
          'Prepare all ingredients, wash and cut as needed',
          'Start with the soup, simmer on low heat',
          'Heat wok with oil, add minced garlic until fragrant',
          'Add main ingredients and stir-fry, season to taste',
          'Prepare the side dish with simple seasoning',
          'Coordinate all dishes to serve together'
        ],
        tips: [
          'Cook soup first, then main and side dishes',
          'Balance nutrition with protein, vegetables, and carbs',
          'Adjust seasoning according to family preferences'
        ],
        nutritionInfo: {
          calories: 580,
          protein: '28g',
          carbs: '35g',
          fat: '15g'
        }
      }
    ];
  }
}
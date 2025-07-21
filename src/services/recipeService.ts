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
    imagePrompt?: string;
    imageUrl?: string;
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
          cuisineType: request.cuisineType
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
    const { ingredients, skillLevel, mealDays, allowShopping, peopleCount, mealType, occasionType, cuisineType } = request;

    return `
You are a professional cooking assistant helping home cooks create perfect meal combinations. Create ${mealDays} complete meal plans.

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

MEAL REQUIREMENTS:
- Number of people: ${peopleCount}
- Meal type: ${mealType} (breakfast/lunch/dinner/brunch/snack)
- Occasion: ${occasionType} (daily meal or gathering/party)
- Cuisine preference: ${cuisineType}
- Skill level: ${skillLevel}
- Planning for: ${mealDays} days
- Shopping allowed: ${allowShopping ? 'Yes (can suggest a few additional ingredients)' : 'No (use only available ingredients)'}

CRITICAL MEAL PLANNING PRINCIPLES:
1. **SMART INGREDIENT SELECTION**: You MUST NOT use all available ingredients in each meal. Select only 3-6 ingredients that work well together and make culinary sense
2. **LOGICAL COMBINATIONS**: Choose ingredients that complement each other in flavor, texture, and cooking method
3. **CUISINE CONSISTENCY**: Ensure selected ingredients align with ${cuisineType} cuisine traditions
4. **NUTRITIONAL BALANCE**: Select ingredients that provide protein, vegetables, and carbohydrates in proper proportions
5. Create complete meal combinations for ${peopleCount} people
6. Match the ${mealType} meal type and ${occasionType} occasion style
7. Include balanced dish combinations: main dish + side dish + soup/beverage (when appropriate)
8. Match the ${skillLevel} skill level with appropriate techniques
9. Consider cooking coordination and timing

Please respond with meal plans in this JSON format:
{
  "recipes": [
    {
      "id": "meal-day-1",
      "title": "Day 1 ${mealType} Combination",
      "description": "Balanced ${cuisineType} meal perfect for ${occasionType}, serving ${peopleCount}",
      "prepTime": 30,
      "cookTime": 45,
      "servings": ${peopleCount},
      "difficulty": "${skillLevel}",
      "mealType": "${mealType}",
      "dishes": [
        {
          "name": "Main Dish Name",
          "type": "main",
          "description": "Main dish description"
        },
        {
          "name": "Side Dish Name", 
          "type": "side",
          "description": "Side dish description"
        },
        {
          "name": "Soup/Beverage Name",
          "type": "soup",
          "description": "Soup or beverage description"
        }
      ],
      "ingredients": [
        {"item": "ingredient name", "amount": "quantity", "needed": false, "usedIn": "main dish"},
        {"item": "ingredient to buy", "amount": "quantity", "needed": true, "usedIn": "side dish"}
      ],
      "instructions": [
        "Step 1: Detailed cooking instructions",
        "Step 2: Detailed cooking instructions",
        "Step 3: Coordination of all dishes and timing"
      ],
      "detailedSteps": [
        {
          "stepNumber": 1,
          "title": "Preparation Phase",
          "description": "Detailed step-by-step description of what to do, including exact measurements, techniques, and timing. Be very specific about cutting techniques, temperatures, and cooking methods.",
          "duration": "5-10 minutes",
          "tips": "Pro tip for this specific step",
          "imagePrompt": "A realistic cooking photo showing the preparation stage with ingredients laid out on a clean kitchen counter, proper lighting, professional food photography style"
        },
        {
          "stepNumber": 2,
          "title": "Cooking Phase",
          "description": "Very detailed cooking instructions with specific temperatures, timing, and visual cues to look for. Include what the food should look, smell, and sound like.",
          "duration": "15-20 minutes",
          "tips": "Important cooking tip for this step",
          "imagePrompt": "A realistic cooking photo showing the cooking process in action, with proper lighting and professional food photography style"
        }
      ],
      "tips": [
        "Cooking tip 1: How to coordinate timing",
        "Cooking tip 2: Nutritional balance suggestions"
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
- Include visual cues like "until golden brown", "when it sizzles", "soft to touch"
- Provide specific measurements, temperatures (°C), and timing for each step
- Add professional cooking tips for each step
- Generate detailed image prompts for each step showing the cooking process
- Make instructions so detailed that a beginner could follow them successfully
- Include coordination between different dishes being prepared simultaneously

Important Guidelines:
- Prioritize available ingredients as main components
- Consider cooking time coordination for all dishes
- Provide practical meal combination tips and nutritional advice
- Use specific and appealing dish names
- Match ${cuisineType} cuisine flavor profiles and cooking methods
- Consider dietary needs for ${occasionType} occasions
- Adapt portion sizes and complexity for ${peopleCount} people
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

      // Generate images for detailed steps
      await this.generateStepImages(parsedRecipes);
      
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

  private async generateStepImages(recipes: Recipe[]): Promise<void> {
    // For now, we'll skip image generation and just add placeholder URLs
    // In a real implementation, you would call an image generation API here
    for (const recipe of recipes) {
      if (recipe.detailedSteps) {
        for (const step of recipe.detailedSteps) {
          if (step.imagePrompt) {
            // For now, use a placeholder. In production, generate images using AI
            step.imageUrl = `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&crop=center`;
          }
        }
      }
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
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

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateRecipes(request: RecipeRequest): Promise<Recipe[]> {
    if (!this.genAI) {
      console.error('API key not set in RecipeService');
      throw new Error('API key not set');
    }

    console.log('Starting recipe generation with request:', {
      ingredients: request.ingredients,
      skillLevel: request.skillLevel,
      mealDays: request.mealDays,
      allowShopping: request.allowShopping,
      hasApiKey: !!request.apiKey
    });

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = this.createPrompt(request);
    
    console.log('Generated prompt:', prompt);

    try {
      console.log('Calling Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('Gemini API response received');
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw Gemini response:', text);
      
      return this.parseRecipeResponse(text, request.ingredients, request.allowShopping);
    } catch (error) {
      console.error('Detailed error generating recipes:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        apiKeyExists: !!this.genAI
      });
      
      // Check if it's an API key issue
      if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Google AI Studio API key.');
      }
      
      // Check if it's a quota issue
      if (error instanceof Error && error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Google AI Studio usage limits.');
      }
      
      // Generic error with more context
      throw new Error(`Failed to generate recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private parseRecipeResponse(response: string, availableIngredients: string[], allowShopping: boolean): Recipe[] {
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

      return data.recipes.map((recipe: any, index: number) => ({
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
        tips: recipe.tips || [],
        nutritionInfo: recipe.nutritionInfo
      }));
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
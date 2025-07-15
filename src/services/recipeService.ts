import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
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
    const { ingredients, skillLevel, mealDays, allowShopping } = request;

    return `
You are a friendly cooking assistant helping a home cook plan meals. Create ${mealDays} delicious, practical recipes.

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

REQUIREMENTS:
- Skill level: ${skillLevel}
- Planning for: ${mealDays} days
- Shopping allowed: ${allowShopping ? 'Yes (can suggest a few additional ingredients)' : 'No (use only available ingredients)'}

INSTRUCTIONS:
1. Create recipes that use primarily the available ingredients
2. Match the specified skill level (${skillLevel})
3. If shopping is allowed, you may suggest 1-3 additional common ingredients per recipe
4. Include prep/cook times, servings, and clear instructions
5. Add helpful cooking tips
6. Include basic nutrition information

Please respond with recipes in this JSON format:
{
  "recipes": [
    {
      "id": "unique-id",
      "title": "Recipe Name",
      "description": "Brief appetizing description",
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "difficulty": "${skillLevel}",
      "ingredients": [
        {"item": "ingredient name", "amount": "1 cup", "needed": false},
        {"item": "ingredient to buy", "amount": "2 tbsp", "needed": true}
      ],
      "instructions": [
        "Step 1 instruction",
        "Step 2 instruction"
      ],
      "tips": [
        "Helpful tip 1",
        "Helpful tip 2"
      ],
      "nutritionInfo": {
        "calories": 350,
        "protein": "25g",
        "carbs": "30g",
        "fat": "12g"
      }
    }
  ]
}

Make the recipes appealing to home cooks, especially busy families. Focus on practical, delicious meals that bring joy to cooking!
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
        prepTime: recipe.prepTime || 15,
        cookTime: recipe.cookTime || 30,
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || 'beginner',
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

  private processIngredients(ingredients: any[], availableIngredients: string[]): Array<{item: string, amount: string, needed?: boolean}> {
    return ingredients.map(ing => {
      const ingredient = typeof ing === 'string' ? { item: ing, amount: '1 unit' } : ing;
      const isAvailable = availableIngredients.some(available => 
        available.toLowerCase().includes(ingredient.item.toLowerCase()) ||
        ingredient.item.toLowerCase().includes(available.toLowerCase())
      );
      
      return {
        item: ingredient.item,
        amount: ingredient.amount,
        needed: !isAvailable
      };
    });
  }

  private getMockRecipes(ingredients: string[], allowShopping: boolean): Recipe[] {
    // Fallback mock recipes for demo purposes
    return [
      {
        id: 'mock-1',
        title: 'Quick & Easy Stir Fry',
        description: 'A delicious and healthy stir fry using your available ingredients',
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        difficulty: 'beginner',
        ingredients: [
          { item: ingredients[0] || 'Mixed vegetables', amount: '2 cups', needed: false },
          { item: ingredients[1] || 'Protein', amount: '1 lb', needed: false },
          { item: 'Soy sauce', amount: '3 tbsp', needed: allowShopping },
          { item: 'Garlic', amount: '3 cloves', needed: false },
          { item: 'Oil', amount: '2 tbsp', needed: false }
        ],
        instructions: [
          'Heat oil in a large pan or wok over high heat',
          'Add garlic and cook for 30 seconds until fragrant',
          'Add protein and cook until almost done',
          'Add vegetables and stir fry for 3-5 minutes',
          'Add soy sauce and toss everything together',
          'Cook for another 2 minutes and serve hot'
        ],
        tips: [
          'Make sure your pan is very hot before adding ingredients',
          'Cut all ingredients into similar sizes for even cooking',
          'Don\'t overcrowd the pan - cook in batches if needed'
        ],
        nutritionInfo: {
          calories: 285,
          protein: '22g',
          carbs: '18g',
          fat: '14g'
        }
      }
    ];
  }
}
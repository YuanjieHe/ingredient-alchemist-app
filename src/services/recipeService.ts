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
      throw new Error('API key not set');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = this.createPrompt(request);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseRecipeResponse(text, request.ingredients, request.allowShopping);
    } catch (error) {
      console.error('Error generating recipes:', error);
      throw new Error('Failed to generate recipes. Please try again.');
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
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const data = JSON.parse(jsonStr);

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid recipe format');
      }

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
      console.error('Error parsing recipe response:', error);
      // Return mock recipes as fallback
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
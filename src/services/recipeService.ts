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
你是一位专业的中餐烹饪助手，帮助家庭主妇规划${mealDays}天的完整餐食。每顿饭应该包含营养均衡的搭配组合。

现有食材: ${ingredients.join(', ')}

要求:
- 烹饪技能水平: ${skillLevel === 'beginner' ? '初级(简单易做)' : skillLevel === 'intermediate' ? '中级(有一定技巧)' : '高级(复杂技法)'}
- 规划天数: ${mealDays} 天
- 是否可购买额外食材: ${allowShopping ? '是(可推荐1-3样常见食材)' : '否(仅使用现有食材)'}

搭配原则:
1. 每顿饭包含完整搭配: 主菜 + 配菜/素菜 + 汤/粥(可选)
2. 营养均衡: 荤素搭配，有蛋白质、蔬菜、主食
3. 色彩丰富: 注意菜品颜色搭配
4. 适合家庭: 制作简单，适合忙碌的家庭主妇
5. 充分利用现有食材，减少浪费

请按以下JSON格式回复餐食搭配:
{
  "recipes": [
    {
      "id": "meal-day-1",
      "title": "第一天午餐搭配",
      "description": "营养均衡的家常搭配，荤素搭配，适合全家享用",
      "prepTime": 30,
      "cookTime": 45,
      "servings": 4,
      "difficulty": "${skillLevel}",
      "mealType": "lunch",
      "dishes": [
        {
          "name": "主菜名称",
          "type": "main",
          "description": "主菜简介"
        },
        {
          "name": "配菜名称", 
          "type": "side",
          "description": "配菜简介"
        },
        {
          "name": "汤品名称",
          "type": "soup",
          "description": "汤品简介"
        }
      ],
      "ingredients": [
        {"item": "食材名称", "amount": "分量", "needed": false, "usedIn": "主菜"},
        {"item": "需购买的食材", "amount": "分量", "needed": true, "usedIn": "配菜"}
      ],
      "instructions": [
        "第1步: 详细制作步骤",
        "第2步: 详细制作步骤",
        "第3步: 所有菜品的协调制作顺序"
      ],
      "tips": [
        "搭配小贴士1: 如何协调制作时间",
        "搭配小贴士2: 营养搭配建议"
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

注意事项:
- 优先使用现有食材作为主要成分
- 每个搭配要考虑制作时间的协调性
- 提供实用的搭配技巧和营养建议
- 菜品名称要具体且诱人
- 适合中国家庭的口味偏好
- 考虑不同年龄段的营养需求
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
        title: '今日午餐搭配',
        description: '营养均衡的家常搭配，适合全家享用',
        prepTime: 20,
        cookTime: 35,
        servings: 4,
        difficulty: 'beginner',
        mealType: 'lunch',
        dishes: [
          {
            name: '家常炒' + (ingredients[0] || '时蔬'),
            type: 'main',
            description: '简单易做的家常主菜'
          },
          {
            name: '清爽小菜',
            type: 'side', 
            description: '解腻的配菜'
          },
          {
            name: '营养汤品',
            type: 'soup',
            description: '温暖的汤品'
          }
        ],
        ingredients: [
          { item: ingredients[0] || '蔬菜', amount: '300g', needed: false, usedIn: '主菜' },
          { item: ingredients[1] || '肉类', amount: '200g', needed: false, usedIn: '主菜' },
          { item: '生抽', amount: '2勺', needed: allowShopping, usedIn: '调料' },
          { item: '蒜', amount: '3瓣', needed: false, usedIn: '主菜' },
          { item: '油', amount: '适量', needed: false, usedIn: '烹饪' }
        ],
        instructions: [
          '准备所有食材，清洗切好',
          '先煮汤，小火慢炖',
          '热锅下油，爆香蒜蓉',
          '下主料炒制，调味',
          '准备配菜，简单调味',
          '所有菜品协调上桌'
        ],
        tips: [
          '可以先做汤，再做主菜和配菜',
          '注意营养搭配，荤素均衡',
          '根据家人喜好调整口味'
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
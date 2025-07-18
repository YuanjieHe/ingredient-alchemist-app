import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client for database operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      ingredients, 
      skillLevel, 
      mealDays, 
      allowShopping, 
      peopleCount, 
      mealType, 
      occasionType, 
      cuisineType 
    } = await req.json();

    // Query knowledge base for relevant dishes
    console.log('Querying knowledge base for relevant dishes...');
    const knowledgeBaseInfo = await queryKnowledgeBase(ingredients, cuisineType, skillLevel);
    
    // Create enhanced prompt with knowledge base information
    const prompt = createEnhancedPrompt({
      ingredients,
      skillLevel,
      mealDays,
      allowShopping,
      peopleCount,
      mealType,
      occasionType,
      cuisineType,
      knowledgeBaseInfo
    });

    console.log('Enhanced prompt created with knowledge base references');

    console.log('Generating recipes with OpenAI...');

    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a master Chinese chef (师傅) with expertise in regional Chinese cuisines. Create exciting, authentic recipes with detailed wok techniques and traditional cooking methods. Focus on creating dishes with exceptional flavors, proper wok hei, and perfect texture combinations. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('Raw OpenAI response:', generatedText);

    // Parse the JSON response
    let recipes;
    try {
      recipes = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', generatedText);
      
      // Fallback: create a simple recipe structure
      recipes = [{
        id: "fallback-recipe",
        title: `${cuisineType} ${mealType} with Available Ingredients`,
        description: `A delicious ${mealType} recipe using your available ingredients.`,
        prepTime: 15,
        cookTime: 30,
        servings: peopleCount,
        difficulty: skillLevel,
        ingredients: ingredients.map(ing => `1 portion ${ing}`),
        dishInstructions: [{
          dishName: "Main Dish",
          steps: [
            {
              stepNumber: 1,
              title: "Prepare Ingredients",
              description: `Clean and prepare all your ingredients: ${ingredients.join(', ')}.`,
              duration: "10 minutes",
              tips: "Having everything ready makes cooking much smoother.",
              imagePrompt: "Ingredients laid out and prepared on a cutting board"
            },
            {
              stepNumber: 2,
              title: "Cook the Dish",
              description: "Combine and cook the ingredients according to your preferred method.",
              duration: "20 minutes",
              tips: "Taste as you go and adjust seasoning.",
              imagePrompt: "Cooking the dish in a pan or pot"
            }
          ]
        }],
        coordinationTips: ["Prep all ingredients first", "Cook in order of cooking time needed"],
        tags: ["homemade", "simple"]
      }];
    }

    // Ensure recipes is an array
    if (!Array.isArray(recipes)) {
      recipes = [recipes];
    }

    console.log('Successfully generated recipes:', recipes.length);

    return new Response(JSON.stringify({ recipes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-recipes function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate recipes', 
      message: error.message,
      details: 'Please try again in a moment. If the problem persists, the AI service may be temporarily unavailable.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to query knowledge base for relevant dishes
async function queryKnowledgeBase(ingredients: string[], cuisineType: string, skillLevel: string) {
  try {
    // Search for dishes that match ingredients, cuisine type, and skill level
    const { data: dishes, error } = await supabase
      .from('dishes_knowledge_base')
      .select(`
        *,
        dish_ingredients (*),
        dish_techniques (
          *,
          cooking_techniques (*)
        )
      `)
      .eq('cuisine_type', cuisineType.toLowerCase())
      .eq('difficulty_level', skillLevel.toLowerCase())
      .limit(5);

    if (error) {
      console.error('Error querying knowledge base:', error);
      return { matchedDishes: [], relevantTechniques: [] };
    }

    // Filter dishes by ingredient availability
    const matchedDishes = dishes?.filter(dish => {
      const dishIngredients = dish.dish_ingredients?.map(di => di.ingredient_name.toLowerCase()) || [];
      const availableIngredients = ingredients.map(ing => ing.toLowerCase());
      
      // Check if at least 60% of dish ingredients are available
      const matchCount = dishIngredients.filter(ing => 
        availableIngredients.some(avail => avail.includes(ing) || ing.includes(avail))
      ).length;
      
      return dishIngredients.length > 0 && (matchCount / dishIngredients.length) >= 0.4;
    }) || [];

    // Extract relevant cooking techniques
    const relevantTechniques = dishes?.flatMap(dish => 
      dish.dish_techniques?.map(dt => dt.cooking_techniques).filter(Boolean) || []
    ) || [];

    console.log(`Found ${matchedDishes.length} matching dishes and ${relevantTechniques.length} techniques`);
    
    return {
      matchedDishes: matchedDishes.slice(0, 3), // Limit to top 3 matches
      relevantTechniques: [...new Map(relevantTechniques.map(t => [t.id, t])).values()].slice(0, 5)
    };
  } catch (error) {
    console.error('Knowledge base query failed:', error);
    return { matchedDishes: [], relevantTechniques: [] };
  }
}

// Helper function to create enhanced prompt with knowledge base information
function createEnhancedPrompt(params: any) {
  const {
    ingredients,
    skillLevel,
    mealDays,
    allowShopping,
    peopleCount,
    mealType,
    occasionType,
    cuisineType,
    knowledgeBaseInfo
  } = params;

  let knowledgeSection = '';
  
  if (knowledgeBaseInfo.matchedDishes.length > 0) {
    knowledgeSection += '\n\n🔥 KNOWLEDGE BASE REFERENCES (Use as inspiration but create new recipes):\n';
    
    knowledgeBaseInfo.matchedDishes.forEach((dish: any, index: number) => {
      knowledgeSection += `\n${index + 1}. "${dish.name}" (${dish.cuisine_type}):
- Cultural Background: ${dish.cultural_background || 'Traditional dish'}
- Cooking Time: ${dish.cooking_time} minutes
- Traditional Ingredients: ${dish.dish_ingredients?.map((di: any) => di.ingredient_name).join(', ') || 'Various'}
- Instructions Style: ${typeof dish.instructions === 'string' ? dish.instructions.substring(0, 200) + '...' : 'Traditional preparation method'}`;
    });
  }

  if (knowledgeBaseInfo.relevantTechniques.length > 0) {
    knowledgeSection += '\n\n🥢 TRADITIONAL TECHNIQUES TO INCORPORATE:\n';
    
    knowledgeBaseInfo.relevantTechniques.forEach((technique: any, index: number) => {
      knowledgeSection += `\n${index + 1}. ${technique.name} (${technique.difficulty_level}):
- Description: ${technique.description || 'Traditional cooking method'}
- Equipment: ${technique.equipment_needed?.join(', ') || 'Basic kitchen tools'}
- Tips: ${technique.tips?.join('; ') || 'Master the basics first'}`;
    });
  }

  return `As a master Chinese chef (师傅), create ${mealDays} exciting and authentic ${cuisineType} recipes for ${mealType}, expertly using these ingredients: ${ingredients.join(', ')}.
${knowledgeSection}

KEY REQUIREMENTS:
- Skill level: ${skillLevel} (provide detailed wok techniques and heat control instructions)
- Serves: ${peopleCount} people
- Focus: Authentic ${cuisineType} cooking methods and flavors
- Occasion: ${occasionType}
- ${allowShopping ? 'Can suggest essential Chinese ingredients to enhance the dish' : 'Must use only provided ingredients creatively'}
- USE knowledge base dishes as INSPIRATION but create NEW, innovative recipes
- INCORPORATE traditional techniques mentioned above when relevant

REQUIRED DETAILS:
1. Chinese name and English translation
2. Cultural significance and regional origin
3. Essential wok and knife techniques
4. Precise heat control instructions
5. Timing for wok hei and ingredient additions
6. Specific seasoning combinations
7. Traditional plating methods
8. Texture and aroma indicators

Format the response as a JSON array with this exact structure:
[
  {
    "id": "recipe1",
    "title": "精致中式菜肴名称 (Elegant Chinese Dish Name)",
    "description": "详细且吸引人的描述，包含菜肴起源和文化背景 (Detailed and engaging description with dish origin and cultural background)",
    "prepTime": 20,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "knowledgeBaseReferences": ${knowledgeBaseInfo.matchedDishes.length > 0 ? JSON.stringify(knowledgeBaseInfo.matchedDishes.map((d: any) => d.name)) : '[]'},
    "ingredients": [
      {"item": "鸡肉 (chicken)", "amount": "300g，切丝", "usedIn": "主菜"},
      {"item": "大蒜 (garlic)", "amount": "3瓣，切末", "usedIn": "调味"}
    ],
    "dishInstructions": [
      {
        "dishName": "红烧鸡 (Braised Chicken)",
        "steps": [
          {
            "stepNumber": 1,
            "title": "腌制鸡肉 (Marinate the Chicken)",
            "description": "将鸡肉切成均匀的条状，加入料酒、酱油、盐和淀粉，用手抓匀，静置15分钟入味。这一步骤让鸡肉更加鲜嫩多汁，并为下一步的炒制做好准备。腌制时间不宜过长，以免鸡肉失去原有的口感。",
            "duration": "15分钟",
            "tips": "腌制时加入少量淀粉可以锁住肉汁，使成菜更加嫩滑。手法要轻柔，避免挤压肉质。",
            "imagePrompt": "Chinese chef marinating chicken strips in a blue and white porcelain bowl with soy sauce and cooking wine, ingredients neatly arranged on bamboo cutting board"
          },
          {
            "stepNumber": 2,
            "title": "热锅控温 (Wok Heat Control)",
            "description": "将炒锅置于大火上预热至冒烟，加入花生油至五成热（约160°C）。油温达到后，火力调至中高火，这是炒制中式菜肴的理想温度。油温过低会使食材吸油过多，油温过高则容易煳锅。通过观察油面的细微波纹来判断温度是否适中。",
            "duration": "3分钟",
            "tips": "专业厨师通过油面的波纹和轻微的烟雾判断油温。油温适中时，将木筷放入油中会出现细小气泡环绕。",
            "imagePrompt": "Close-up of a traditional carbon steel wok being heated on high flame with slight smoke rising, Chinese kitchen setting, dramatic lighting"
          }
        ]
      }
    ],
    "coordinationTips": [
      "先准备所有配料并分类摆放，这是'mise en place'的中式应用，确保炒菜过程顺畅",
      "炒制过程中要掌握'翻炒'和'颠锅'技巧，这是获得正宗'锅气'的关键",
      "遵循'热锅冷油'原则，确保锅温足够高再加油，防止食材粘锅",
      "调味时遵循'鲜、香、辣、咸、甜'的平衡原则，体现中式烹饪的精髓"
    ],
    "tags": ["正宗中餐", "传统技法", "家常菜", "色香味俱全"]
  }
]

Important: Respond ONLY with valid JSON. No other text.`;
}
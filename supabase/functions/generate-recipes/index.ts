import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const geminiApiKey = 'AIzaSyC5SRTd-W6TGeiWnSEia1rrzoXRAZl9h2Q';
const api302Key = 'sk-482tbry6f6ZOssiuzD1kDyIqNczz231pyVoj2HS7AxgdzjL7';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { 
      ingredients, 
      skillLevel, 
      mealDays, 
      allowShopping, 
      peopleCount, 
      mealType, 
      occasionType, 
      cuisineType,
      language = 'zh',
      // New parameters for single dish mode
      singleDishMode = false,
      dishName,
      dishDescription
    } = await req.json();

    console.log('Received language parameter:', language);

    // Handle single dish detail generation
    if (singleDishMode) {
      console.log('Generating detailed recipe for single dish:', dishName);
      
      const detailedRecipe = await generateDetailedSingleRecipe({
        dishName,
        dishDescription,
        ingredients,
        skillLevel,
        peopleCount,
        language
      });

      return new Response(
        JSON.stringify({ detailedRecipe }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
      knowledgeBaseInfo,
      language
    });

    console.log('Enhanced prompt created with knowledge base references');

    let generatedText;
    let usingFallback = false;
    let geminiError = null;
    let api302Error = null;

    // For English, try GPT first; for Chinese, try Gemini first
    const useGPTFirst = language === 'en';

    if (useGPTFirst) {
      // English: Try GPT first
      try {
        console.log('Generating recipes with GPT (primary for English)...');
        generatedText = await generateWith302AI(getSystemPrompt(cuisineType, language), prompt);
        console.log('GPT primary response successful');
      } catch (error) {
        console.error('GPT failed, trying Gemini fallback:', error);
        api302Error = error;
        
        // Try Gemini as fallback
        try {
          console.log('Trying Gemini fallback...');
          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${getSystemPrompt(cuisineType, language)}\n\n${prompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 8000,
              }
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            geminiError = {
              status: response.status,
              statusText: response.statusText,
              message: errorText
            };
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          generatedText = data.candidates[0].content.parts[0].text;
          usingFallback = true;
          console.log('Gemini fallback successful');
        } catch (geminiErr) {
          console.error('Both APIs failed:', error.message, geminiErr.message);
          
          return new Response(JSON.stringify({ 
            error: 'Both APIs failed', 
            details: {
              gpt: { message: error.message, status: error.status || 'unknown' },
              gemini: geminiError || { message: geminiErr.message }
            },
            message: 'Recipe generation failed. Please check API status and try again.',
            debugInfo: `GPT: ${error.status || 'unknown error'}, Gemini: ${geminiError?.status || 'unknown error'}`
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      // Chinese: Try Gemini first (original logic)
      try {
        console.log('Generating recipes with Gemini (primary for Chinese)...');
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${getSystemPrompt(cuisineType, language)}\n\n${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 8000,
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          geminiError = {
            status: response.status,
            statusText: response.statusText,
            message: errorText
          };
          console.error('Gemini API error:', response.status, response.statusText, errorText);
          
          // If Gemini fails, try 302.ai
          if (api302Key) {
            console.log('Gemini failed, switching to 302.ai...');
            usingFallback = true;
            try {
              generatedText = await generateWith302AI(getSystemPrompt(cuisineType, language), prompt);
            } catch (api302Err) {
              api302Error = api302Err;
              throw new Error(`Both APIs failed - Gemini: ${response.status} ${response.statusText}, 302.ai: ${api302Err.message}`);
            }
          } else {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
        } else {
          const data = await response.json();
          generatedText = data.candidates[0].content.parts[0].text;
          console.log('Gemini primary response successful');
        }
      } catch (error) {
        // If Gemini fails completely and we have 302.ai API key, try 302.ai as fallback
        if (api302Key && !usingFallback) {
          console.log('Gemini failed completely, trying 302.ai as fallback...');
          try {
            generatedText = await generateWith302AI(getSystemPrompt(cuisineType, language), prompt);
            usingFallback = true;
          } catch (api302Err) {
            api302Error = api302Err;
            console.error('Both APIs failed:', error.message, api302Err.message);
            
            // Return detailed error information for debugging
            return new Response(JSON.stringify({ 
              error: 'Both APIs failed', 
              details: {
                gemini: geminiError || { message: error.message },
                api302: { message: api302Err.message, status: api302Err.status || 'unknown' }
              },
              message: 'Recipe generation failed. Please check API status and try again.',
              debugInfo: `Gemini: ${geminiError?.status || 'unknown error'}, 302.ai: ${api302Err.status || 'unknown error'}`
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          throw error;
        }
      }
    }

    if (usingFallback) {
      console.log('Successfully generated recipes using 302.ai fallback');
    }

    // Clean and parse the JSON response
    let recipes;
    try {
      // Remove markdown code block markers if present
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      recipes = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', generatedText);
      
      // Fallback: create a simple recipe structure
      const isEnglish = language === 'en';
      recipes = [{
        id: "fallback-recipe",
        title: isEnglish ? `${cuisineType} ${mealType} with Available Ingredients` : `${cuisineType}风味${mealType}配现有食材`,
        description: isEnglish ? `A delicious ${mealType} recipe using your available ingredients in authentic ${cuisineType} style.` : `使用您现有食材制作的美味${mealType}，采用正宗${cuisineType}风味。`,
        prepTime: 15,
        cookTime: 30,
        servings: peopleCount,
        difficulty: skillLevel,
        ingredients: ingredients.map(ing => ({item: ing, amount: "1 portion", usedIn: "main dish"})),
        dishInstructions: [{
          dishName: isEnglish ? "Main Dish" : "主菜",
          steps: [
            {
              stepNumber: 1,
              title: isEnglish ? "Prepare Ingredients" : "食材准备",
              description: isEnglish ? `Clean and prepare all your ingredients: ${ingredients.join(', ')}. Cut ingredients according to traditional ${cuisineType} techniques for optimal cooking and presentation.` : `清洗并准备所有食材：${ingredients.join('、')}。根据传统${cuisineType}技法切配食材，以获得最佳的烹饪效果和摆盘效果。`,
              duration: isEnglish ? "10 minutes" : "10分钟",
              tips: isEnglish ? "Proper ingredient preparation is crucial for authentic results. Take time to cut ingredients uniformly." : "正确的食材准备是获得正宗口味的关键。花时间将食材切得均匀。",
              imagePrompt: `${cuisineType} ingredients prepared and arranged on cutting board with traditional tools`
            },
            {
              stepNumber: 2,
              title: isEnglish ? "Cook the Dish" : "烹饪菜品",
              description: isEnglish ? `Heat your cooking vessel and combine ingredients using traditional ${cuisineType} cooking methods. Pay attention to timing and temperature for authentic flavors.` : `加热烹饪器具，使用传统${cuisineType}烹饪方法组合食材。注意时间和温度控制，以获得正宗风味。`,
              duration: isEnglish ? "20 minutes" : "20分钟",
              tips: isEnglish ? "Taste as you go and adjust seasoning according to traditional flavor profiles." : "边做边尝味，根据传统风味特点调整调料。",
              imagePrompt: `Traditional ${cuisineType} cooking technique being demonstrated`
            }
          ]
        }],
        coordinationTips: [
          isEnglish ? "Prep all ingredients first using proper techniques" : "首先使用正确技法准备所有食材",
          isEnglish ? "Follow traditional cooking order for best results" : "遵循传统烹饪顺序以获得最佳效果"
        ],
        tags: ["homemade", "simple", cuisineType.toLowerCase()]
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

// Helper function to get cuisine-specific system prompt
function getSystemPrompt(cuisineType: string, language: string = 'zh') {
  const isEnglish = language === 'en';
  
  const chefProfiles = {
    chinese: isEnglish 
      ? 'You are a master Chinese chef with expertise in regional Chinese cuisines including Sichuan, Cantonese, Hunan, and Beijing styles. Focus on wok techniques, proper heat control, and achieving authentic wok hei. Emphasize traditional cooking methods, knife skills, and the balance of flavors.'
      : '您是一位精通川菜、粤菜、湘菜、京菜等中华料理的大师级厨师。专注于炒锅技巧、正确的火候控制以及正宗的锅气。强调传统烹饪方法、刀工技巧和口味平衡。',
    japanese: isEnglish
      ? 'You are a master Japanese chef (Itamae) with deep knowledge of traditional Japanese cooking techniques including knife skills, dashi preparation, and seasonal cooking (kaiseki). Focus on precision, umami development, and the aesthetic presentation that defines Japanese cuisine.'
      : '您是一位日式料理大师（板前），深谙传统日式烹饪技法，包括刀工、高汤制作和季节料理（怀石）。专注于精确性、鲜味开发和日式料理特有的美学呈现。',
    korean: isEnglish
      ? 'You are a master Korean chef specializing in traditional Korean cooking techniques including fermentation, grilling (gui), and banchan preparation. Focus on the proper use of gochujang, kimchi techniques, and the balance of spicy, savory, and fermented flavors.'
      : '您是一位韩式料理大师，专精传统韩式烹饪技法，包括发酵、烧烤和小菜制作。专注于韩式辣椒酱的正确使用、泡菜技法以及辛辣、咸鲜和发酵风味的平衡。',
    thai: isEnglish
      ? 'You are a master Thai chef with expertise in balancing the fundamental flavors of sweet, sour, salty, and spicy. Focus on proper use of fresh herbs, curry paste preparation, and traditional techniques like pounding in a mortar and pestle.'
      : '您是一位泰式料理大师，精通甜、酸、咸、辣基本口味的平衡。专注于新鲜香草的正确使用、咖喱酱的制作和石臼研磨等传统技法。',
    italian: isEnglish
      ? 'You are a master Italian chef specializing in regional Italian cooking from North to South. Focus on pasta-making techniques, proper sauce preparation, and the use of high-quality, simple ingredients that define authentic Italian cuisine.'
      : '您是一位意大利料理大师，专精从北到南的意大利地方菜。专注于面条制作技法、正宗酱汁制作以及使用高品质简单食材来定义正宗意式料理。',
    french: isEnglish
      ? 'You are a master French chef trained in classical French cooking techniques including mother sauces, proper knife skills, and refined cooking methods. Focus on technique precision, flavor development, and elegant presentation.'
      : '您是一位法式料理大师，受过古典法式烹饪技法训练，包括母酱、正确刀工和精致烹饪方法。专注于技法精确性、风味开发和优雅呈现。',
    american: isEnglish
      ? 'You are a master American chef with expertise in regional American cuisines from BBQ to farm-to-table cooking. Focus on grilling techniques, comfort food preparation, and the fusion of various cultural influences in American cooking.'
      : '您是一位美式料理大师，精通从烧烤到农场到餐桌的各种美式地方菜。专注于烧烤技法、舒适食品制作以及美式料理中各种文化影响的融合。',
    indian: isEnglish
      ? 'You are a master Indian chef with deep knowledge of spice blending, regional cooking styles, and traditional techniques like tandoor cooking and tempering (tadka). Focus on complex spice combinations and authentic preparation methods.'
      : '您是一位印度料理大师，深谙香料调配、地方烹饪风格和坦都烧烤、调味（tadka）等传统技法。专注于复杂的香料组合和正宗的制作方法。',
    mexican: isEnglish
      ? 'You are a master Mexican chef specializing in traditional Mexican cooking techniques including masa preparation, proper salsa making, and regional Mexican cuisine. Focus on authentic ingredients, traditional cooking methods, and complex flavor profiles.'
      : '您是一位墨西哥料理大师，专精传统墨西哥烹饪技法，包括玉米面团制作、正宗萨尔萨制作和墨西哥地方菜。专注于正宗食材、传统烹饪方法和复杂风味层次。',
    mediterranean: isEnglish
      ? 'You are a master Mediterranean chef with expertise in the healthy, flavorful cooking of the Mediterranean region. Focus on olive oil usage, fresh herb combinations, and simple yet elegant preparation methods.'
      : '您是一位地中海料理大师，精通地中海地区健康美味的烹饪。专注于橄榄油的使用、新鲜香草搭配以及简单而优雅的制作方法。',
    other: isEnglish
      ? 'You are a master chef with expertise in international cuisines and fusion cooking. Focus on authentic techniques from various culinary traditions and creative flavor combinations.'
      : '您是一位国际料理大师，精通各国菜系和融合烹饪。专注于各种烹饪传统的正宗技法和创意风味组合。'
  };

  const profile = chefProfiles[cuisineType.toLowerCase()] || chefProfiles.other;
  const instruction = isEnglish 
    ? 'IMPORTANT: You must respond ONLY in English. All recipe names, ingredients, instructions, descriptions must be in English language. Create exciting, authentic recipes with extremely detailed step-by-step instructions. Every step should be thoroughly explained with precise timing, temperature, and technique details. Always respond with valid JSON only.'
    : '重要：你必须只用中文回复。所有食谱名称、食材、制作步骤、描述都必须是中文。创造令人兴奋的正宗食谱，提供极其详细的步骤说明。每个步骤都应该详细解释，包含精确的时间、温度和技法细节。始终只用有效的JSON格式回复。';
  
  return `${profile} ${instruction}`;
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
    knowledgeBaseInfo,
    language = 'zh'
  } = params;

  console.log('Current language in prompt creation:', language);

  const isEnglish = language === 'en';
  const dishCount = Math.max(4, Math.ceil(peopleCount / 2));

  // Create completely separate prompts for different languages
  if (isEnglish) {
    return createEnglishPrompt(ingredients, skillLevel, allowShopping, peopleCount, mealType, occasionType, cuisineType, dishCount, knowledgeBaseInfo);
  } else {
    return createChinesePrompt(ingredients, skillLevel, allowShopping, peopleCount, mealType, occasionType, cuisineType, dishCount, knowledgeBaseInfo);
  }
}

// Completely separate English prompt generator
function createEnglishPrompt(ingredients: string[], skillLevel: string, allowShopping: boolean, peopleCount: number, mealType: string, occasionType: string, cuisineType: string, dishCount: number, knowledgeBaseInfo: any) {
  let knowledgeSection = '';
  
  if (knowledgeBaseInfo.matchedDishes.length > 0) {
    knowledgeSection += `\n\nKNOWLEDGE BASE REFERENCE DISHES (for inspiration):\n`;
    knowledgeBaseInfo.matchedDishes.forEach((dish: any, index: number) => {
      knowledgeSection += `${index + 1}. "${dish.name}" - Traditional ${dish.cuisine_type} dish\n`;
    });
  }

  if (knowledgeBaseInfo.relevantTechniques.length > 0) {
    knowledgeSection += `\nTRADITIONAL COOKING TECHNIQUES:\n`;
    knowledgeBaseInfo.relevantTechniques.forEach((technique: any, index: number) => {
      knowledgeSection += `${index + 1}. ${technique.name} - ${technique.description || 'Traditional technique'}\n`;
    });
  }

  return `You are a professional ${cuisineType} chef. Create ${dishCount} complementary recipes for a complete ${mealType} meal serving ${peopleCount} people.

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

MEAL REQUIREMENTS:
- Skill Level: ${skillLevel}
- Occasion: ${occasionType}
- Shopping: ${allowShopping ? 'Additional ingredients allowed' : 'Use only available ingredients'}
- LANGUAGE: ALL content must be in ENGLISH ONLY

${knowledgeSection}

Create ${dishCount} dishes that work together as a complete meal. Include main dishes, sides, and soup if appropriate.

RESPONSE FORMAT (JSON only):
[
  {
    "id": "recipe1",
    "title": "Authentic English Dish Name",
    "description": "Detailed English description with cultural background",
    "prepTime": 20,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "ingredients": [
      {"item": "ingredient name", "amount": "specific quantity", "usedIn": "dish purpose"}
    ],
    "dishInstructions": [
      {
        "dishName": "Main Dish Name",
        "type": "main",
        "steps": [
          {
            "stepNumber": 1,
            "title": "Preparation Phase",
            "description": "Extremely detailed English instructions with temperatures, timing, and techniques",
            "duration": "10 minutes",
            "tips": "Professional cooking tips in English"
          }
        ]
      }
    ],
    "coordinationTips": ["English cooking coordination tips"],
    "tags": ["authentic", "${cuisineType.toLowerCase()}"]
  }
]

CRITICAL REQUIREMENTS:
- ALL text must be in English
- Provide authentic ${cuisineType} flavors
- Include extremely detailed cooking steps
- Coordinate timing between all dishes
- Use traditional ${cuisineType} techniques`;
}

// Completely separate Chinese prompt generator  
function createChinesePrompt(ingredients: string[], skillLevel: string, allowShopping: boolean, peopleCount: number, mealType: string, occasionType: string, cuisineType: string, dishCount: number, knowledgeBaseInfo: any) {
  let knowledgeSection = '';
  
  if (knowledgeBaseInfo.matchedDishes.length > 0) {
    knowledgeSection += `\n\n知识库参考菜品（作为灵感）:\n`;
    knowledgeBaseInfo.matchedDishes.forEach((dish: any, index: number) => {
      knowledgeSection += `${index + 1}. "${dish.name}" - 传统${dish.cuisine_type}菜品\n`;
    });
  }

  if (knowledgeBaseInfo.relevantTechniques.length > 0) {
    knowledgeSection += `\n传统烹饪技法:\n`;
    knowledgeBaseInfo.relevantTechniques.forEach((technique: any, index: number) => {
      knowledgeSection += `${index + 1}. ${technique.name} - ${technique.description || '传统技法'}\n`;
    });
  }

  return `您是专业的${cuisineType}料理大师。为${peopleCount}人的${mealType}创建${dishCount}道相互搭配的完整菜谱。

现有食材：${ingredients.join('、')}

餐食要求：
- 技能水平：${skillLevel}
- 场合：${occasionType}
- 购买食材：${allowShopping ? '允许添加必要食材' : '仅使用现有食材'}
- 语言：所有内容必须用中文

${knowledgeSection}

创建${dishCount}道菜品组合成完整餐食。包含主菜、配菜，如合适可加汤品。

回复格式（仅JSON）：
[
  {
    "id": "recipe1",
    "title": "正宗中文菜名",
    "description": "详细的中文描述，包含文化背景",
    "prepTime": 20,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "ingredients": [
      {"item": "食材名称", "amount": "具体用量", "usedIn": "菜品用途"}
    ],
    "dishInstructions": [
      {
        "dishName": "主菜名称",
        "type": "main",
        "steps": [
          {
            "stepNumber": 1,
            "title": "准备阶段",
            "description": "极其详细的中文制作说明，包含温度、时间和技法",
            "duration": "10分钟",
            "tips": "专业烹饪提示（中文）"
          }
        ]
      }
    ],
    "coordinationTips": ["中文烹饪协调提示"],
    "tags": ["正宗", "${cuisineType.toLowerCase()}"]
  }
]

关键要求：
- 所有文字必须是中文
- 提供正宗${cuisineType}风味
- 包含极其详细的烹饪步骤
- 协调各菜品制作时间
- 使用传统${cuisineType}技法`;
}

// 302.ai API helper function
async function generateWith302AI(systemPrompt: string, userPrompt: string) {
  console.log('Calling 302.ai API...');
  const response = await fetch('https://api.302.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api302Key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 8000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('302.ai API error:', response.status, response.statusText, errorText);
    throw new Error(`302.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('302.ai API response received successfully');
  return data.choices[0].message.content;
}

// Helper function for single dish detail generation
async function generateDetailedSingleRecipe(params: any) {
  const { dishName, dishDescription, ingredients, skillLevel, peopleCount, language } = params;
  const isEnglish = language === 'en';
  
  const systemPrompt = isEnglish 
    ? 'You are a professional chef. Generate an extremely detailed recipe with step-by-step instructions. All content must be in English.'
    : '您是专业厨师。生成极其详细的食谱和逐步说明。所有内容必须用中文。';
    
  const userPrompt = isEnglish
    ? `Create a detailed recipe for "${dishName}". Description: ${dishDescription}. Use ingredients: ${ingredients.join(', ')}. Skill level: ${skillLevel}. Serves: ${peopleCount}. Provide extremely detailed cooking steps with precise timing and techniques.`
    : `为"${dishName}"创建详细食谱。描述：${dishDescription}。使用食材：${ingredients.join('、')}。技能水平：${skillLevel}。服务人数：${peopleCount}。提供极其详细的烹饪步骤，包含精确时间和技法。`;
    
  try {
    const generatedText = await generateWith302AI(systemPrompt, userPrompt);
    return JSON.parse(generatedText);
  } catch (error) {
    console.error('Single recipe generation failed:', error);
    throw error;
  }
}
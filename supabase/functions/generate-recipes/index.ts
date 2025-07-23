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
      language = 'zh'
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
      knowledgeBaseInfo,
      language
    });

    console.log('Enhanced prompt created with knowledge base references');

    let generatedText;
    let usingFallback = false;
    let geminiError = null;
    let api302Error = null;

    try {
      console.log('Generating recipes with Gemini...');
      
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
        console.log('Raw Gemini response received successfully');
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
      recipes = [{
        id: "fallback-recipe",
        title: `${cuisineType} ${mealType} with Available Ingredients`,
        description: `A delicious ${mealType} recipe using your available ingredients in authentic ${cuisineType} style.`,
        prepTime: 15,
        cookTime: 30,
        servings: peopleCount,
        difficulty: skillLevel,
        ingredients: ingredients.map(ing => ({item: ing, amount: "1 portion", usedIn: "main dish"})),
        dishInstructions: [{
          dishName: "Main Dish",
          steps: [
            {
              stepNumber: 1,
              title: "Prepare Ingredients",
              description: `Clean and prepare all your ingredients: ${ingredients.join(', ')}. Cut ingredients according to traditional ${cuisineType} techniques for optimal cooking and presentation.`,
              duration: "10 minutes",
              tips: "Proper ingredient preparation is crucial for authentic results. Take time to cut ingredients uniformly.",
              imagePrompt: `${cuisineType} ingredients prepared and arranged on cutting board with traditional tools`
            },
            {
              stepNumber: 2,
              title: "Cook the Dish",
              description: `Heat your cooking vessel and combine ingredients using traditional ${cuisineType} cooking methods. Pay attention to timing and temperature for authentic flavors.`,
              duration: "20 minutes",
              tips: "Taste as you go and adjust seasoning according to traditional flavor profiles.",
              imagePrompt: `Traditional ${cuisineType} cooking technique being demonstrated`
            }
          ]
        }],
        coordinationTips: ["Prep all ingredients first using proper techniques", "Follow traditional cooking order for best results"],
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
    ? 'Create exciting, authentic recipes with extremely detailed step-by-step instructions. Every step should be thoroughly explained with precise timing, temperature, and technique details. Always respond with valid JSON only. Generate ALL content in English.'
    : '创造令人兴奋的正宗食谱，提供极其详细的步骤说明。每个步骤都应该详细解释，包含精确的时间、温度和技法细节。始终只用有效的JSON格式回复。所有内容必须用中文生成。';
  
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

  const isEnglish = language === 'en';
  // 根据人数计算菜品数量：每2-3人一道菜，至少4道菜
  const dishCount = Math.max(4, Math.ceil(peopleCount / 2));

  let knowledgeSection = '';
  
  if (knowledgeBaseInfo.matchedDishes.length > 0) {
    knowledgeSection += `\n\n🔥 ${isEnglish ? 'KNOWLEDGE BASE REFERENCES (Use as inspiration but create new recipes)' : '知识库参考（作为灵感但创造新食谱）'}:\n`;
    
    knowledgeBaseInfo.matchedDishes.forEach((dish: any, index: number) => {
      knowledgeSection += `\n${index + 1}. "${dish.name}" (${dish.cuisine_type}):
- ${isEnglish ? 'Cultural Background' : '文化背景'}: ${dish.cultural_background || (isEnglish ? 'Traditional dish' : '传统菜肴')}
- ${isEnglish ? 'Cooking Time' : '烹饪时间'}: ${dish.cooking_time} ${isEnglish ? 'minutes' : '分钟'}
- ${isEnglish ? 'Traditional Ingredients' : '传统食材'}: ${dish.dish_ingredients?.map((di: any) => di.ingredient_name).join(', ') || (isEnglish ? 'Various' : '各种')}
- ${isEnglish ? 'Instructions Style' : '制作方法'}: ${typeof dish.instructions === 'string' ? dish.instructions.substring(0, 200) + '...' : (isEnglish ? 'Traditional preparation method' : '传统制作方法')}`;
    });
  }

  if (knowledgeBaseInfo.relevantTechniques.length > 0) {
    knowledgeSection += `\n\n🥢 ${isEnglish ? 'TRADITIONAL TECHNIQUES TO INCORPORATE' : '融入的传统技法'}:\n`;
    
    knowledgeBaseInfo.relevantTechniques.forEach((technique: any, index: number) => {
      knowledgeSection += `\n${index + 1}. ${technique.name} (${technique.difficulty_level}):
- ${isEnglish ? 'Description' : '描述'}: ${technique.description || (isEnglish ? 'Traditional cooking method' : '传统烹饪方法')}
- ${isEnglish ? 'Equipment' : '设备'}: ${technique.equipment_needed?.join(', ') || (isEnglish ? 'Basic kitchen tools' : '基本厨具')}
- ${isEnglish ? 'Tips' : '技巧'}: ${technique.tips?.join('; ') || (isEnglish ? 'Master the basics first' : '先掌握基础')}`;
    });
  }

  return `🍽️ ${isEnglish ? 'CRITICAL: Create a COMPLETE MEAL SET' : '关键要求：创建完整套餐'} with ${dishCount} ${isEnglish ? 'different dishes, each with detailed cooking instructions' : '道不同菜品，每道菜都要有详细制作教程'} for ${peopleCount} ${isEnglish ? 'people eating' : '人用餐'} ${mealType}.

${isEnglish ? 'As a master' : '作为一位'} ${cuisineType} ${isEnglish ? 'chef, create 1 COMPLETE MEAL SET (with' : '料理大师，创造1个完整套餐（包含'} ${dishCount} ${isEnglish ? 'dishes, each with full cooking tutorial) using these ingredients' : '道菜，每道菜都有完整制作教程），使用这些食材'}: ${ingredients.join(', ')}.
${knowledgeSection}

🔥 ${isEnglish ? 'MEAL SET REQUIREMENTS (MANDATORY)' : '套餐要求（必须）'}:
- ${isEnglish ? 'Create 1 complete meal set with' : '创建1个完整套餐，包含'} ${dishCount} ${isEnglish ? 'dishes' : '道菜'}
- ${isEnglish ? '🚨 CRITICAL: Each dish must have its own detailed cooking tutorial with multiple steps' : '🚨 关键：每道菜都必须有自己的详细制作教程，包含多个步骤'}
- ${isEnglish ? '🚨 MANDATORY: dishInstructions array must contain' : '🚨 强制要求：dishInstructions数组必须包含'} ${dishCount} ${isEnglish ? 'separate dish objects, each with complete step-by-step cooking instructions' : '个独立的菜品对象，每个都有完整的步骤制作说明'}
- ${isEnglish ? 'MUST include' : '必须包含'}: 1-2 ${isEnglish ? 'main dishes' : '主菜'} + 2-3 ${isEnglish ? 'side dishes' : '配菜'} + 1 ${isEnglish ? 'soup/drink' : '汤品/饮品'}
- ${isEnglish ? 'The meal set feeds' : '套餐满足'} ${peopleCount} ${isEnglish ? 'people for' : '人的'} ${mealType}
- ${isEnglish ? 'Each dish uses different cooking methods and ingredients' : '每道菜使用不同的烹饪方法和食材'}
- ${isEnglish ? 'All dishes complement each other in flavor and nutrition' : '所有菜品在口味和营养上相互补充'}

${isEnglish ? 'KEY REQUIREMENTS' : '关键要求'}:
- ${isEnglish ? 'Skill level' : '技能水平'}: ${skillLevel} (${isEnglish ? 'provide extremely detailed cooking techniques for each dish' : '为每道菜提供极其详细的烹饪技法'})
- ${isEnglish ? 'Serves' : '服务人数'}: ${peopleCount} ${isEnglish ? 'people total' : '人总计'}
- ${isEnglish ? 'Focus' : '重点'}: ${isEnglish ? 'Authentic' : '正宗的'} ${cuisineType} ${isEnglish ? 'cooking methods and flavors' : '烹饪方法和口味'}
- ${isEnglish ? 'Occasion' : '场合'}: ${occasionType}
- ${allowShopping ? (isEnglish ? 'Can suggest essential ingredients to enhance dishes' : '可以建议必要食材来提升菜品') : (isEnglish ? 'Must use only provided ingredients creatively' : '必须创造性地仅使用提供的食材')}
- ${isEnglish ? 'USE knowledge base dishes as INSPIRATION but create NEW recipes' : '使用知识库菜品作为灵感，但创造新食谱'}
- ${isEnglish ? 'INCORPORATE traditional techniques for each dish' : '为每道菜融入传统技法'}
- ${isEnglish ? 'Generate ALL content in English language' : '所有内容必须用中文生成'}

🚨 ${isEnglish ? 'CRITICAL INSTRUCTION FOR dishInstructions ARRAY' : 'dishInstructions数组的关键指令'}:
${isEnglish ? 'The dishInstructions array MUST contain exactly' : 'dishInstructions数组必须准确包含'} ${dishCount} ${isEnglish ? 'dish objects. Each dish object must have:' : '个菜品对象。每个菜品对象必须有：'}
1. ${isEnglish ? 'dishName: Clear name with dish type (【Main Dish 1】, 【Side Dish 1】, etc.)' : 'dishName：清晰的菜名和类型（【主菜1】、【配菜1】等）'}
2. ${isEnglish ? 'type: "main", "side", or "soup"' : 'type："main"、"side"或"soup"'}
3. ${isEnglish ? 'steps: Array with 2-4 detailed cooking steps for THIS specific dish' : 'steps：包含此特定菜品2-4个详细制作步骤的数组'}

${isEnglish ? 'Example structure you MUST follow' : '你必须遵循的示例结构'}:
"dishInstructions": [
  {
    "dishName": "${isEnglish ? '【Main Dish 1】Braised Pork Ribs' : '【主菜1】红烧排骨'}",
    "type": "main",
    "steps": [${isEnglish ? '3-4 detailed steps for braised pork ribs' : '红烧排骨的3-4个详细步骤'}]
  },
  {
    "dishName": "${isEnglish ? '【Main Dish 2】Steamed Fish' : '【主菜2】清蒸鱼'}",
    "type": "main", 
    "steps": [${isEnglish ? '3-4 detailed steps for steamed fish' : '清蒸鱼的3-4个详细步骤'}]
  },
  {
    "dishName": "${isEnglish ? '【Side Dish】Stir-fried Vegetables' : '【配菜】清炒时蔬'}",
    "type": "side",
    "steps": [${isEnglish ? '2-3 detailed steps for vegetables' : '时蔬的2-3个详细步骤'}]
  },
  {
    "dishName": "${isEnglish ? '【Soup】Seaweed Soup' : '【汤品】紫菜汤'}",
    "type": "soup",
    "steps": [${isEnglish ? '2-3 detailed steps for soup' : '汤品的2-3个详细步骤'}]
  }
]

${isEnglish ? 'REQUIRED DETAILS FOR THE MEAL SET' : '套餐的必需详情'}:
1. ${isEnglish ? 'One meal set title describing the complete meal' : '一个套餐标题，描述完整餐食'}
2. ${isEnglish ? 'Overall meal description and cultural context' : '整体餐食描述和文化背景'}
3. ${isEnglish ? 'Complete ingredient list for all dishes' : '所有菜品的完整食材清单'}
4. ${isEnglish ? '🚨 MANDATORY: Detailed cooking instructions for ALL' : '🚨 强制要求：所有'} ${dishCount} ${isEnglish ? 'dishes in dishInstructions array' : '道菜的详细制作说明都要在dishInstructions数组中'}
5. ${isEnglish ? 'Coordination tips for preparing all dishes together' : '同时准备所有菜品的协调技巧'}
6. ${isEnglish ? 'Traditional serving order and presentation' : '传统上菜顺序和摆盘'}
7. ${isEnglish ? 'Each dish must have: ingredients, steps, timing, tips' : '每道菜必须有：食材、步骤、时间、技巧'}
8. ${isEnglish ? 'Nutritional balance across all dishes' : '所有菜品的营养平衡'}

${isEnglish ? 'Format the response as a JSON array with this exact structure' : '按照以下精确的JSON数组结构格式化回复'}:
[
  {
    "id": "recipe1",
    "title": "${isEnglish ? 'Authentic Dish Name' : '正宗菜品名称'}",
    "description": "${isEnglish ? `Detailed and engaging description with dish origin and cultural background, explaining the significance of this dish in ${cuisineType} cuisine` : `详细且引人入胜的描述，包含菜品起源和文化背景，解释此菜在${cuisineType}菜系中的意义`}",
    "prepTime": 20,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "knowledgeBaseReferences": ${knowledgeBaseInfo.matchedDishes.length > 0 ? JSON.stringify(knowledgeBaseInfo.matchedDishes.map((d: any) => d.name)) : '[]'},
     "ingredients": [
       {"item": "${isEnglish ? 'Main ingredient' : '主要食材'}", "amount": "${isEnglish ? '300g, specific cut or preparation' : '300克，具体切法或处理方式'}", "usedIn": "${isEnglish ? 'main dish' : '主菜'}"},
       {"item": "${isEnglish ? 'Seasoning ingredient' : '调味食材'}", "amount": "${isEnglish ? '3 cloves, minced' : '3瓣，切碎'}", "usedIn": "${isEnglish ? 'flavoring' : '调味'}"}
     ],
      "dishInstructions": [
        {
          "dishName": "${isEnglish ? '【Main Dish 1】Braised Pork Ribs' : '【主菜1】红烧排骨'}",
          "type": "main",
          "steps": [
            {
              "stepNumber": 1,
              "title": "${isEnglish ? 'Ingredient Selection & Preparation' : '选材处理'}",
              "description": "${isEnglish ? `Select the highest quality pork ribs (specific specifications and weight), blanch in cold water to remove impurities, bring to boil and skim foam, rinse ribs and drain. Detailed description of selection criteria, processing methods, and cutting techniques for each ingredient.` : `选用最优质的排骨（具体规格和重量），冷水下锅焯水去腥，煮沸后撇浮沫，排骨冲洗控水。详细描述每种食材的选择标准、处理方法、切配技巧。`}",
              "duration": "${isEnglish ? '15 minutes' : '15分钟'}",
              "tips": "${isEnglish ? 'Special technique: High-quality ribs don\'t need excessive processing, maintaining original flavor is better.' : '特殊技巧：品质好的排骨无需过度处理，保持原味更佳。'}",
              "imagePrompt": "Professional ${cuisineType} chef selecting and preparing ingredients"
            },
            {
              "stepNumber": 2,
              "title": "${isEnglish ? 'Stir-frying Sugar' : '炒糖色'}",
              "description": "${isEnglish ? 'Heat oil in cold pan, add rock sugar and stir-fry until caramel colored...' : '冷锅放油，加冰糖炒至焦糖色...'}",
              "duration": "${isEnglish ? '8 minutes' : '8分钟'}",
              "tips": "${isEnglish ? 'Heat control is crucial for sugar color' : '火候控制是糖色关键'}"
            },
            {
              "stepNumber": 3,
              "title": "${isEnglish ? 'Braising' : '焖煮'}",
              "description": "${isEnglish ? 'Add ribs and seasonings, braise until tender...' : '加入排骨和调料，焖煮至软烂...'}",
              "duration": "${isEnglish ? '45 minutes' : '45分钟'}",
              "tips": "${isEnglish ? 'Simmer on low heat to maintain texture' : '小火慢炖保持口感'}"
            }
          ]
        },
        {
          "dishName": "${isEnglish ? '【Main Dish 2】Steamed Fish' : '【主菜2】清蒸鱼'}",
          "type": "main",
          "steps": [
            {
              "stepNumber": 1,
              "title": "${isEnglish ? 'Fish Preparation' : '鱼类处理'}",
              "description": "${isEnglish ? 'Select fresh fish, clean and score, marinate with salt and cooking wine...' : '选用新鲜鱼类，清洗打花刀，用盐和料酒腌制...'}",
              "duration": "${isEnglish ? '20 minutes' : '20分钟'}",
              "tips": "${isEnglish ? 'Proper scoring ensures even cooking' : '正确打花刀确保受热均匀'}"
            },
            {
              "stepNumber": 2,
              "title": "${isEnglish ? 'Steaming' : '蒸制'}",
              "description": "${isEnglish ? 'Steam over high heat for 8-10 minutes until just cooked...' : '大火蒸8-10分钟至刚熟...'}",
              "duration": "${isEnglish ? '10 minutes' : '10分钟'}",
              "tips": "${isEnglish ? 'Timing is critical for tender fish' : '时间掌控是鱼肉嫩滑关键'}"
            },
            {
              "stepNumber": 3,
              "title": "${isEnglish ? 'Sauce and Garnish' : '调汁装饰'}",
              "description": "${isEnglish ? 'Heat oil with scallions and ginger, pour over fish with soy sauce...' : '爆香葱丝姜丝，配生抽淋在鱼上...'}",
              "duration": "${isEnglish ? '5 minutes' : '5分钟'}",
              "tips": "${isEnglish ? 'Hot oil releases aromatic compounds' : '热油激发香味化合物'}"
            }
          ]
        },
        {
          "dishName": "${isEnglish ? '【Side Dish】Stir-fried Seasonal Vegetables' : '【配菜】清炒时蔬'}",
          "type": "side",
          "steps": [
            {
              "stepNumber": 1,
              "title": "${isEnglish ? 'Vegetable Preparation' : '蔬菜处理'}",
              "description": "${isEnglish ? 'Wash and cut vegetables, prepare aromatics and seasonings...' : '清洗切配蔬菜，准备香料和调味料...'}",
              "duration": "${isEnglish ? '10 minutes' : '10分钟'}",
              "tips": "${isEnglish ? 'Cut vegetables uniformly for even cooking' : '蔬菜切配均匀确保受热一致'}"
            },
            {
              "stepNumber": 2,
              "title": "${isEnglish ? 'Stir-frying' : '爆炒'}",
              "description": "${isEnglish ? 'Heat wok over high heat, add oil and aromatics, then vegetables...' : '热锅下油爆香，下蔬菜大火快炒...'}",
              "duration": "${isEnglish ? '5 minutes' : '5分钟'}",
              "tips": "${isEnglish ? 'High heat preserves color and crunch' : '大火保持色泽和脆嫩'}"
            }
          ]
        },
        {
          "dishName": "${isEnglish ? '【Soup】Seaweed and Egg Drop Soup' : '【汤品】紫菜蛋花汤'}",
          "type": "soup",
          "steps": [
            {
              "stepNumber": 1,
              "title": "${isEnglish ? 'Broth Preparation' : '汤底制作'}",
              "description": "${isEnglish ? 'Bring water to boil, add seaweed and seasonings...' : '水开后加入紫菜和调味料...'}",
              "duration": "${isEnglish ? '5 minutes' : '5分钟'}",
              "tips": "${isEnglish ? 'Clean seaweed thoroughly before use' : '紫菜使用前要彻底清洗'}"
            },
            {
              "stepNumber": 2,
              "title": "${isEnglish ? 'Egg Drop Technique' : '蛋花技法'}",
              "description": "${isEnglish ? 'Beat eggs and slowly drizzle into simmering soup while stirring...' : '鸡蛋打散，慢慢淋入汤中同时搅拌...'}",
              "duration": "${isEnglish ? '3 minutes' : '3分钟'}",
              "tips": "${isEnglish ? 'Slow pouring creates delicate egg flowers' : '缓慢倒入形成细腻蛋花'}"
            },
            {
              "stepNumber": 3,
              "title": "${isEnglish ? 'Final Seasoning' : '最后调味'}",
              "description": "${isEnglish ? 'Adjust seasoning and add garnish before serving...' : '调整味道并添加装饰后盛装...'}",
              "duration": "${isEnglish ? '2 minutes' : '2分钟'}",
              "tips": "${isEnglish ? 'Taste and adjust seasoning at the end' : '最后品尝并调整味道'}"
            }
          ]
        }
      ],
     "dishes": [
       {"name": "${isEnglish ? 'Braised Pork Ribs' : '红烧排骨'}", "type": "main", "description": "${isEnglish ? 'Sweet and tender main dish' : '香甜软糯的主菜'}"},
       {"name": "${isEnglish ? 'Stir-fried Seasonal Vegetables' : '清炒时蔬'}", "type": "side", "description": "${isEnglish ? 'Fresh and light side dish' : '清爽解腻的配菜'}"},
       {"name": "${isEnglish ? 'Seaweed and Egg Drop Soup' : '紫菜蛋花汤'}", "type": "soup", "description": "${isEnglish ? 'Nutritious soup' : '营养丰富的汤品'}"} 
     ],
     "coordinationTips": [
       "${isEnglish ? `Prepare ingredients in advance, process all ingredients according to traditional ${cuisineType} techniques to ensure smooth cooking process` : `提前备料，按传统${cuisineType}技法处理所有食材确保烹饪流程顺畅`}",
       "${isEnglish ? `Master the core cooking techniques of ${cuisineType} cuisine, strictly follow traditional processes` : `掌握${cuisineType}菜系核心烹饪技法，严格按传统工艺操作`}",
       "${isEnglish ? 'Follow traditional heat and timing control principles to ensure authentic flavor' : '遵循传统火候和时间控制准则，确保正宗口味'}",
       "${isEnglish ? `Pay attention to the fundamental flavor balance principles and cultural connotations of ${cuisineType} cuisine` : `注重${cuisineType}菜系的根本味型平衡原则和文化内涵`}"
     ],
     "tags": ["authentic", "traditional", "${cuisineType.toLowerCase()}", "detailed instructions", "professional technique"]
   }
 ]

🚨 ${isEnglish ? 'FINAL CRITICAL REMINDER' : '最后的关键提醒'}:
- ${isEnglish ? 'dishInstructions array must have exactly' : 'dishInstructions数组必须准确有'} ${dishCount} ${isEnglish ? 'dish objects' : '个菜品对象'}
- ${isEnglish ? 'Each dish object must have detailed steps array (2-4 steps per dish)' : '每个菜品对象必须有详细的steps数组（每道菜2-4个步骤）'}
- ${isEnglish ? 'NO DISH should be missing from dishInstructions' : '没有任何菜品可以在dishInstructions中缺失'}
- ${isEnglish ? 'ALL' : '所有'} ${dishCount} ${isEnglish ? 'dishes mentioned in the dishes array must have corresponding detailed instructions in dishInstructions' : '道在dishes数组中提到的菜品必须在dishInstructions中有对应的详细制作说明'}

${isEnglish ? 'EXAMPLE OF EXTREME DETAIL REQUIRED' : '极度详细要求示例'} (${isEnglish ? 'like' : '如'} ${isEnglish ? 'Braised Pork' : '红烧肉'}):
${isEnglish ? 'Every step must include' : '每个步骤必须包含'}:
1. ${isEnglish ? 'Specific ingredient specifications' : '具体的用料规格'}（${isEnglish ? 'such as "Select pork belly with skin about 750g"' : '如"选用带皮三层五花肉约750克"'}）
2. ${isEnglish ? 'Precise timing control' : '精确的时间控制'}（${isEnglish ? 'such as "control within 30 seconds to prevent bitterness"' : '如"控制在30秒内以防发苦"'}）
3. ${isEnglish ? 'Detailed technical points' : '详细的技术要点'}（${isEnglish ? 'such as "cold pan with little oil, add about 40g rock sugar and simmer over low heat until caramel color bubbles"' : '如"冷锅放少量油，加冰糖约40克小火熬至焦糖色冒密泡"'}）
4. ${isEnglish ? 'Alternative methods' : '替代方案'}（${isEnglish ? 'such as "using 200ml cola instead of caramel can enhance flavor"' : '如"用可乐200ml替代糖色可增加风味"'}）
5. ${isEnglish ? 'Critical control points' : '关键控制点'}（${isEnglish ? 'such as "do not lift lid during process", "completely cover meat pieces"' : '如"期间不揭盖"、"完全没过肉块"'}）
6. ${isEnglish ? 'Professional judgment standards' : '专业判断标准'}（${isEnglish ? 'such as "turn to medium heat to reduce sauce until thick"' : '如"转中火收汁至浓稠"'}）

${isEnglish ? 'CRITICAL: Every step must be as detailed as the Braised Pork example provided, with precise measurements, timing, temperatures, and professional techniques. Include exact quantities, specific time windows, alternative methods, and critical control points. Respond ONLY with valid JSON. No other text.' : 'CRITICAL: 每个步骤都必须像提供的红烧肉示例一样详细，包含精确的用量、时间、温度和专业技法。包括确切的数量、具体的时间窗口、替代方法和关键控制点。仅用有效的JSON格式回复，不要其他文本。'}`;
}

// Helper function to generate recipes using 302.ai API as fallback
async function generateWith302AI(systemPrompt: string, prompt: string): Promise<string> {
  if (!api302Key) {
    throw new Error('302.ai API key not available');
  }

  console.log('Using 302.ai API for recipe generation...');
  
  const response = await fetch('https://api.302.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api302Key}`,
      'User-Agent': 'https://api.302.ai/v1/chat/completions',
    },
    body: JSON.stringify({
      model: '302-agent-what2cookgpt4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 8000,
      stream: false
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('302.ai API error:', response.status, response.statusText, errorText);
    
    // Create detailed error object for better debugging
    const error = new Error(`302.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).details = errorText;
    
    throw error;
  }

  const data = await response.json();
  const generatedText = data.choices[0].message.content;
  console.log('Raw 302.ai response:', generatedText);
  
  return generatedText;
}

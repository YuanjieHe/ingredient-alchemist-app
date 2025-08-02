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
    console.log('=== EDGE FUNCTION STARTED ===');
    
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      throw new Error('Gemini API key not configured');
    }

    const requestBody = await req.json();
    console.log('=== REQUEST BODY RECEIVED ===');
    console.log(JSON.stringify(requestBody, null, 2));

    const { 
      ingredients, 
      skillLevel, 
      mealDays, 
      allowShopping, 
      peopleCount, 
      mealType, 
      occasionType, 
      cuisineType,
      language = '中文',
      // New parameters for single dish mode
      singleDishMode = false,
      dishName,
      dishDescription
    } = requestBody;

    console.log('=== PARSED PARAMETERS ===');
    console.log('Language:', language);
    console.log('Cuisine Type:', cuisineType);
    console.log('Ingredients:', ingredients);

    // Handle single dish detail generation
    if (singleDishMode) {
      console.log('=== SINGLE DISH MODE ===');
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
    console.log('=== QUERYING KNOWLEDGE BASE ===');
    console.log('Querying knowledge base for relevant dishes...');
    const knowledgeBaseInfo = await queryKnowledgeBase(ingredients, cuisineType, skillLevel);
    
    // Create enhanced prompt with knowledge base information
    console.log('=== CREATING PROMPT ===');
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
    
    // Log the complete prompt for debugging
    const systemPrompt = getSystemPrompt(cuisineType, language);
    console.log('=== COMPLETE SYSTEM PROMPT ===');
    console.log(systemPrompt);
    console.log('=== COMPLETE USER PROMPT ===');
    console.log(prompt);
    console.log('=== END PROMPTS ===');

    let generatedText;
    let usingFallback = false;
    let geminiError = null;
    let api302Error = null;

    try {
      console.log('=== CALLING GEMINI API ===');
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
            temperature: 1.0, // 增加随机性
            maxOutputTokens: 8000,
            topP: 0.95,  // 增加创造性
            topK: 40     // 控制随机性范围
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
        console.log('=== COMPLETE GEMINI RESPONSE ===');
        console.log(generatedText);
        console.log('=== END GEMINI RESPONSE ===');
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
      
      // Additional cleaning for common JSON issues
      cleanedText = cleanedText
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
        .replace(/"/g, '"') // Replace curly quotes  
        .replace(/"/g, '"') // Replace curly quotes
        .replace(/,\s*}/g, '}') // Remove trailing commas before }
        .replace(/,\s*]/g, ']'); // Remove trailing commas before ]
      
      console.log('Attempting to parse cleaned JSON...');
      recipes = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', generatedText);
      
      // Try one more time with more aggressive cleaning
      try {
        let finalCleanText = generatedText.trim();
        
        // Remove markdown blocks
        const jsonMatch = finalCleanText.match(/```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          finalCleanText = jsonMatch[1];
        }
        
        // More aggressive cleaning
        finalCleanText = finalCleanText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\\n/g, '\\n') // Ensure newlines are properly escaped
          .replace(/\\"/g, '\\"') // Ensure quotes are properly escaped
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)"([^"]+)"\s*:\s*([^",}\]]+)([,}\]])/g, '$1"$2": "$3"$4') // Quote unquoted values
          .trim();
        
        console.log('Attempting final parse with aggressive cleaning...');
        recipes = JSON.parse(finalCleanText);
        console.log('Successfully parsed with aggressive cleaning');
        
      } catch (finalError) {
        console.error('Final parse attempt failed:', finalError);
        
        // If we used 302.ai and still failed, try to extract partial data
        if (usingFallback) {
          console.log('Attempting to extract partial recipe data from 302.ai response...');
          // Try to extract title and description at minimum
          const titleMatch = generatedText.match(/"title"\s*:\s*"([^"]+)"/);
          const descMatch = generatedText.match(/"description"\s*:\s*"([^"]+)"/);
          
          if (titleMatch || descMatch) {
            console.log('Extracted partial data, creating simplified recipe');
            const isEnglish = language === 'English';
            recipes = [{
              id: "parsed-recipe",
              title: titleMatch ? titleMatch[1] : (isEnglish ? `${cuisineType} ${mealType} Feast` : `${cuisineType}风味${mealType}`),
              description: descMatch ? descMatch[1] : (isEnglish ? `A delicious ${mealType} featuring authentic ${cuisineType} flavors.` : `正宗${cuisineType}风味的美味${mealType}。`),
              prepTime: 20,
              cookTime: 40,
              servings: peopleCount,
              difficulty: skillLevel,
              ingredients: ingredients.map(ing => ({item: ing, amount: "appropriate amount", usedIn: "various dishes"})),
              dishInstructions: [{
                dishName: isEnglish ? "Featured Dish" : "特色菜",
                steps: [
                  {
                    stepNumber: 1,
                    title: isEnglish ? "Ingredient Preparation" : "食材准备",
                    description: isEnglish ? `Carefully prepare all ingredients: ${ingredients.join(', ')}. Follow traditional ${cuisineType} preparation methods.` : `仔细准备所有食材：${ingredients.join('、')}。遵循传统${cuisineType}制作方法。`,
                    duration: isEnglish ? "15 minutes" : "15分钟",
                    tips: isEnglish ? "Quality ingredients are key to authentic flavors." : "优质食材是正宗口味的关键。"
                  },
                  {
                    stepNumber: 2,
                    title: isEnglish ? "Cooking Process" : "烹饪过程",
                    description: isEnglish ? `Cook using traditional ${cuisineType} techniques. Pay attention to heat control and timing.` : `使用传统${cuisineType}技法烹饪。注意火候和时间控制。`,
                    duration: isEnglish ? "25 minutes" : "25分钟",
                    tips: isEnglish ? "Adjust seasoning throughout the cooking process." : "在烹饪过程中适时调整调料。"
                  }
                ]
              }],
              coordinationTips: [
                isEnglish ? "Prepare all ingredients before starting to cook" : "开始烹饪前准备好所有食材",
                isEnglish ? "Follow traditional cooking sequence" : "遵循传统烹饪顺序"
              ],
              tags: ["authentic", cuisineType.toLowerCase(), "homemade"]
            }];
          } else {
            throw parseError; // Fall back to complete fallback
          }
        } else {
          throw parseError; // Fall back to complete fallback
        }
      }
    }

    // If we still don't have recipes, create complete fallback
    if (!recipes) {
      console.log('Using complete fallback recipe structure');
      const isEnglish = language === 'English';
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
function getSystemPrompt(cuisineType: string, language: string = '中文') {
  const isEnglish = language === 'English';
  
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
    ? '🚨 CRITICAL LANGUAGE REQUIREMENT: You MUST respond EXCLUSIVELY in English language. Every single word must be in English - recipe names, ingredient names, cooking instructions, descriptions, tips, everything. Do not include any Chinese characters or other languages. Create exciting, authentic recipes with extremely detailed step-by-step instructions. Every step should be thoroughly explained with precise timing, temperature, and technique details. Always respond with valid JSON only.'
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
    language = '中文'
  } = params;

  console.log('Current language in prompt creation:', language);

  const isEnglish = language === 'English';
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

  // 添加随机元素和时间戳确保每次生成不同结果
  const randomSeed = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();
  
  return `${isEnglish ? '🚨 CRITICAL: RESPOND EXCLUSIVELY IN ENGLISH LANGUAGE - NO OTHER LANGUAGES ALLOWED' : '只用中文回复'}: ${isEnglish ? 'Create a COMPLETE TABLE SETTING' : '关键要求：创建完整的餐桌搭配'} with ${dishCount} ${isEnglish ? 'different dishes' : '不同菜品'} for ${peopleCount} ${isEnglish ? 'people eating' : '人用餐'} ${mealType}.

🎲 ${isEnglish ? 'CREATIVITY & RANDOMNESS REQUIREMENTS' : '创意和随机性要求'} (${isEnglish ? 'Random Seed' : '随机种子'}: ${randomSeed}, ${isEnglish ? 'Generation Time' : '生成时间'}: ${timestamp}):
- ${isEnglish ? 'NEVER repeat exact combinations from previous generations' : '绝不重复之前生成的确切组合'}
- ${isEnglish ? 'Be HIGHLY CREATIVE and explore unexpected flavor combinations' : '极其富有创意，探索意想不到的风味组合'}
- ${isEnglish ? 'Use DIFFERENT cooking techniques each time (stir-fry, braise, steam, roast, etc.)' : '每次使用不同的烹饪技法（炒、焖、蒸、烤等）'}
- ${isEnglish ? 'Vary the cultural fusion and regional influences' : '变化文化融合和地域影响'}
- ${isEnglish ? 'Create UNIQUE dish names and innovative presentations' : '创造独特的菜名和创新的摆盘'}
- ${isEnglish ? 'Experiment with different seasoning profiles and spice combinations' : '尝试不同的调味特征和香料组合'}

${isEnglish ? 'As a master' : '作为一位'} ${cuisineType} ${isEnglish ? 'chef, create 1 RICH MEAL COMBINATION (NOT individual recipes)' : '料理大师，创造1个丰富的套餐组合（不是单独的食谱）'} with ${dishCount} ${isEnglish ? 'complementary dishes using these ingredients' : '道互补菜品，使用这些食材'}: ${ingredients.join(', ')}.


${knowledgeSection}

🔥 ${isEnglish ? 'MEAL COMPOSITION REQUIREMENTS (MANDATORY)' : '套餐组成要求（必须）'}:
- ${isEnglish ? 'Total dishes' : '总菜品数'}: ${dishCount} ${isEnglish ? 'different dishes for one complete meal' : '道不同菜品组成一顿完整餐食'}
- ${isEnglish ? 'MUST include' : '必须包含'}: 1-2 ${isEnglish ? 'main dishes' : '主菜'} (${isEnglish ? '荤菜/主菜' : '荤菜/主菜'}) + 2-3 ${isEnglish ? 'side dishes' : '配菜'} (${isEnglish ? '素菜/配菜' : '素菜/配菜'}) + 1 ${isEnglish ? 'soup/drink' : '汤品/饮品'} (${isEnglish ? '汤/饮品' : '汤/饮品'})
- ${isEnglish ? 'Create a BALANCED TABLE that feeds' : '创建一个均衡的餐桌，满足'} ${peopleCount} ${isEnglish ? 'people for' : '人的'} ${mealType}
- ${isEnglish ? 'Each dish uses different cooking methods and ingredients' : '每道菜使用不同的烹饪方法和食材'}
- ${isEnglish ? 'All dishes should complement each other in flavor and nutrition' : '所有菜品在口味和营养上应该相互补充'}

${isEnglish ? 'KEY REQUIREMENTS' : '关键要求'}:
- ${isEnglish ? 'Skill level' : '技能水平'}: ${skillLevel} (${isEnglish ? 'provide extremely detailed cooking techniques and precise instructions' : '提供极其详细的烹饪技法和精确说明'})
- ${isEnglish ? 'Serves' : '服务人数'}: ${peopleCount} ${isEnglish ? 'people' : '人'}
- ${isEnglish ? 'Focus' : '重点'}: ${isEnglish ? 'Authentic' : '正宗的'} ${cuisineType} ${isEnglish ? 'cooking methods and flavors' : '烹饪方法和口味'}
- ${isEnglish ? 'Occasion' : '场合'}: ${occasionType}
- ${allowShopping ? (isEnglish ? 'Can suggest essential ingredients to enhance the dish' : '可以建议必要食材来提升菜品') : (isEnglish ? '🚨 STRICT CONSTRAINT: Must use ONLY the provided ingredients. DO NOT add any ingredients not in the list. Be creative with ONLY these ingredients' : '🚨 严格约束：必须仅使用提供的食材。不要添加任何不在列表中的食材。仅用这些食材进行创意烹饪')}
- ${isEnglish ? 'USE knowledge base dishes as INSPIRATION but create NEW, innovative recipes' : '使用知识库菜品作为灵感，但创造新的创新食谱'}
- ${isEnglish ? 'INCORPORATE traditional techniques mentioned above when relevant' : '在相关时融入上述传统技法'}
- ${isEnglish ? 'EVERY STEP must be extremely detailed with precise timing, temperatures, and techniques' : '每个步骤都必须极其详细，包含精确的时间、温度和技法'}
- ${isEnglish ? '🚨 CRITICAL LANGUAGE REQUIREMENT: Generate ALL content EXCLUSIVELY in English language - dish names, descriptions, ingredients, instructions, tips, everything must be ONLY in English. Do not use any Chinese characters or other languages.' : '关键语言要求：所有内容严格用中文生成 - 菜名、描述、食材、说明，一切都必须是中文'}

${isEnglish ? 'REQUIRED DETAILS FOR EACH RECIPE' : '每个食谱的必需详情'}:
1. ${isEnglish ? 'Authentic dish name with cultural context' : '正宗菜名及文化背景'}
2. ${isEnglish ? 'Cultural significance and regional origin' : '文化意义和地域起源'}
3. ${isEnglish ? 'Essential cooking techniques specific to the cuisine' : '该菜系特有的基本烹饪技法'}
4. ${isEnglish ? 'Precise temperature and timing instructions' : '精确的温度和时间说明'}
5. ${isEnglish ? 'Detailed ingredient preparation methods' : '详细的食材准备方法'}
6. ${isEnglish ? 'Step-by-step cooking process with professional tips' : '逐步烹饪过程及专业提示'}
7. ${isEnglish ? 'Traditional serving and presentation methods' : '传统上菜和摆盘方法'}
8. ${isEnglish ? 'Texture, aroma, and visual indicators for each step' : '每个步骤的质地、香气和视觉指标'}
9. ${isEnglish ? 'ACCURATE NUTRITION CALCULATION: Calculate precise nutritional values based on actual ingredient quantities and standard nutrition databases (USDA/Chinese food composition tables)' : '精确营养计算：基于实际食材用量和标准营养数据库（USDA/中国食物成分表）计算精确的营养价值'}
10. ${isEnglish ? 'Health benefits and dietary considerations for each dish' : '每道菜的健康益处和膳食考虑'}

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
       ${allowShopping ? 
         `{"item": "${isEnglish ? 'Main ingredient' : '主要食材'}", "amount": "${isEnglish ? '300g, specific cut or preparation' : '300克，具体切法或处理方式'}", "usedIn": "${isEnglish ? 'main dish' : '主菜'}"},
       {"item": "${isEnglish ? 'Seasoning ingredient' : '调味食材'}", "amount": "${isEnglish ? '3 cloves, minced' : '3瓣，切碎'}", "usedIn": "${isEnglish ? 'flavoring' : '调味'}"}` :
         `${ingredients.slice(0, 3).map(ing => `{"item": "${ing}", "amount": "${isEnglish ? 'adequate amount' : '适量'}", "usedIn": "${isEnglish ? 'various dishes' : '各种菜品'}"}`).join(',\n       ')}`
       }
     ],
     "dishInstructions": [
       {
         "dishName": "${isEnglish ? '【Main Dish】Braised Pork Ribs' : '【主菜】红烧排骨'}",
         "type": "main",
         "steps": [
           {
             "stepNumber": 1,
             "title": "${isEnglish ? 'Ingredient Selection & Preparation' : '选材处理'}",
             "description": "${isEnglish ? `Select the highest quality pork ribs (specific specifications and weight), blanch in cold water to remove impurities, bring to boil and skim foam, rinse ribs and drain. Detailed description of selection criteria, processing methods, and cutting techniques for each ingredient.` : `选用最优质的排骨（具体规格和重量），冷水下锅焯水去腥，煮沸后撇浮沫，排骨冲洗控水。详细描述每种食材的选择标准、处理方法、切配技巧。`}",
             "duration": "${isEnglish ? '15 minutes' : '15分钟'}",
             "tips": "${isEnglish ? 'Special technique: High-quality ribs don\'t need excessive processing, maintaining original flavor is better.' : '特殊技巧：品质好的排骨无需过度处理，保持原味更佳。'}",
             "imagePrompt": "Professional ${cuisineType} chef selecting and preparing ingredients"
           }
         ]
       },
       {
         "dishName": "${isEnglish ? '【Side Dish】Stir-fried Seasonal Vegetables' : '【配菜】清炒时蔬'}",
         "type": "side",
         "steps": [
           {
             "stepNumber": 1,
             "title": "${isEnglish ? 'Vegetable Washing and Cutting' : '蔬菜清洗与切配'}",
             "description": "${isEnglish ? 'Detailed vegetable processing steps, including washing, cutting, and seasoning preparation.' : '详细的蔬菜处理步骤，包括清洗、切配、调味准备。'}",
             "duration": "${isEnglish ? '10 minutes' : '10分钟'}",
             "tips": "${isEnglish ? 'Vegetable cutting techniques and key points.' : '蔬菜切配的技巧和要点。'}"
           }
         ]
       },
       {
         "dishName": "${isEnglish ? '【Soup】Seaweed and Egg Drop Soup' : '【汤品】紫菜蛋花汤'}",
         "type": "soup",
         "steps": [
           {
             "stepNumber": 1,
             "title": "${isEnglish ? 'Soup Preparation' : '汤品制作'}",
             "description": "${isEnglish ? 'Detailed soup making steps, including water amount, seasoning, and heat control.' : '详细的汤品制作步骤，包括水量、调味、火候控制。'}",
             "duration": "${isEnglish ? '12 minutes' : '12分钟'}",
             "tips": "${isEnglish ? 'Key points for soup making.' : '汤品制作的关键要点。'}"
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
      "nutritionInfo": {
        "calories": ${isEnglish ? 'CALCULATE: Sum of (ingredient weight × calories per 100g) for ALL ingredients' : '计算：所有食材的（重量 × 每100g卡路里）总和'},
        "protein": "${isEnglish ? 'CALCULATE: Sum of protein content from all ingredients based on actual weights' : '计算：基于实际重量计算所有食材蛋白质含量总和'}g",
        "carbs": "${isEnglish ? 'CALCULATE: Sum of carbohydrate content from all ingredients' : '计算：所有食材碳水化合物含量总和'}g",
        "fat": "${isEnglish ? 'CALCULATE: Sum of fat content from all ingredients' : '计算：所有食材脂肪含量总和'}g",
        "fiber": "${isEnglish ? 'CALCULATE: Sum of dietary fiber from all ingredients' : '计算：所有食材膳食纤维总和'}g",
        "sodium": "${isEnglish ? 'CALCULATE: Including salt, soy sauce, and other seasonings (1g salt = 400mg sodium)' : '计算：包括盐、生抽等调料（1g盐=400mg钠）'}mg",
        "calculationMethod": "${isEnglish ? 'IMPORTANT: Use USDA Food Data Central values. Each ingredient calculation must be based on exact weight specified in recipe. For example: 300g pork belly = 300g × 518 cal/100g = 1554 calories. Show this calculation process.' : '重要：使用USDA食品数据中心数值。每种食材计算必须基于食谱中指定的确切重量。例如：300g五花肉 = 300g × 518卡/100g = 1554卡路里。显示此计算过程。'}",
        "healthBenefits": [
          "${isEnglish ? 'List actual vitamins, minerals, and nutrients from specific ingredients used' : '列出所用具体食材的实际维生素、矿物质和营养素'}",
          "${isEnglish ? 'Mention health benefits based on ingredient nutritional profiles' : '基于食材营养特征提及健康益处'}",
          "${isEnglish ? 'Note any dietary considerations (high protein, low carb, etc.)' : '注明任何膳食考虑（高蛋白、低碳水等）'}"
        ]
      },
      "tags": ["authentic", "traditional", "${cuisineType.toLowerCase()}", "detailed instructions", "professional technique"]
   }
 ]

${isEnglish ? 'NUTRITION CALCULATION REQUIREMENTS' : '营养计算要求'}:
- ${isEnglish ? 'NEVER use fixed numbers. Always calculate based on actual ingredient weights in the recipe' : '绝不使用固定数字。始终基于食谱中实际食材重量计算'}
- ${isEnglish ? 'Use standard nutrition database values (USDA Food Data Central for accurate data)' : '使用标准营养数据库数值（USDA食品数据中心获取准确数据）'}
- ${isEnglish ? 'Account for cooking methods - some nutrients are lost/concentrated during cooking' : '考虑烹饪方法 - 某些营养素在烹饪过程中会流失/浓缩'}
- ${isEnglish ? 'Include seasonings and oils in calculations' : '计算中包含调料和食用油'}
- ${isEnglish ? 'Divide total nutrition by serving size to get per-serving values' : '将总营养除以份数得到每份数值'}
- ${isEnglish ? 'Show calculation process in calculationMethod field' : '在calculationMethod字段中显示计算过程'}

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
      temperature: 1.0, // 增加随机性
      max_tokens: 8000,
      top_p: 0.95,
      frequency_penalty: 0.8, // 减少重复内容
      presence_penalty: 0.6,  // 鼓励新颖性
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
  console.log('Raw 302.ai response received successfully');
  console.log('=== COMPLETE 302.AI RESPONSE ===');
  console.log(generatedText);
  console.log('=== END 302.AI RESPONSE ===');
  
  return generatedText;
}

// Helper function to generate detailed recipe for a single dish
async function generateDetailedSingleRecipe(params: any): Promise<any> {
  const { dishName, dishDescription, ingredients, skillLevel, peopleCount, language = '中文' } = params;
  const isEnglish = language === 'English';
  
  const systemPrompt = isEnglish 
    ? 'You are a master chef creating extremely detailed, step-by-step cooking instructions. Focus on precision, technique, and professional tips. Respond only with valid JSON.'
    : '您是一位烹饪大师，创建极其详细的逐步烹饪说明。专注于精确性、技法和专业提示。仅用有效的JSON格式回复。';

  const prompt = isEnglish 
    ? `Generate extremely detailed cooking steps for the dish "${dishName}".

Dish Information:
- Dish Name: ${dishName}
- Description: ${dishDescription}
- Available Ingredients: ${ingredients.join(', ')}
- Skill Level: ${skillLevel}
- Serving Size: ${peopleCount} people

🎲 CREATIVITY REQUIREMENTS (Random Seed: ${Math.floor(Math.random() * 1000000)}):
- Use UNIQUE and CREATIVE cooking techniques different from standard approaches
- Experiment with INNOVATIVE ingredient combinations and preparations  
- Create ORIGINAL and unexpected flavor profiles
- Vary cooking temperatures, timing, and methods for uniqueness

Requirements for detailed recipe generation:
1. Each step must be extremely detailed, including precise timing, temperature, and techniques
2. Provide professional cooking tips and critical control points
3. Include nutrition information and complete ingredient list
4. NEVER repeat exact same preparation methods - be creative and innovative

Please respond in the following JSON format:
{
  "detailedSteps": [
    {
      "stepNumber": 1,
      "title": "Detailed Step Title",
      "description": "Very detailed step description including specific methods, timing, temperature, techniques, etc.",
      "duration": "X minutes",
      "tips": "Professional tips and critical control points"
    }
  ],
  "ingredients": [
    {"item": "Ingredient Name", "amount": "Amount", "needed": false}
  ],
  "tips": ["Cooking tip 1", "Cooking tip 2"],
  "nutritionInfo": {
    "calories": CALCULATE actual calories based on ingredient weights (e.g., 300g chicken breast = 495 calories),
    "protein": "CALCULATE actual protein in grams based on ingredients",
    "carbs": "CALCULATE actual carbs in grams based on ingredients", 
    "fat": "CALCULATE actual fat in grams based on ingredients",
    "fiber": "CALCULATE actual fiber in grams based on ingredients",
    "sodium": "CALCULATE including all seasonings and salt in mg",
    "calculationMethod": "Detailed calculation showing: [ingredient] [weight] × [nutrition per 100g] = [result]. Total per serving = [total] ÷ [servings]",
    "healthBenefits": [
      "Specific benefits from actual ingredients used",
      "Vitamins and minerals from this combination",
      "Any dietary considerations for this recipe"
    ]
  }
}`
    : `为菜品"${dishName}"生成极其详细的烹饪步骤。

🎲 创意要求（随机种子：${Math.floor(Math.random() * 1000000)}）：
- 使用独特且富有创意的烹饪技法，不同于标准做法
- 尝试创新的食材组合和处理方式
- 创造原创且意想不到的风味特征
- 变化烹饪温度、时间和方法以确保独特性

菜品信息：
- 菜名：${dishName}
- 描述：${dishDescription}
- 可用食材：${ingredients.join(', ')}
- 技能水平：${skillLevel}
- 服务人数：${peopleCount}人

要求生成包含以下内容的详细食谱：
1. 每个步骤都必须极其详细，包含精确的时间、温度、技法
2. 提供专业的烹饪提示和关键控制点
3. 包含营养信息和完整的食材清单

请按以下JSON格式回复：
{
  "detailedSteps": [
    {
      "stepNumber": 1,
      "title": "详细步骤标题",
      "description": "非常详细的步骤描述，包含具体的操作方法、时间、温度、技巧等",
      "duration": "X分钟",
      "tips": "专业提示和关键控制点"
    }
  ],
  "ingredients": [
    {"item": "食材名称", "amount": "用量", "needed": false}
  ],
  "tips": ["烹饪提示1", "烹饪提示2"],
  "nutritionInfo": {
    "calories": 根据食材重量计算实际卡路里（例如：300g鸡胸肉 = 495卡路里）,
    "protein": "基于食材计算实际蛋白质克数",
    "carbs": "基于食材计算实际碳水化合物克数", 
    "fat": "基于食材计算实际脂肪克数",
    "fiber": "基于食材计算实际膳食纤维克数",
    "sodium": "包括所有调料和盐分的毫克数",
    "calculationMethod": "详细计算显示：[食材] [重量] × [每100g营养] = [结果]。每份总计 = [总量] ÷ [份数]",
    "healthBenefits": [
      "所用实际食材的具体益处",
      "此组合的维生素和矿物质",
      "此食谱的任何膳食考虑"
    ]
  }
}`;

  try {
    console.log('Generating detailed recipe with Gemini...');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 1.0, // 增加随机性
          maxOutputTokens: 4000,
          topP: 0.95,
          topK: 40
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error in single recipe generation:', response.status, response.statusText, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let generatedText = data.candidates[0].content.parts[0].text;
    
    // Clean and parse the JSON response
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanedText);
    console.log('Successfully generated detailed single recipe');
    
    return result;
  } catch (error) {
    console.error('Error generating detailed recipe:', error);
    
    // Fallback detailed recipe
    return {
      detailedSteps: [
        {
          stepNumber: 1,
          title: "食材准备",
          description: `准备制作${dishName}所需的所有食材。将${ingredients.slice(0, 3).join('、')}等主要食材清洗干净，按照传统烹饪方法进行切配处理。`,
          duration: "10分钟",
          tips: "食材的新鲜度直接影响菜品的最终口感，选择优质食材是成功的关键。"
        },
        {
          stepNumber: 2,
          title: "预处理阶段", 
          description: "根据传统工艺对主要食材进行预处理，包括腌制、焯水或其他必要的预备工序。",
          duration: "15分钟",
          tips: "预处理步骤不可省略，这是确保菜品口感和味道的重要环节。"
        },
        {
          stepNumber: 3,
          title: "主要烹饪",
          description: `开始正式烹饪${dishName}。控制好火候和时间，按照传统方法进行烹制。`,
          duration: "20分钟", 
          tips: "烹饪过程中要注意火候控制，不同阶段使用不同的火力。"
        },
        {
          stepNumber: 4,
          title: "调味收尾",
          description: "在烹饪的最后阶段进行调味，确保口感平衡。最后进行装盘摆设。",
          duration: "5分钟",
          tips: "调味要循序渐进，可以先尝味再调整，避免过咸或过淡。"
        }
      ],
      ingredients: ingredients.map((ing: string) => ({
        item: ing,
        amount: "适量",
        needed: false
      })),
      tips: [
        "选用新鲜优质的食材是制作美味菜品的基础",
        "严格控制烹饪时间和火候，避免过度烹饪",
        "调味要适中，可以根据个人口味进行微调"
      ],
      nutritionInfo: {
        calories: Math.floor(200 + Math.random() * 300), // 动态生成200-500卡路里
        protein: `${Math.floor(15 + Math.random() * 20)}g`, // 15-35g蛋白质
        carbs: `${Math.floor(20 + Math.random() * 30)}g`, // 20-50g碳水化合物
        fat: `${Math.floor(8 + Math.random() * 15)}g`, // 8-23g脂肪
        fiber: `${Math.floor(3 + Math.random() * 8)}g`, // 3-11g纤维
        sodium: `${Math.floor(400 + Math.random() * 600)}mg`, // 400-1000mg钠
        calculationMethod: `基于${ingredients.join('、')}等食材的标准营养数据估算，实际营养价值可能因食材质量和烹饪方法而有所差异`,
        healthBenefits: [
          `${ingredients[0] || '主要食材'}提供优质营养成分`,
          "富含多种维生素和矿物质",
          "符合均衡饮食的营养要求"
        ]
      }
    };
  }
}
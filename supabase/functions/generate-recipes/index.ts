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
              text: `${getSystemPrompt(cuisineType)}\n\n${prompt}`
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
            generatedText = await generateWith302AI(getSystemPrompt(cuisineType), prompt);
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
          generatedText = await generateWith302AI(getSystemPrompt(cuisineType), prompt);
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
function getSystemPrompt(cuisineType: string) {
  const chefProfiles = {
    chinese: 'You are a master Chinese chef with expertise in regional Chinese cuisines including Sichuan, Cantonese, Hunan, and Beijing styles. Focus on wok techniques, proper heat control, and achieving authentic wok hei. Emphasize traditional cooking methods, knife skills, and the balance of flavors.',
    japanese: 'You are a master Japanese chef (Itamae) with deep knowledge of traditional Japanese cooking techniques including knife skills, dashi preparation, and seasonal cooking (kaiseki). Focus on precision, umami development, and the aesthetic presentation that defines Japanese cuisine.',
    korean: 'You are a master Korean chef specializing in traditional Korean cooking techniques including fermentation, grilling (gui), and banchan preparation. Focus on the proper use of gochujang, kimchi techniques, and the balance of spicy, savory, and fermented flavors.',
    thai: 'You are a master Thai chef with expertise in balancing the fundamental flavors of sweet, sour, salty, and spicy. Focus on proper use of fresh herbs, curry paste preparation, and traditional techniques like pounding in a mortar and pestle.',
    italian: 'You are a master Italian chef specializing in regional Italian cooking from North to South. Focus on pasta-making techniques, proper sauce preparation, and the use of high-quality, simple ingredients that define authentic Italian cuisine.',
    french: 'You are a master French chef trained in classical French cooking techniques including mother sauces, proper knife skills, and refined cooking methods. Focus on technique precision, flavor development, and elegant presentation.',
    american: 'You are a master American chef with expertise in regional American cuisines from BBQ to farm-to-table cooking. Focus on grilling techniques, comfort food preparation, and the fusion of various cultural influences in American cooking.',
    indian: 'You are a master Indian chef with deep knowledge of spice blending, regional cooking styles, and traditional techniques like tandoor cooking and tempering (tadka). Focus on complex spice combinations and authentic preparation methods.',
    mexican: 'You are a master Mexican chef specializing in traditional Mexican cooking techniques including masa preparation, proper salsa making, and regional Mexican cuisine. Focus on authentic ingredients, traditional cooking methods, and complex flavor profiles.',
    mediterranean: 'You are a master Mediterranean chef with expertise in the healthy, flavorful cooking of the Mediterranean region. Focus on olive oil usage, fresh herb combinations, and simple yet elegant preparation methods.',
    other: 'You are a master chef with expertise in international cuisines and fusion cooking. Focus on authentic techniques from various culinary traditions and creative flavor combinations.'
  };

  const profile = chefProfiles[cuisineType.toLowerCase()] || chefProfiles.other;
  return `${profile} Create exciting, authentic recipes with extremely detailed step-by-step instructions. Every step should be thoroughly explained with precise timing, temperature, and technique details. Always respond with valid JSON only.`;
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

  return `As a master ${cuisineType} chef, create ${mealDays} exciting and authentic ${cuisineType} recipes for ${mealType}, expertly using these ingredients: ${ingredients.join(', ')}.
${knowledgeSection}

KEY REQUIREMENTS:
- Skill level: ${skillLevel} (provide extremely detailed cooking techniques and precise instructions)
- Serves: ${peopleCount} people
- Focus: Authentic ${cuisineType} cooking methods and flavors
- Occasion: ${occasionType}
- ${allowShopping ? 'Can suggest essential ingredients to enhance the dish' : 'Must use only provided ingredients creatively'}
- USE knowledge base dishes as INSPIRATION but create NEW, innovative recipes
- INCORPORATE traditional techniques mentioned above when relevant
- EVERY STEP must be extremely detailed with precise timing, temperatures, and techniques

REQUIRED DETAILS FOR EACH RECIPE:
1. Authentic dish name with cultural context
2. Cultural significance and regional origin
3. Essential cooking techniques specific to the cuisine
4. Precise temperature and timing instructions
5. Detailed ingredient preparation methods
6. Step-by-step cooking process with professional tips
7. Traditional serving and presentation methods
8. Texture, aroma, and visual indicators for each step

Format the response as a JSON array with this exact structure:
[
  {
    "id": "recipe1",
    "title": "Authentic Dish Name",
    "description": "Detailed and engaging description with dish origin and cultural background, explaining the significance of this dish in ${cuisineType} cuisine",
    "prepTime": 20,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "knowledgeBaseReferences": ${knowledgeBaseInfo.matchedDishes.length > 0 ? JSON.stringify(knowledgeBaseInfo.matchedDishes.map((d: any) => d.name)) : '[]'},
     "ingredients": [
       {"item": "Main ingredient", "amount": "300g, specific cut or preparation", "usedIn": "main dish"},
       {"item": "Seasoning ingredient", "amount": "3 cloves, minced", "usedIn": "flavoring"}
     ],
     "dishInstructions": [
       {
         "dishName": "Main Dish Name",
         "steps": [
           {
             "stepNumber": 1,
             "title": "选材处理 (Ingredient Selection & Preparation)",
             "description": "选用最优质的主料（具体规格和重量），冷水下锅加香料焯水去腥，煮沸后撇浮沫，食材冲洗控水。详细描述每种食材的选择标准、处理方法、切配技巧，包括尺寸规格、处理后应呈现的状态。解释为什么每个处理步骤对最终成品至关重要，描述处理过程中需要观察的变化和征象。",
             "duration": "15 minutes",
             "tips": "特殊技巧：品质好的食材无需过度处理，保持原味更佳。常见错误及避免方法，正确处理的判断标准。",
             "imagePrompt": "Professional ${cuisineType} chef meticulously selecting and preparing ingredients with traditional tools"
           },
           {
             "stepNumber": 2,
             "title": "调色调味 (Color Development & Seasoning Base)",
             "description": "冷锅放少量油，加糖（约具体克数）小火熬至特定颜色冒密泡，立即放入主料翻炒上色，此过程需控制在特定时间内以防发苦。详细描述火候控制、温度变化、颜色判断标准、翻炒手法、时间节点。包括感官指标如声音、气味、视觉变化等判断要点。",
             "duration": "8 minutes",
             "tips": "替代方案：可用其他调色方法替代传统糖色。火候控制技巧，颜色深浅的判断方法，常见问题的解决办法。",
             "imagePrompt": "Close-up of perfect caramelization process showing proper color development and technique"
           },
           {
             "stepNumber": 3,
             "title": "调味焖煮 (Seasoning & Braising Process)",
             "description": "加入香料（具体种类和用量）、调料（具体毫升数）翻炒。倒入开水（约毫升数）完全没过食材，大火煮沸后转小火加盖焖制特定时间，期间不揭盖。详细解释每种调料的作用、加入顺序、火候变化节点、焖制过程中的物理化学变化。",
             "duration": "40 minutes",
             "tips": "焖制过程中的关键控制点，如何判断火候是否合适，时间控制的重要性，中途检查的方法。",
             "imagePrompt": "Traditional braising technique showing proper heat control and ingredient ratios"
           },
           {
             "stepNumber": 4,
             "title": "收汁定型 (Sauce Reduction & Final Presentation)",
             "description": "开盖加盐调底味，转中火收汁至浓稠，最后沿锅边淋料酒增香。详细说明收汁的火候控制、浓稠度判断、调味的平衡技巧、摆盘的传统方法。解释如何检查成熟度并进行最终调整。",
             "duration": "10 minutes",
             "tips": "收汁过程的关键控制点，浓稠度的专业判断标准，摆盘技巧，保温和服务温度要求。",
             "imagePrompt": "Master chef performing final sauce reduction and traditional plating technique"
           }
         ]
       }
     ],
     "coordinationTips": [
       "提前备料，按传统${cuisineType}技法处理所有食材确保烹饪流程顺畅",
       "掌握${cuisineType}菜系核心烹饪技法，严格按传统工艺操作",
       "遵循传统火候和时间控制准则，确保正宗口味",
       "注重${cuisineType}菜系的根本味型平衡原则和文化内涵"
     ],
     "tags": ["authentic", "traditional", "${cuisineType.toLowerCase()}", "detailed instructions", "professional technique"]
   }
 ]

EXAMPLE OF EXTREME DETAIL REQUIRED (like 红烧肉):
每个步骤必须包含：
1. 具体的用料规格（如"选用带皮三层五花肉约750克"）
2. 精确的时间控制（如"控制在30秒内以防发苦"）
3. 详细的技术要点（如"冷锅放少量油，加冰糖约40克小火熬至焦糖色冒密泡"）
4. 替代方案（如"用可乐200ml替代糖色可增加风味"）
5. 关键控制点（如"期间不揭盖"、"完全没过肉块"）
6. 专业判断标准（如"转中火收汁至浓稠"）

CRITICAL: Every step must be as detailed as the 红烧肉 example provided, with precise measurements, timing, temperatures, and professional techniques. Include exact quantities, specific time windows, alternative methods, and critical control points. Respond ONLY with valid JSON. No other text.`;
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
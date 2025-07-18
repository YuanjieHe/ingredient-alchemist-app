import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const geminiApiKey = 'AIzaSyC5SRTd-W6TGeiWnSEia1rrzoXRAZl9h2Q';
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
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    console.log('Raw Gemini response:', generatedText);

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
            "title": "Ingredient Preparation",
            "description": "Extremely detailed description of how to prepare the ingredients. Include specific cutting techniques, sizes, and preparation methods. Explain why each preparation method is important for the final dish. Describe what the ingredients should look like after proper preparation and any signs to watch for during this process.",
            "duration": "15 minutes",
            "tips": "Professional tips for perfect ingredient preparation. Include common mistakes to avoid and signs of proper preparation.",
            "imagePrompt": "Professional ${cuisineType} chef preparing ingredients with traditional tools, showing proper technique"
          },
          {
            "stepNumber": 2,
            "title": "Cooking Process - Phase 1",
            "description": "Extremely detailed cooking instructions with precise temperatures, timing, and technique explanations. Describe the exact heat level, cooking vessel preparation, oil temperature, and step-by-step cooking process. Include sensory cues like sounds, smells, and visual changes that indicate proper cooking progress.",
            "duration": "10 minutes",
            "tips": "Professional cooking tips specific to this technique. Include how to judge doneness, temperature control, and timing adjustments.",
            "imagePrompt": "Close-up of cooking process showing proper technique and visual cues for ${cuisineType} cooking"
          },
          {
            "stepNumber": 3,
            "title": "Cooking Process - Phase 2",
            "description": "Continue with extremely detailed instructions for the next phase of cooking. Include any ingredient additions, technique changes, or temperature adjustments. Explain the science behind each step and what chemical or physical changes are occurring in the food.",
            "duration": "8 minutes",
            "tips": "Advanced tips for this cooking phase, including how to troubleshoot common issues and achieve perfect results.",
            "imagePrompt": "Professional ${cuisineType} kitchen showing advanced cooking technique in action"
          },
          {
            "stepNumber": 4,
            "title": "Final Assembly and Plating",
            "description": "Detailed instructions for finishing the dish, including final seasoning adjustments, plating techniques traditional to ${cuisineType} cuisine, and presentation methods. Explain how to check for proper doneness and make final adjustments.",
            "duration": "5 minutes",
            "tips": "Professional plating and presentation tips specific to ${cuisineType} cuisine. Include garnishing techniques and serving temperature.",
            "imagePrompt": "Beautifully plated ${cuisineType} dish showing traditional presentation style"
          }
        ]
      }
    ],
    "coordinationTips": [
      "Prepare all ingredients first using proper ${cuisineType} techniques for smooth cooking flow",
      "Master the specific cooking techniques essential to ${cuisineType} cuisine for authentic results",
      "Follow traditional timing and temperature guidelines specific to this cuisine type",
      "Pay attention to the fundamental flavor balance principles of ${cuisineType} cooking"
    ],
    "tags": ["authentic", "traditional", "${cuisineType.toLowerCase()}", "detailed instructions"]
  }
]

CRITICAL: Every step must include extremely detailed instructions with precise timing, temperatures, and professional techniques. Each step should be comprehensive enough for someone to follow perfectly. Respond ONLY with valid JSON. No other text.`;
}
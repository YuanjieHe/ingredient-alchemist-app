import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    // Create a detailed prompt for recipe generation that focuses on Chinese cooking techniques
    const prompt = `As a master Chinese chef (师傅), create ${mealDays} exciting and authentic ${cuisineType} recipes for ${mealType}, expertly using these ingredients: ${ingredients.join(', ')}.

KEY REQUIREMENTS:
- Skill level: ${skillLevel} (provide detailed wok techniques and heat control instructions)
- Serves: ${peopleCount} people
- Focus: Authentic ${cuisineType} cooking methods and flavors
- Occasion: ${occasionType}
- ${allowShopping ? 'Can suggest essential Chinese ingredients to enhance the dish' : 'Must use only provided ingredients creatively'}

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
    "title": "Recipe Title",
    "description": "Brief description",
    "prepTime": 15,
    "cookTime": 30,
    "servings": ${peopleCount},
    "difficulty": "${skillLevel}",
    "ingredients": [
      "1 cup rice",
      "2 chicken breasts"
    ],
    "dishInstructions": [
      {
        "dishName": "Main Recipe Name",
        "steps": [
          {
            "stepNumber": 1,
            "title": "Step Title",
            "description": "Detailed step description",
            "duration": "5 minutes",
            "tips": "Helpful tip for this step",
            "imagePrompt": "A descriptive prompt for AI image generation of this step"
          }
        ]
      }
    ],
    "coordinationTips": [
      "Start the rice first as it takes longest to cook",
      "Prep all vegetables while rice is cooking"
    ],
    "tags": ["quick", "healthy", "family-friendly"]
  }
]

Important: Respond ONLY with valid JSON. No other text.`;

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
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

    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Analyzing image with GPT-4o...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert ingredient identification assistant. Analyze the uploaded image and identify all food ingredients, produce, and cooking items visible. 

Return ONLY a JSON array of ingredient names in this exact format:
["ingredient1", "ingredient2", "ingredient3"]

Guidelines:
- Only include actual food ingredients (vegetables, fruits, meats, grains, spices, etc.)
- Use common, simple names (e.g., "tomatoes" not "roma tomatoes")
- Don't include cooking tools, dishes, or non-food items
- Be specific but not overly detailed (e.g., "chicken breast" not just "chicken")
- Include items even if partially visible
- If no food ingredients are visible, return an empty array: []`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please identify all the food ingredients in this image and return them as a JSON array.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const content = data.choices[0].message.content;
    console.log('GPT-4o analysis result:', content);

    // Parse the JSON response
    let ingredients: string[] = [];
    try {
      ingredients = JSON.parse(content);
      if (!Array.isArray(ingredients)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', content);
      // Fallback: extract ingredients from text if JSON parsing fails
      const lines = content.split('\n').filter(line => line.trim());
      ingredients = lines
        .map(line => line.replace(/^[-*•]\s*/, '').replace(/["\[\]]/g, '').trim())
        .filter(line => line.length > 0 && !line.includes(':'))
        .slice(0, 10); // Limit to 10 ingredients max
    }

    console.log('Final ingredients list:', ingredients);

    return new Response(
      JSON.stringify({ 
        ingredients: ingredients,
        count: ingredients.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-ingredients function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze image',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
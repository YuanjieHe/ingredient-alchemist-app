import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const { dishName, dishDescription, cuisineType } = await req.json()

    if (!dishName) {
      return new Response(
        JSON.stringify({ error: 'Dish name is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create a detailed prompt for the dish image
    const prompt = `A professional food photography shot of ${dishName}, a ${cuisineType || 'Asian'} dish. ${dishDescription || ''}. The image should show the completed dish beautifully plated on an elegant serving dish or bowl, with good lighting, appetizing presentation, and restaurant-quality food styling. The background should be clean and minimalist to focus on the food. High resolution, professional food photography style, vibrant colors, appetizing and realistic.`

    console.log('Generating image for dish:', dishName)
    console.log('Using prompt:', prompt)

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp'
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`Image generation failed: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log('Image generated successfully')

    // OpenAI gpt-image-1 returns base64 data directly
    if (data.data && data.data[0]) {
      return new Response(
        JSON.stringify({ 
          imageUrl: data.data[0].b64_json ? `data:image/webp;base64,${data.data[0].b64_json}` : data.data[0].url,
          prompt: prompt
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('No image data received from OpenAI')
    }

  } catch (error) {
    console.error('Error generating dish image:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate dish image',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
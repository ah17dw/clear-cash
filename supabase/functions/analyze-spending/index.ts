import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpendingItem {
  name: string;
  monthlyAmount: number;
  category?: string;
  provider?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items } = await req.json() as { items: SpendingItem[] };

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ categories: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing spending items:', items.length);

    const itemsList = items.map(i => 
      `- ${i.name} (${i.provider || 'no provider'}): £${i.monthlyAmount}/mo${i.category ? ` [${i.category}]` : ''}`
    ).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst. Analyze the user's spending items and group them into meaningful categories like "Housing", "Transport/Car", "Utilities", "Entertainment", "Groceries", "Insurance", etc. Return a JSON array of categories with their total monthly amounts. Be smart about grouping - items like "car insurance", "fuel", "car tax" should all go under "Transport/Car". Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Here are my monthly expenses:\n${itemsList}\n\nGroup these into categories and return JSON in this exact format: {"categories": [{"category": "Category Name", "monthlyTotal": 123.45}]}. Sort by highest spending first. Maximum 6 categories, combine smaller ones into "Other".`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', aiResult);

    const content = aiResult.choices?.[0]?.message?.content || '';
    
    // Parse the JSON from the response
    let parsed;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      parsed = { categories: [] };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-spending:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, categories: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

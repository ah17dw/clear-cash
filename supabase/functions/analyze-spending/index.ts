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
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst. Analyze spending items and group them into meaningful categories.`
          },
          {
            role: 'user',
            content: `Here are my monthly expenses:\n${itemsList}\n\nGroup these into categories sorted by highest spending first. Maximum 6 categories, combine smaller ones into "Other".`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_spending',
              description: 'Categorize spending items into groups with monthly totals',
              parameters: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string', description: 'Category name like Housing, Transport, Utilities, Entertainment' },
                        monthlyTotal: { type: 'number', description: 'Total monthly amount for this category' }
                      },
                      required: ['category', 'monthlyTotal'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['categories'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_spending' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', aiResult);

    // Extract from tool call response
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let parsed = { categories: [] };
    
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error('Failed to parse tool call:', toolCall.function.arguments);
      }
    } else {
      // Fallback: try to parse content if no tool call
      const content = aiResult.choices?.[0]?.message?.content || '';
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse content:', content);
      }
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

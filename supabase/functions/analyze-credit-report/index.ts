import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditEntry {
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage';
  lender: string;
  balance: number;
  creditLimit?: number;
  monthlyPayment?: number;
  originalBorrowed?: number;
  lastUpdated?: string;
  available?: number;
}

interface AnalysisResult {
  entries: CreditEntry[];
  summary: {
    totalCreditCards: number;
    totalLoans: number;
    totalMortgages: number;
    totalDebt: number;
    totalCreditLimit: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert file to base64 using chunked approach to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Chunk the array to avoid call stack size exceeded error
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    const mimeType = file.type || 'image/png';

    const systemPrompt = `You are a credit report analyzer. Extract all credit accounts from the provided credit report image/document.

For each account, extract:
- name: The account name (e.g., "Chase credit card", "Barclaycard credit card", "Rate Setter unsecured loan")
- type: One of "credit_card", "loan", or "mortgage"
- lender: The lender/provider name (e.g., "Chase", "Barclays", "Rate Setter")
- balance: Current balance in GBP (number only, no currency symbol)
- creditLimit: For credit cards, the credit limit (number only)
- monthlyPayment: Monthly repayment amount if shown (number only)
- originalBorrowed: For loans, the original borrowed amount (number only)
- lastUpdated: Date last updated if shown (format: "DD MMM YYYY")
- available: Available credit if shown (number only)

Return ONLY valid JSON in this exact format:
{
  "entries": [
    {
      "name": "string",
      "type": "credit_card" | "loan" | "mortgage",
      "lender": "string",
      "balance": number,
      "creditLimit": number or null,
      "monthlyPayment": number or null,
      "originalBorrowed": number or null,
      "lastUpdated": "string" or null,
      "available": number or null
    }
  ],
  "summary": {
    "totalCreditCards": number,
    "totalLoans": number,
    "totalMortgages": number,
    "totalDebt": number,
    "totalCreditLimit": number
  }
}

Be thorough - extract ALL accounts shown in the image. Credit cards have credit limits, loans have borrowed amounts, mortgages are for property.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              },
              {
                type: "text",
                text: "Analyze this credit report and extract all credit accounts. Return the structured JSON data."
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON from the response
    let analysisResult: AnalysisResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : content.trim();
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse credit report data");
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error analyzing credit report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

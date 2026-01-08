import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, fileName } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting contract info from: ${fileName || 'text input'}`);

    const systemPrompt = `You are an expert at extracting key information from contracts, agreements, and invoices. 
Extract the following fields from the provided document text. If a field is not found, return null for that field.
Always return amounts in GBP (£). If the document uses a different currency, note this in the notes field.`;

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
          { role: "user", content: `Extract key contract information from this document:\n\n${text}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_contract_info",
              description: "Extract structured information from a contract or invoice",
              parameters: {
                type: "object",
                properties: {
                  provider: { 
                    type: "string", 
                    description: "The company or provider name (e.g., Aviva, EE, British Gas)" 
                  },
                  name: { 
                    type: "string", 
                    description: "A descriptive name for this contract (e.g., 'Car Insurance', 'Mobile Phone Plan')" 
                  },
                  total_cost: { 
                    type: "number", 
                    description: "The total cost of the agreement in GBP (annual or full contract value)" 
                  },
                  monthly_amount: { 
                    type: "number", 
                    description: "Monthly payment amount in GBP, or calculated from annual/total if paid monthly" 
                  },
                  is_monthly_payment: { 
                    type: "boolean", 
                    description: "True if payments are made monthly, false if one-off/annual" 
                  },
                  agreement_start: { 
                    type: "string", 
                    description: "Start date in YYYY-MM-DD format" 
                  },
                  agreement_end: { 
                    type: "string", 
                    description: "End date in YYYY-MM-DD format" 
                  },
                  notes: { 
                    type: "string", 
                    description: "Any other relevant details like policy numbers, key terms, excess amounts" 
                  }
                },
                required: ["name"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_contract_info" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to extract contract information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_contract_info") {
      console.error("No valid tool call in response");
      return new Response(
        JSON.stringify({ error: "Could not extract information from document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedInfo = JSON.parse(toolCall.function.arguments);
    console.log("Extracted info:", extractedInfo);

    return new Response(
      JSON.stringify({ data: extractedInfo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-contract:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.email);

    const body = await req.json();
    const { fileBase64, fileName, mimeType } = body;
    
    console.log("Received extraction request:", { fileName, mimeType, hasBase64: !!fileBase64, base64Length: fileBase64?.length });
    
    if (!fileBase64) {
      console.error("No file provided in request");
      return new Response(
        JSON.stringify({ error: "No file provided" }),
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

    console.log(`Extracting expense info from file: ${fileName}, type: ${mimeType}`);

    // For images, use vision capabilities with a simpler approach
    const isImage = mimeType?.startsWith('image/');
    const isPdf = mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
    
    console.log(`File type detection: isImage=${isImage}, isPdf=${isPdf}`);

    // Build the request for image/document analysis
    const systemPrompt = `You are an expert at extracting expense and bill information from documents like invoices, bills, contracts, receipts, and screenshots.

Your task is to analyze the provided document and extract expense details. Look for:
- The name or description of the expense/service
- The amount (convert to monthly if annual/quarterly/weekly)
- The type/category of expense

Always return amounts in GBP (£). If you see a currency symbol or amount, convert it.

IMPORTANT: You MUST call the extract_expense_info function with your findings. Even if you cannot find all information, make your best guess based on what you can see.`;

    const userContent: any[] = [];
    
    if (isImage) {
      // For images, send as vision request
      userContent.push({
        type: "text",
        text: `Analyze this document image and extract the expense information. Look for the business/service name, payment amount, and what type of expense it is. Call the extract_expense_info function with your findings.

Document filename: ${fileName}`
      });
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`
        }
      });
    } else if (isPdf) {
      // For PDFs, also try vision approach (Gemini can handle PDFs as images)
      userContent.push({
        type: "text",
        text: `Analyze this PDF document and extract the expense information. Look for the business/service name, payment amount, and what type of expense it is. Call the extract_expense_info function with your findings.

Document filename: ${fileName}`
      });
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:application/pdf;base64,${fileBase64}`
        }
      });
    } else {
      // For text files, try to decode
      let textContent = "";
      try {
        const binaryString = atob(fileBase64);
        // Check if it's readable text
        const isReadable = /^[\x20-\x7E\s]+$/.test(binaryString.substring(0, 100));
        if (isReadable) {
          textContent = binaryString;
        } else {
          textContent = `[Binary file: ${fileName}] - Cannot extract text directly`;
        }
      } catch (e) {
        textContent = `[File: ${fileName}] - Could not decode content`;
      }

      userContent.push({
        type: "text",
        text: `Extract expense information from this document content:

Filename: ${fileName}

Content:
${textContent.substring(0, 10000)}

Call the extract_expense_info function with the expense details you find.`
      });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ];

    console.log("Sending request to AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_expense_info",
              description: "Extract structured expense information from a document. Call this function with the expense details found in the document.",
              parameters: {
                type: "object",
                properties: {
                  name: { 
                    type: "string", 
                    description: "A descriptive name for this expense (e.g., 'Netflix Subscription', 'Electric Bill', 'Car Insurance'). Use the business/provider name if visible." 
                  },
                  monthly_amount: { 
                    type: "number", 
                    description: "Monthly amount in GBP. If the document shows annual amount, divide by 12. If quarterly, divide by 3. If weekly, multiply by 4.33." 
                  },
                  category: { 
                    type: "string", 
                    enum: ["housing", "utilities", "groceries", "transport", "insurance", "subscriptions", "entertainment", "health", "other"],
                    description: "The most appropriate category for this expense" 
                  },
                  provider: {
                    type: "string",
                    description: "The company or provider name if identifiable"
                  },
                  notes: { 
                    type: "string", 
                    description: "Any other relevant details like account numbers, reference numbers, or key terms" 
                  }
                },
                required: ["name", "monthly_amount", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_expense_info" } }
      }),
    });

    console.log("AI gateway response status:", response.status);

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
        JSON.stringify({ error: "Failed to extract expense information. The AI service returned an error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("No tool call in response. Message content:", message?.content);
      
      // Try to parse from content if tool call failed
      if (message?.content) {
        // Maybe the model returned JSON in content instead
        try {
          const parsed = JSON.parse(message.content);
          if (parsed.name && parsed.monthly_amount) {
            console.log("Parsed from content:", parsed);
            return new Response(
              JSON.stringify({ data: parsed }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          // Not JSON
        }
      }
      
      return new Response(
        JSON.stringify({ error: "Could not extract information from document. Please try a clearer image or enter details manually." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (toolCall.function.name !== "extract_expense_info") {
      console.error("Unexpected function call:", toolCall.function.name);
      return new Response(
        JSON.stringify({ error: "Unexpected response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedInfo;
    try {
      extractedInfo = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Failed to parse extraction results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted expense info:", extractedInfo);

    return new Response(
      JSON.stringify({ data: extractedInfo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-expense:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

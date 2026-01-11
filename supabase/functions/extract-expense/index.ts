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
    const { fileBase64, fileName, mimeType } = await req.json();
    
    if (!fileBase64) {
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

    const systemPrompt = `You are an expert at extracting expense information from documents like invoices, bills, contracts, and receipts.
Extract the following fields from the provided document. If a field is not found, return null for that field.
Always return amounts in GBP (£). Convert from other currencies if needed.

Categories available: housing, utilities, groceries, transport, insurance, subscriptions, entertainment, health, other`;

    // Build messages based on file type
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // For images, use vision capabilities
    if (mimeType?.startsWith('image/')) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract expense information from this document image. Look for the expense name, monthly amount, and category."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${fileBase64}`
            }
          }
        ]
      });
    } else {
      // For PDFs and other documents, decode and send as text
      // Note: For PDF parsing, we rely on the AI's ability to understand base64-encoded content
      // or we can try to extract text if it's a text-based file
      let textContent = "";
      
      try {
        // Try to decode as text (works for .txt files)
        const binaryString = atob(fileBase64);
        textContent = binaryString;
      } catch (e) {
        // If it fails, it's likely a binary file like PDF
        // Send as base64 with instructions
        textContent = `[Document: ${fileName}]\nThis is a base64-encoded document. Please analyze the following encoded content and extract expense information:\n${fileBase64.substring(0, 5000)}...`;
      }

      // For PDFs and complex docs, use vision with the PDF converted to image data
      if (mimeType === 'application/pdf' || fileName?.endsWith('.pdf')) {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract expense information from this PDF document (${fileName}). Look for the expense name/description, monthly or regular payment amount, and appropriate category.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || 'application/pdf'};base64,${fileBase64}`
              }
            }
          ]
        });
      } else {
        messages.push({
          role: "user",
          content: `Extract expense information from this document:\n\nFile: ${fileName}\n\n${textContent}`
        });
      }
    }

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
              description: "Extract structured expense information from a document",
              parameters: {
                type: "object",
                properties: {
                  name: { 
                    type: "string", 
                    description: "A descriptive name for this expense (e.g., 'Netflix Subscription', 'Electric Bill', 'Car Insurance')" 
                  },
                  monthly_amount: { 
                    type: "number", 
                    description: "Monthly amount in GBP. If the document shows annual/quarterly/weekly amounts, calculate the monthly equivalent." 
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
        JSON.stringify({ error: "Failed to extract expense information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_expense_info") {
      console.error("No valid tool call in response");
      return new Response(
        JSON.stringify({ error: "Could not extract information from document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedInfo = JSON.parse(toolCall.function.arguments);
    console.log("Extracted expense info:", extractedInfo);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WATSONX_URL = "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";

// Cache for IAM token (MUST be outside the function)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get IAM access token from IBM Cloud API Key
 */
async function getIAMToken(apiKey: string): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    console.log("Using cached IAM token");
    return cachedToken;
  }

  console.log("Requesting new IAM token...");
  
  const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("IAM token request failed:", response.status, errorText);
    throw new Error(`Failed to get IAM token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  
  // Set expiry to 5 minutes before actual expiry (tokens typically last 1 hour)
  tokenExpiry = now + (data.expires_in - 300) * 1000;
  
  console.log("Successfully obtained IAM token");
  return cachedToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileType } = await req.json();
    
    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'No file data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables FIRST
    const MY_GRANITE_KEY = Deno.env.get('MY_GRANITE_KEY');
    const WATSONX_PROJECT_ID = Deno.env.get("WATSONX_PROJECT_ID") || "362737bc-a8b8-4834-bc75-523652f8cac8";

    if (!MY_GRANITE_KEY) {
      throw new Error('MY_GRANITE_KEY is not configured');
    }

    console.log('Extracting text from document using WatsonX');

    // Get IAM token AFTER getting the API key
    let iamToken: string;
    try {
      iamToken = await getIAMToken(MY_GRANITE_KEY);
    } catch (error) {
      console.error("Failed to obtain IAM token:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to authenticate with IBM Cloud",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(WATSONX_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${iamToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are an OCR text extraction tool. Your ONLY job is to transcribe the text from this image exactly as it appears, character by character, line by line. DO NOT interpret, summarize, or structure the text. DO NOT extract specific fields. DO NOT organize information. Simply copy the text exactly as you see it on the document, preserving the original layout, spacing, and formatting. Return the raw text verbatim.'},
              {
                type: 'image_url',
                image_url: {
                  url: fileData
                }
              }
            ]
          }
        ],
        project_id: WATSONX_PROJECT_ID,
        model_id: 'meta-llama/llama-3-2-11b-vision-instruct',
        temperature: 0.3,
        max_tokens: 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WatsonX API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401 || response.status === 403) {
        // Clear token cache
        cachedToken = null;
        tokenExpiry = 0;

        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed. Please check your MY_GRANITE_KEY.',
            details: errorText
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: 'Bad request to WatsonX API. Check project_id and model_id.',
            details: errorText
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Failed to extract text: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      console.error("No content in response:", data);
      return new Response(
        JSON.stringify({ error: 'No text could be extracted from the document' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted text from document');

    return new Response(
      JSON.stringify({ extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-text-from-document function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  SYSTEM_PROMPT,
  getPersonalizationInstructions,
  getSectionGuidelines,
  getLanguageSpecificGuidelines,
  SAFETY_RULES,
  type PatientProfile,
} from "./prompts.ts";
import {
  validateDocument,
  formatValidationErrors,
  type PatientDocument,
} from "./validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_TECHNICAL_NOTE_LENGTH = 50000;
const MAX_RETRIES = 1;

const WATSONX_URL =
  "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";

// Cache for IAM token
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technicalNote, patientData } = await req.json();
    
    // Use your existing MY_GRANITE_KEY from Supabase secrets
    const MY_GRANITE_KEY = Deno.env.get("MY_GRANITE_KEY");
    const WATSONX_PROJECT_ID = Deno.env.get("WATSONX_PROJECT_ID");

    if (!MY_GRANITE_KEY) {
      throw new Error("MY_GRANITE_KEY is not configured");
    }

    console.log("Starting patient document generation...");
    console.log("Project ID:", WATSONX_PROJECT_ID);

    if (technicalNote.length > MAX_TECHNICAL_NOTE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `Technical note is too long (${technicalNote.length} characters). Maximum allowed is ${MAX_TECHNICAL_NOTE_LENGTH} characters.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const patientProfile: PatientProfile = {
      age: patientData.age || 65,
      sex: patientData.sex || "other",
      healthLiteracy: patientData.healthLiteracy || "medium",
      language: patientData.language || "english",
      journeyType: patientData.journeyType,
      mentalState: patientData.mentalState,
      comorbidities: patientData.comorbidities,
      smokingStatus: patientData.smokingStatus,
      riskAppetite: patientData.riskAppetite || "moderate",
    };

    const basePrompt = `${SYSTEM_PROMPT}

Generate a patient-friendly medical communication document.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON
- No markdown, no code blocks, no backticks
- No explanations before or after the JSON
- No extra keys beyond the 7 required sections
- All 7 sections MUST be present
- Each section must be at least 50 characters

REQUIRED JSON STRUCTURE (copy this exactly):
{
  "section_1_what_i_have": "string content here",
  "section_2_how_to_live": "string content here",
  "section_3_timeline": "string content here",
  "section_4_life_impact": "string content here",
  "section_5_medications": "string content here",
  "section_6_warnings": "string content here (MUST include emergency number 112)",
  "section_7_contacts": "string content here"
}

TECHNICAL CLINICAL NOTE:
${technicalNote}

PATIENT PROFILE:
- Age: ${patientProfile.age}
- Sex: ${patientProfile.sex}
- Health Literacy: ${patientProfile.healthLiteracy}
- Language: ${patientProfile.language}
- Journey Type: ${patientProfile.journeyType || "Not specified"}
- Mental State: ${patientProfile.mentalState || "Not specified"}
- Comorbidities: ${patientProfile.comorbidities || "None"}
- Smoking Status: ${patientProfile.smokingStatus || "Not specified"}
- Information Preference: ${patientProfile.riskAppetite}

${getPersonalizationInstructions(patientProfile)}

${getSectionGuidelines(patientProfile.language)}

${getLanguageSpecificGuidelines(patientProfile.language)}

${SAFETY_RULES}

Now generate the complete JSON document following the structure above. Return ONLY the JSON object, nothing else.`;

    // Get IAM token from your MY_GRANITE_KEY
    let iamToken: string;
    try {
      iamToken = await getIAMToken(MY_GRANITE_KEY);
    } catch (error) {
      console.error("Failed to obtain IAM token:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to authenticate with IBM Cloud. Please check your MY_GRANITE_KEY.",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let attempts = 0;
    let lastError = "";

    while (attempts <= MAX_RETRIES) {
      attempts++;
      console.log(`Generation attempt ${attempts}/${MAX_RETRIES + 1}`);

      let finalPrompt = basePrompt;

      if (attempts > 1 && lastError) {
        finalPrompt = `PREVIOUS ATTEMPT FAILED WITH: ${lastError}

CRITICAL REQUIREMENTS FOR THIS RETRY:
- ALL 7 sections MUST be present and substantive (minimum 50 characters each)
- Section 6 (Warning Signs) MUST include emergency number 112
- Never use phrases like "I don't know" - use "Your doctor will provide this information"
- Return ONLY valid JSON, no markdown, no explanations

${basePrompt}`;
      }

      const requestBody = {
        messages: [
          { role: "user", content: finalPrompt },
        ],
        project_id: WATSONX_PROJECT_ID,
        model_id: "ibm/granite-4-h-small",
        temperature: 0.4,
        max_tokens: 6000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      console.log("Sending request to WatsonX...");

      const response = await fetch(WATSONX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${iamToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WatsonX API error details:");
        console.error("Status:", response.status);
        console.error("Response body:", errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { 
              status: 429, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        if (response.status === 401 || response.status === 403) {
          // Token might have expired, clear cache
          cachedToken = null;
          tokenExpiry = 0;
          
          return new Response(
            JSON.stringify({
              error: "Authentication failed. Please check your MY_GRANITE_KEY and project permissions.",
              details: errorText
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        if (response.status === 400) {
          return new Response(
            JSON.stringify({
              error: "Bad request to WatsonX API. Check project_id and model_id.",
              details: errorText
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        throw new Error(`WatsonX API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log("Received response from WatsonX");

      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in response. Full response:", JSON.stringify(data, null, 2));
        throw new Error("No content received from AI");
      }

      console.log("Raw content received (first 200 chars):", content.substring(0, 200));

      let cleanedContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      cleanedContent = cleanedContent.trim();

      let document: PatientDocument;

      try {
        document = JSON.parse(cleanedContent);
        console.log("Successfully parsed JSON");
      } catch (e) {
        console.error("JSON parse error:", e);
        console.error("Content that failed to parse:", cleanedContent);
        
        lastError = "Model returned invalid JSON";
        
        if (attempts > MAX_RETRIES) {
          return new Response(
            JSON.stringify({ 
              error: "AI returned invalid JSON after retries",
              rawContent: cleanedContent.substring(0, 500)
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        continue;
      }

      console.log("Validating document...");
      const validationResult = validateDocument(
        document,
        patientProfile.language
      );

      if (validationResult.passed) {
        console.log("Validation passed!");
        return new Response(
          JSON.stringify({
            document,
            model: "ibm/granite-4-h-small",
            validation: {
              passed: true,
              warnings: validationResult.warnings,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastError = formatValidationErrors(validationResult);
      console.error(`Validation failed (attempt ${attempts}):`, lastError);

      if (attempts > MAX_RETRIES) {
        return new Response(
          JSON.stringify({
            error: "AI generation incomplete after retries. Please regenerate.",
            validationErrors: validationResult.errors,
            validationWarnings: validationResult.warnings,
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      console.log("Retrying generation...");
    }

    throw new Error("Unexpected retry loop exit");
  } catch (error) {
    console.error("Error in generate-patient-document-v2:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
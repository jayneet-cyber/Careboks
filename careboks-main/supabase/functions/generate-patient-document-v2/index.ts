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
  type PatientDocument 
} from "./validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TECHNICAL_NOTE_LENGTH = 50000; // ~50K characters
const MAX_RETRIES = 1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technicalNote, patientData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate input length
    if (technicalNote.length > MAX_TECHNICAL_NOTE_LENGTH) {
      return new Response(
        JSON.stringify({ 
          error: `Technical note is too long (${technicalNote.length} characters). Maximum allowed is ${MAX_TECHNICAL_NOTE_LENGTH} characters. Please summarize the note.` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating patient document v2 for:", { 
      language: patientData.language, 
      literacy: patientData.healthLiteracy,
      noteLength: technicalNote.length 
    });

    // Build patient profile
    const patientProfile: PatientProfile = {
      age: patientData.age || 65,
      sex: patientData.sex || 'other',
      healthLiteracy: patientData.healthLiteracy || 'medium',
      language: patientData.language || 'english',
      journeyType: patientData.journeyType,
      mentalState: patientData.mentalState,
      comorbidities: patientData.comorbidities,
      smokingStatus: patientData.smokingStatus,
      riskAppetite: patientData.riskAppetite || 'moderate',
    };

    // Build comprehensive single-stage prompt
    const userPrompt = `Generate a patient-friendly medical communication document based on the following:

TECHNICAL CLINICAL NOTE:
${technicalNote}

PATIENT PROFILE:
- Age: ${patientProfile.age}
- Sex: ${patientProfile.sex}
- Health Literacy: ${patientProfile.healthLiteracy}
- Language: ${patientProfile.language}
- Journey Type: ${patientProfile.journeyType || 'Not specified'}
- Mental State: ${patientProfile.mentalState || 'Not specified'}
- Comorbidities: ${patientProfile.comorbidities || 'None'}
- Smoking Status: ${patientProfile.smokingStatus || 'Not specified'}
- Information Preference: ${patientProfile.riskAppetite}

${getPersonalizationInstructions(patientProfile)}

${getSectionGuidelines(patientProfile.language)}

${getLanguageSpecificGuidelines(patientProfile.language)}

${SAFETY_RULES}

Generate the complete patient communication document in ${patientProfile.language} language with all 7 sections. Use the structured output tool to ensure all sections are properly formatted.`;

    let attempts = 0;
    let lastError = '';

    while (attempts <= MAX_RETRIES) {
      attempts++;
      
      // Add retry-specific guidance if this is a retry
      let finalPrompt = userPrompt;
      if (attempts > 1 && lastError) {
        finalPrompt = `PREVIOUS ATTEMPT FAILED WITH: ${lastError}

CRITICAL REQUIREMENTS FOR THIS RETRY:
- ALL 7 sections MUST be present and substantive (minimum 50 characters each)
- Section 6 (Warning Signs) MUST include emergency number 112
- Never use phrases like "I don't know" - use "Your doctor will provide this information"
- If medication details are missing, state "Your doctor will provide specific medication instructions"
- If contacts are incomplete, state "Your care team will provide contact information"

${userPrompt}`;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: finalPrompt }
          ],
          temperature: 0.4,
          max_tokens: 6000,
          tools: [
            {
              type: "function",
              function: {
                name: "generate_patient_document",
                description: "Generate a patient-friendly medical communication document with exactly 7 sections",
                parameters: {
                  type: "object",
                  properties: {
                    section_1_what_i_have: {
                      type: "string",
                      description: "Plain-language explanation of the diagnosis and condition"
                    },
                    section_2_how_to_live: {
                      type: "string",
                      description: "Practical daily lifestyle instructions and changes"
                    },
                    section_3_timeline: {
                      type: "string",
                      description: "What to expect over the next 6 months"
                    },
                    section_4_life_impact: {
                      type: "string",
                      description: "Long-term implications and what patient can/must do"
                    },
                    section_5_medications: {
                      type: "string",
                      description: "List of medications with explanations"
                    },
                    section_6_warnings: {
                      type: "string",
                      description: "Warning signs and when to seek emergency help (MUST include 112)"
                    },
                    section_7_contacts: {
                      type: "string",
                      description: "Contact information for healthcare team"
                    }
                  },
                  required: [
                    "section_1_what_i_have",
                    "section_2_how_to_live",
                    "section_3_timeline",
                    "section_4_life_impact",
                    "section_5_medications",
                    "section_6_warnings",
                    "section_7_contacts"
                  ],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "generate_patient_document" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        throw new Error("No structured output received from AI");
      }

      const document: PatientDocument = JSON.parse(toolCall.function.arguments);

      console.log("Document generated, validating...");

      // VALIDATE THE DOCUMENT
      const validationResult = validateDocument(document, patientProfile.language);

      if (validationResult.passed) {
        console.log("Validation passed!");
        if (validationResult.warnings.length > 0) {
          console.warn("Validation warnings:", validationResult.warnings);
        }

        return new Response(JSON.stringify({ 
          document,
          model: "google/gemini-2.5-flash",
          validation: {
            passed: true,
            warnings: validationResult.warnings
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Validation failed
        const errorMessage = formatValidationErrors(validationResult);
        console.error(`Validation failed (attempt ${attempts}/${MAX_RETRIES + 1}):`, errorMessage);
        
        lastError = errorMessage;

        if (attempts > MAX_RETRIES) {
          // Out of retries, return error
          return new Response(
            JSON.stringify({ 
              error: "AI generation incomplete after retries. Please regenerate.",
              validationErrors: validationResult.errors,
              validationWarnings: validationResult.warnings
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Continue to retry
        console.log(`Retrying generation (attempt ${attempts + 1}/${MAX_RETRIES + 1})...`);
      }
    }

    // Should not reach here
    throw new Error("Unexpected exit from retry loop");

  } catch (error) {
    console.error("Error in generate-patient-document-v2:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

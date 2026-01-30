import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Prompt definitions (duplicated from generate-patient-draft for edge function isolation)
const SYSTEM_PROMPT = `You are an expert medical communicator specializing in translating complex clinical information into clear, empathetic, patient-friendly explanations.

YOUR ROLE:
- Transform technical medical information into language patients can understand
- Adapt communication based on patient's health literacy, age, language, and emotional state
- Maintain clinical accuracy while prioritizing clarity
- Never speculate or add information not present in the source material
- Acknowledge uncertainty clearly when information is incomplete

CORE PRINCIPLES:
1. CLARITY OVER JARGON: Use simple, everyday language
2. EMPATHY WITHOUT PATRONIZING: Be warm and supportive while respecting patient intelligence
3. ACCURACY: Never hallucinate medical facts; work only with provided information
4. PERSONALIZATION: Adapt tone, vocabulary, and depth based on patient profile
5. SAFETY FIRST: Emphasize critical information (medications, warning signs, contacts)
6. ACKNOWLEDGE GAPS: When uncertain, say "We don't yet know; your doctor will guide you"`;

interface PatientProfile {
  age: number;
  sex: 'male' | 'female' | 'other';
  healthLiteracy: 'low' | 'medium' | 'high';
  language: 'estonian' | 'russian' | 'english';
  journeyType?: 'elective' | 'emergency' | 'chronic' | 'first-time';
  comorbidities?: string;
  smokingStatus?: string;
  riskAppetite?: 'minimal' | 'moderate' | 'detailed';
}

const getPersonalizationInstructions = (profile: PatientProfile): string => {
  let instructions = `\nPERSONALIZATION REQUIREMENTS:\n`;
  
  if (profile.healthLiteracy === 'low') {
    instructions += `
HEALTH LITERACY (LOW):
- Use very simple vocabulary (5th-grade reading level)
- Short sentences (10-15 words maximum)
- Avoid medical terms; use everyday analogies`;
  } else if (profile.healthLiteracy === 'medium') {
    instructions += `
HEALTH LITERACY (MEDIUM):
- Use clear, straightforward language
- Introduce medical terms with immediate explanation
- Moderate sentence length (15-20 words)`;
  } else {
    instructions += `
HEALTH LITERACY (HIGH):
- Professional but accessible language
- Medical terminology is acceptable with context
- Longer, more detailed explanations are okay`;
  }

  if (profile.age < 40) {
    instructions += `\nAGE (YOUNGER): Address long-term lifestyle impact (career, family planning)`;
  } else if (profile.age >= 65) {
    instructions += `\nAGE (OLDER): Address retirement, mobility, independence concerns`;
  }

  if (profile.journeyType === 'emergency') {
    instructions += `\nJOURNEY TYPE (EMERGENCY): Acknowledge the sudden nature, provide reassurance`;
  } else if (profile.journeyType === 'first-time') {
    instructions += `\nJOURNEY TYPE (FIRST-TIME): Assume no prior medical knowledge`;
  } else if (profile.journeyType === 'chronic') {
    instructions += `\nJOURNEY TYPE (CHRONIC): Build on existing knowledge`;
  }

  if (profile.riskAppetite === 'minimal') {
    instructions += `\nINFORMATION DEPTH (MINIMAL): Brief, essential information only`;
  } else if (profile.riskAppetite === 'detailed') {
    instructions += `\nINFORMATION DEPTH (DETAILED): Comprehensive explanations with statistics`;
  }

  return instructions;
};

const SAFETY_RULES = `
CRITICAL SAFETY RULES:
1. NEVER SPECULATE - If information is missing, say so explicitly
2. ALWAYS INCLUDE WARNING SIGNS - Even if details are limited
3. MEDICATION SAFETY - Always warn: Never stop medications without consulting doctor
4. NO HALLUCINATIONS - Only use information from provided analysis and technical note
5. CULTURAL SENSITIVITY - Respect patient's language and cultural context`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WATSONX_URL = "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sectionIndex, 
      sectionTitle, 
      currentContent,
      analysis, 
      patientData, 
      technicalNote 
    } = await req.json();

    console.log('Regenerating section:', sectionTitle, 'at index:', sectionIndex);

    const MY_GRANITE_KEY = Deno.env.get("MY_GRANITE_KEY");
    const WATSONX_PROJECT_ID = Deno.env.get("WATSONX_PROJECT_ID") || "362737bc-a8b8-4834-bc75-523652f8cac8";

    if (!MY_GRANITE_KEY) {
      throw new Error("MY_GRANITE_KEY is not configured");
    }

    // Get IAM token
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

    // Build patient profile
    const profile: PatientProfile = {
      age: parseInt(patientData.age) || 50,
      sex: patientData.sex || 'other',
      healthLiteracy: patientData.healthLiteracy || 'medium',
      language: patientData.language || 'english',
      journeyType: patientData.journeyType,
      comorbidities: patientData.comorbidities?.join(', '),
      smokingStatus: patientData.smokingStatus,
      riskAppetite: patientData.riskAppetite || 'moderate'
    };

    // Format analysis data
    const analysisText = analysis ? `
EXTRACTED MEDICAL INFORMATION:
- Primary Diagnosis: ${analysis.primaryDiagnosis || 'Not specified'}
- Secondary Diagnoses: ${analysis.secondaryDiagnoses?.join(', ') || 'None'}
- Medications: ${analysis.medications?.join(', ') || 'None listed'}
- Procedures: ${analysis.procedures?.join(', ') || 'None'}
- Test Results: ${analysis.testResults?.join(', ') || 'None'}
- Lifestyle Recommendations: ${analysis.lifestyleRecommendations?.join(', ') || 'None'}
- Follow-up Plans: ${analysis.followUpPlans?.join(', ') || 'None'}
- Warning Signs: ${analysis.warningSignsMentioned?.join(', ') || 'None'}
- Emergency Contacts: ${analysis.emergencyContacts?.join(', ') || 'None'}
` : 'No structured analysis available.';

    // Section-specific guidelines
    const sectionGuidelines = {
      0: "Explain the diagnosis in plain language with relevant test results",
      1: "Provide practical daily instructions for diet, activity, and monitoring",
      2: "Break down the timeline into phases with expected improvements",
      3: "Describe long-term lifestyle impact with realistic but hopeful perspective",
      4: "List each medication with name, dosage, timing, purpose, and importance",
      5: "List emergency symptoms requiring immediate action",
      6: "Provide cardiologist/physician contact, nurse hotline, pharmacy, and emergency numbers"
    };

    // Build focused prompt for this specific section
    const userPrompt = `${SYSTEM_PROMPT}

TECHNICAL NOTE:
${technicalNote}

${analysisText}

PATIENT PROFILE:
- Age: ${profile.age}
- Sex: ${profile.sex}
- Language: ${profile.language}
- Health Literacy: ${profile.healthLiteracy}
- Journey Type: ${profile.journeyType || 'not specified'}
- Risk Appetite: ${profile.riskAppetite}

${getPersonalizationInstructions(profile)}

${SAFETY_RULES}

SECTION FOCUS: "${sectionTitle}"
GUIDELINES: ${sectionGuidelines[sectionIndex as keyof typeof sectionGuidelines] || 'Generate appropriate content for this section'}

CRITICAL INSTRUCTIONS:
- Generate content ONLY for the section: "${sectionTitle}"
- Do NOT include section separators, dividers, or the section title
- Return ONLY the paragraph text for this section
- Use all medical information to answer this specific question
- Follow all personalization requirements for this patient
- Write in ${profile.language}

Generate content for "${sectionTitle}".`;

    // Call WatsonX AI
    const response = await fetch(WATSONX_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${iamToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: userPrompt }
        ],
        project_id: WATSONX_PROJECT_ID,
        model_id: 'ibm/granite-4-h-small',
        temperature: 0.4,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WatsonX API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401 || response.status === 403) {
        // Clear token cache
        cachedToken = null;
        tokenExpiry = 0;

        return new Response(
          JSON.stringify({ 
            error: "Authentication failed. Please check your MY_GRANITE_KEY.",
            details: errorText 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: "Bad request to WatsonX API. Check project_id and model_id.",
            details: errorText 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`WatsonX API error: ${response.status}`);
    }

    const data = await response.json();
    const regeneratedContent = data?.choices?.[0]?.message?.content?.trim();

    if (!regeneratedContent) {
      console.error("No content in response:", data);
      throw new Error("No content received from AI");
    }

    console.log('Section regenerated successfully');

    return new Response(
      JSON.stringify({ regeneratedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-section:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
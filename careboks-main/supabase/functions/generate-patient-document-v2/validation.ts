/**
 * Validation Layer for Patient Documents
 * 
 * Checks generated documents for quality, completeness, and safety
 * before returning to frontend.
 */

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface PatientDocument {
  section_1_what_i_have: string;
  section_2_how_to_live: string;
  section_3_timeline: string;
  section_4_life_impact: string;
  section_5_medications: string;
  section_6_warnings: string;
  section_7_contacts: string;
}

const MIN_SECTION_LENGTH = 50;

export const validateDocument = (
  doc: PatientDocument,
  language: string
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. STRUCTURAL VALIDATION
  const requiredSections = [
    'section_1_what_i_have',
    'section_2_how_to_live',
    'section_3_timeline',
    'section_4_life_impact',
    'section_5_medications',
    'section_6_warnings',
    'section_7_contacts'
  ];

  for (const section of requiredSections) {
    const content = doc[section as keyof PatientDocument];
    
    if (!content || content.trim().length === 0) {
      errors.push(`Missing section: ${section}`);
    } else if (content.trim().length < MIN_SECTION_LENGTH) {
      errors.push(`Section too short: ${section} (${content.trim().length} chars, minimum ${MIN_SECTION_LENGTH})`);
    }
  }

  // 2. CONTENT VALIDATION

  // Section 5: Medications must contain medication info OR explicit statement
  const medicationsSection = doc.section_5_medications?.toLowerCase() || '';
  const hasMedications = 
    /medication|medicine|drug|tablet|pill|mg|dose/.test(medicationsSection) ||
    /no medication|not prescribed|your doctor will provide/.test(medicationsSection);
  
  if (!hasMedications && medicationsSection.length > 0) {
    warnings.push('Medications section may be incomplete - no medications or explicit statement found');
  }

  // Section 6: Warning signs must contain emergency info
  const warningsSection = doc.section_6_warnings?.toLowerCase() || '';
  const hasEmergencyInfo = 
    /112|emergency|ambulance|immediate/.test(warningsSection);
  
  if (!hasEmergencyInfo) {
    errors.push('Warning signs section MUST include emergency number (112) and when to call');
  }

  // Section 7: Contacts should have at least some contact method
  const contactsSection = doc.section_7_contacts?.toLowerCase() || '';
  const hasContactInfo = 
    /phone|email|contact|appointment|clinic|hospital|doctor/.test(contactsSection) ||
    /your care team will provide/.test(contactsSection);
  
  if (!hasContactInfo) {
    warnings.push('Contacts section may be incomplete - no contact methods or statement found');
  }

  // 3. SAFETY VALIDATION

  // Check for AI uncertainty phrases (should use proper fallback language instead)
  const allContent = Object.values(doc).join(' ').toLowerCase();
  
  const uncertaintyPhrases = [
    "i don't know",
    "i'm not sure",
    "unclear from notes",
    "consult doctor for diagnosis",
    "cannot determine",
    "information not available"
  ];

  for (const phrase of uncertaintyPhrases) {
    if (allContent.includes(phrase)) {
      errors.push(`Improper uncertainty language detected: "${phrase}". Should use "Your doctor will provide this information" instead.`);
    }
  }

  // Check for "N/A" or "Not applicable" sections (AI gave up)
  for (const [key, value] of Object.entries(doc)) {
    const content = value.toLowerCase().trim();
    if (content === 'n/a' || content === 'not applicable' || content === 'none') {
      errors.push(`Section ${key} contains only "${value}" - this is not acceptable`);
    }
  }

  // Check for suspicious medication dosages
  const suspiciousDosages = [
    /\d{4,}\s*mg/i,  // 1000+ mg (usually too high)
    /\d+\s*g(?!\s*\w)/i  // Doses in grams (unusual, usually mg)
  ];

  for (const pattern of suspiciousDosages) {
    if (pattern.test(medicationsSection)) {
      warnings.push('Potentially suspicious medication dosage detected - please review');
    }
  }

  // 4. LANGUAGE VALIDATION
  // Basic check: if language is not English, document should contain non-ASCII characters
  if (language !== 'english') {
    const hasNonASCII = /[^\x00-\x7F]/.test(allContent);
    if (!hasNonASCII) {
      errors.push(`Language set to ${language} but document appears to be in English`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
};

export const formatValidationErrors = (result: ValidationResult): string => {
  let message = '';
  
  if (result.errors.length > 0) {
    message += 'VALIDATION ERRORS:\n';
    result.errors.forEach((err, i) => {
      message += `${i + 1}. ${err}\n`;
    });
  }
  
  if (result.warnings.length > 0) {
    message += '\nVALIDATION WARNINGS:\n';
    result.warnings.forEach((warn, i) => {
      message += `${i + 1}. ${warn}\n`;
    });
  }
  
  return message;
};

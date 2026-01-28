/**
 * @fileoverview Structured Document Parser
 * 
 * Converts structured JSON output from the v2 AI generation pipeline
 * into the section format used by the ClinicianApproval component.
 * 
 * Handles multi-language section titles (Estonian, Russian, English)
 * and provides conversion back to formatted text for storage/printing.
 * 
 * @module utils/structuredDocumentParser
 */

/**
 * Structured document output from AI generation
 * Each section contains the personalized patient communication
 */
export interface StructuredDocument {
  /** Explanation of the patient's condition */
  section_1_what_i_have: string;
  /** Lifestyle changes and recommendations */
  section_2_how_to_live: string;
  /** Short-term (6 month) prognosis and expectations */
  section_3_timeline: string;
  /** Long-term life impact and consequences */
  section_4_life_impact: string;
  /** Medication list with explanations */
  section_5_medications: string;
  /** Warning signs requiring medical attention */
  section_6_warnings: string;
  /** Healthcare team contact information */
  section_7_contacts: string;
}

/**
 * Generic section structure for component rendering
 */
export interface Section {
  /** Localized section title */
  title: string;
  /** Section content */
  content: string;
}

/**
 * Supported languages for section titles
 */
type SupportedLanguage = 'estonian' | 'russian' | 'english';

/**
 * Section titles by language
 * Mapped to the 7 standard sections of the patient document
 */
const SECTION_TITLES: Record<SupportedLanguage, string[]> = {
  estonian: [
    "Mis mul on",
    "Kuidas peaksin edasi elama",
    "Kuidas järgmised 6 kuud välja näevad",
    "Mida see tähendab minu elule",
    "Minu ravimid",
    "Hoiatavad märgid",
    "Minu kontaktid"
  ],
  russian: [
    "Что у меня есть",
    "Как мне жить дальше",
    "Как будут выглядеть следующие 6 месяцев",
    "Что это значит для моей жизни",
    "Мои лекарства",
    "Предупреждающие признаки",
    "Мои контакты"
  ],
  english: [
    "What do I have",
    "How should I live next",
    "How the next 6 months of my life will look like",
    "What does it mean for my life",
    "My medications",
    "Warning signs",
    "My contacts"
  ]
};

/**
 * Parses structured document JSON into section array
 * 
 * Converts the AI-generated JSON structure into an array of sections
 * with localized titles based on the patient's language preference.
 * 
 * @param doc - Structured document from AI generation
 * @param language - Patient's preferred language
 * @returns Array of 7 sections with localized titles
 * 
 * @example
 * ```ts
 * const sections = parseStructuredDocument(aiOutput, 'estonian');
 * // Returns sections with Estonian titles
 * ```
 */
export const parseStructuredDocument = (
  doc: StructuredDocument,
  language: string = 'english'
): Section[] => {
  const normalizedLanguage = language.toLowerCase() as SupportedLanguage;
  const titles = SECTION_TITLES[normalizedLanguage] || SECTION_TITLES.english;

  return [
    { title: titles[0], content: doc.section_1_what_i_have || '' },
    { title: titles[1], content: doc.section_2_how_to_live || '' },
    { title: titles[2], content: doc.section_3_timeline || '' },
    { title: titles[3], content: doc.section_4_life_impact || '' },
    { title: titles[4], content: doc.section_5_medications || '' },
    { title: titles[5], content: doc.section_6_warnings || '' },
    { title: titles[6], content: doc.section_7_contacts || '' }
  ];
};

/**
 * Converts section array back to formatted text
 * 
 * Creates a visually formatted document with separators
 * suitable for storage, display, and printing.
 * 
 * @param sections - Array of sections to format
 * @returns Formatted text with visual separators
 * 
 * @example
 * ```ts
 * const text = structuredDocumentToText(sections);
 * // Returns formatted text ready for printing
 * ```
 */
export const structuredDocumentToText = (sections: Section[]): string => {
  const separator = "═".repeat(47);
  
  return sections.map(section => 
    `${separator}\n${section.title}\n${separator}\n${section.content}`
  ).join('\n\n');
};

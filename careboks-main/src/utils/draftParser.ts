/**
 * @fileoverview Draft Parser Utility
 * 
 * Parses AI-generated patient communication drafts into structured sections
 * and reconstructs them back into formatted text.
 * 
 * The expected format uses visual separators (═══) to delineate sections:
 * 
 * ```
 * ═══════════════════════════════════════════════════
 * Section Title
 * ═══════════════════════════════════════════════════
 * Section content here...
 * ```
 * 
 * @module utils/draftParser
 */

/**
 * Represents a parsed section of the patient communication document
 */
export interface ParsedSection {
  /** Section title (e.g., "What do I have") */
  title: string;
  /** Section content text */
  content: string;
}

/** Visual separator used between sections in formatted output */
const SECTION_SEPARATOR = "═══════════════════════════════════════════════════";

/**
 * Parses a draft string into distinct sections
 * 
 * Splits the document by the visual separator and extracts
 * title (first line) and content (remaining lines) from each part.
 * 
 * @param draft - Raw draft text from AI generation
 * @returns Array of parsed sections with title and content
 * 
 * @example
 * ```ts
 * const sections = parseDraftIntoSections(aiGeneratedDraft);
 * // Returns: [{ title: "What do I have", content: "..." }, ...]
 * ```
 */
export const parseDraftIntoSections = (draft: string): ParsedSection[] => {
  if (!draft || typeof draft !== 'string') {
    return [];
  }

  const sections: ParsedSection[] = [];
  
  // Split by separator and filter empty strings
  const parts = draft.split(SECTION_SEPARATOR).filter(part => part.trim());
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // First line is the title, rest is content
    const lines = trimmed.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    
    if (title) {
      sections.push({ title, content });
    }
  }
  
  return sections;
};

/**
 * Reconstructs formatted text from parsed sections
 * 
 * Converts an array of sections back into the visual format
 * with separators for display and printing.
 * 
 * @param sections - Array of parsed sections
 * @returns Formatted text with visual separators
 * 
 * @example
 * ```ts
 * const formattedText = reconstructDraft(sections);
 * // Returns formatted text ready for printing
 * ```
 */
export const reconstructDraft = (sections: ParsedSection[]): string => {
  return sections
    .map(section => {
      return `${SECTION_SEPARATOR}\n${section.title}\n${SECTION_SEPARATOR}\n${section.content}`;
    })
    .join('\n\n');
};

/**
 * @fileoverview PDF Text Extraction Utility
 * 
 * Extracts text content from PDF documents using pdf.js library.
 * Handles both native text PDFs (direct extraction) and preserves
 * text formatting (bold, italic) when detectable from font metadata.
 * 
 * For scanned/image-based PDFs, use pdfToImages.ts with OCR instead.
 * 
 * @module utils/pdfTextExtraction
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure pdf.js worker for async processing
GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Text item extracted from PDF with positioning info
 */
interface TextItem {
  /** Actual text content */
  str: string;
  /** Transformation matrix [scaleX, skewX, skewY, scaleY, translateX, translateY] */
  transform: number[];
  /** Width of the text in PDF units */
  width: number;
  /** Height of the text in PDF units */
  height: number;
  /** Font name used for this text */
  fontName?: string;
}

/**
 * Detects if font name indicates bold styling
 * 
 * @param fontName - Font name from PDF metadata
 * @returns True if font appears to be bold
 */
function isBoldFont(fontName: string): boolean {
  if (!fontName) return false;
  const lowerFont = fontName.toLowerCase();
  return lowerFont.includes('bold') || 
         lowerFont.includes('heavy') || 
         lowerFont.includes('black') ||
         lowerFont.includes('semibold') ||
         lowerFont.includes('extrabold');
}

/**
 * Detects if font name indicates italic styling
 * 
 * @param fontName - Font name from PDF metadata
 * @returns True if font appears to be italic
 */
function isItalicFont(fontName: string): boolean {
  if (!fontName) return false;
  const lowerFont = fontName.toLowerCase();
  return lowerFont.includes('italic') || 
         lowerFont.includes('oblique') ||
         lowerFont.includes('cursive');
}

/**
 * Wraps text in HTML formatting tags based on font style
 * 
 * @param text - Text content
 * @param fontName - Font name for style detection
 * @returns Text wrapped in appropriate HTML tags
 */
function applyFormatting(text: string, fontName?: string): string {
  if (!fontName || !text) return text;
  
  const isBold = isBoldFont(fontName);
  const isItalic = isItalicFont(fontName);
  
  if (isBold && isItalic) {
    return `<strong><em>${text}</em></strong>`;
  } else if (isBold) {
    return `<strong>${text}</strong>`;
  } else if (isItalic) {
    return `<em>${text}</em>`;
  }
  
  return text;
}

/**
 * Processes PDF text content into formatted HTML
 * 
 * Reconstructs text flow by analyzing Y positions (lines)
 * and X positions (word spacing), preserving document structure.
 * 
 * @param textContent - Raw text content from pdf.js
 * @returns Formatted HTML string with paragraph tags
 */
function extractFormattedText(textContent: any): string {
  const items = textContent.items.filter((item: any) => 'str' in item) as TextItem[];
  const styles = textContent.styles || {};
  
  if (items.length === 0) return '';

  // Enhance items with font information from styles
  const enhancedItems = items.map(item => ({
    ...item,
    fontName: item.fontName || (styles[item.fontName as any]?.fontFamily)
  }));

  // Sort items by Y position (top to bottom), then X position (left to right)
  const sortedItems = enhancedItems.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5]; // Y coordinate (inverted in PDF)
    if (Math.abs(yDiff) > 2) return yDiff; // Different lines
    return a.transform[4] - b.transform[4]; // Same line, sort by X
  });

  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastY: number | null = null;
  let lastX: number | null = null;
  let lastHeight: number | null = null;
  let currentFontName: string | undefined = undefined;
  let currentFormatBuffer: string[] = [];

  /**
   * Flushes accumulated formatted text to current line
   */
  const flushFormatBuffer = () => {
    if (currentFormatBuffer.length > 0) {
      const text = currentFormatBuffer.join(' ');
      const formatted = applyFormatting(text, currentFontName);
      currentLine.push(formatted);
      currentFormatBuffer = [];
    }
  };

  sortedItems.forEach((item) => {
    const y = item.transform[5];
    const x = item.transform[4];
    const height = item.height || 12;
    const text = item.str.trim();
    const fontName = item.fontName;

    if (!text) return;

    // Detect new line (Y position changed significantly)
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      flushFormatBuffer();
      
      // Check for paragraph break (extra vertical spacing)
      const verticalGap = Math.abs(lastY - y);
      const isParagraphBreak = lastHeight && verticalGap > lastHeight * 1.5;
      
      if (currentLine.length > 0) {
        lines.push(currentLine.join(''));
        currentLine = [];
      }
      
      // Add extra line break for paragraph spacing
      if (isParagraphBreak) {
        lines.push('');
      }
      
      currentFontName = undefined;
    }

    // Check if font changed (need to flush buffer and start new formatting)
    if (fontName !== currentFontName) {
      flushFormatBuffer();
      currentFontName = fontName;
    }

    // Add spacing between words on the same line
    if (lastX !== null && lastY !== null && Math.abs(y - lastY) <= 2) {
      const horizontalGap = x - lastX;
      if (horizontalGap > height * 0.3 && currentFormatBuffer.length > 0) {
        currentFormatBuffer.push(' ');
      }
    }

    currentFormatBuffer.push(text);
    lastY = y;
    lastX = x + (item.width || 0);
    lastHeight = height;
  });

  // Flush any remaining formatted text
  flushFormatBuffer();
  
  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine.join(''));
  }

  // Join lines and wrap in paragraph tags for proper HTML structure
  const formattedText = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join('');

  return formattedText;
}

/**
 * Extracts text directly from a PDF file
 * 
 * Uses pdf.js to extract embedded text content from PDFs.
 * Best for native text-based PDFs. For scanned documents,
 * returns minimal content - use OCR fallback in that case.
 * 
 * @param file - PDF file to extract text from
 * @param maxPages - Maximum number of pages to process (default: 5)
 * @returns HTML-formatted text content with preserved formatting
 * 
 * @example
 * ```ts
 * const text = await extractTextDirectly(pdfFile, 5);
 * if (text.length < 100) {
 *   // Likely a scanned PDF, fall back to OCR
 * }
 * ```
 */
export async function extractTextDirectly(file: File, maxPages = 5): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const textPages: string[] = [];
    const pageLimit = Math.min(pdf.numPages, maxPages);
    
    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = extractFormattedText(textContent);
      
      if (pageText.trim()) {
        textPages.push(pageText);
      }
    }
    
    // Combine all pages with page break markers
    const combinedHtml = textPages
      .map((page, index) => {
        if (index === 0) return page;
        return `<hr><p><strong>--- Page ${index + 1} ---</strong></p>${page}`;
      })
      .join('');
    
    return combinedHtml;
  } catch (error) {
    console.error('Direct text extraction failed:', error);
    return '';
  }
}

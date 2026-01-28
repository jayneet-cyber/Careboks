/**
 * @fileoverview PDF to Image Conversion Utility
 * 
 * Converts PDF pages to image data URLs for OCR processing.
 * Used as fallback when direct text extraction fails (scanned documents).
 * 
 * @module utils/pdfToImages
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure pdf.js worker for async processing
GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Options for PDF to image conversion
 */
interface ConversionOptions {
  /** Maximum number of pages to convert (default: 5) */
  maxPages?: number;
  /** Render scale factor - higher = better quality but larger size (default: 1.5) */
  scale?: number;
}

/**
 * Converts PDF pages to image data URLs
 * 
 * Renders each PDF page to a canvas and exports as PNG data URL.
 * These images can then be sent to an OCR service for text extraction.
 * 
 * @param file - PDF file to convert
 * @param options - Conversion options (maxPages, scale)
 * @returns Array of base64 data URLs for each page image
 * 
 * @example
 * ```ts
 * const images = await pdfToImageDataUrls(pdfFile, { maxPages: 3, scale: 1.5 });
 * for (const imageUrl of images) {
 *   const ocrResult = await performOCR(imageUrl);
 * }
 * ```
 */
export async function pdfToImageDataUrls(
  file: File,
  options: ConversionOptions = {}
): Promise<string[]> {
  const { maxPages = 5, scale = 1.5 } = options;

  // Load PDF document
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  // Render each page to canvas and export as image
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Create temporary canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas
    }).promise;

    // Export canvas as PNG data URL
    images.push(canvas.toDataURL('image/png'));

    // Cleanup canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}

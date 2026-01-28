/**
 * @fileoverview Technical Note Input Component
 * 
 * First step of the patient communication workflow. Allows clinicians to:
 * - Enter clinical notes directly via rich text editor
 * - Upload PDF documents or images for OCR text extraction
 * - Process multiple documents and combine extracted text
 * 
 * @module components/TechnicalNoteInput
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, File, X, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pdfToImageDataUrls } from "@/utils/pdfToImages";
import { extractTextDirectly } from "@/utils/pdfTextExtraction";
import { useCasePersistence } from "@/hooks/useCasePersistence";

/** Maximum number of documents that can be uploaded at once */
const MAX_UPLOAD_FILES = 10;

/** Minimum character count to consider direct PDF extraction successful */
const MIN_DIRECT_EXTRACTION_LENGTH = 100;

/** Maximum pages to process per document */
const MAX_PAGES_PER_DOCUMENT = 5;

/**
 * Props for the TechnicalNoteInput component
 */
interface TechnicalNoteInputProps {
  /** Callback fired when user proceeds to next step with note content and case ID */
  onNext: (note: string, caseId: string) => void;
  /** Pre-filled note content (optional, for editing existing cases) */
  initialNote?: string;
}

/**
 * Technical Note Input Component
 * 
 * Renders the first step of the patient communication workflow where clinicians
 * can input technical medical notes either by typing directly or by uploading
 * documents for OCR text extraction.
 * 
 * @example
 * ```tsx
 * <TechnicalNoteInput
 *   onNext={(note, caseId) => handleNextStep(note, caseId)}
 *   initialNote={existingNote}
 * />
 * ```
 */
const TechnicalNoteInput = ({
  onNext,
  initialNote = ""
}: TechnicalNoteInputProps) => {
  // Form state
  const [note, setNote] = useState(initialNote);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Track which files have been extracted to prevent duplicate processing
  const [extractedFileNames, setExtractedFileNames] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const { createCase } = useCasePersistence();

  /**
   * Handles file upload from input element
   * Validates file types and enforces upload limits
   * 
   * @param event - Change event from file input
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate upload limit
    if (uploadedFiles.length + files.length > MAX_UPLOAD_FILES) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of ${MAX_UPLOAD_FILES} documents.`,
        variant: "destructive"
      });
      return;
    }
    
    // Filter to only supported file types (PDF and images)
    const validFiles = files.filter(file => {
      const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!isValid) {
        toast({
          title: "Unsupported file type",
          description: `${file.name}: This file type cannot be processed. Please upload a PDF or image.`,
          variant: "destructive"
        });
      }
      return isValid;
    });
    
    if (validFiles.length === 0) return;
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    toast({
      title: "Files uploaded",
      description: `${validFiles.length} file(s) added. Click "Get Text from Documents" to extract text.`
    });
  };

  /**
   * Extracts text from uploaded documents using OCR or direct PDF parsing
   * Handles both native PDFs (direct extraction) and scanned PDFs (OCR fallback)
   */
  const handleExtractText = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload documents first.",
        variant: "destructive"
      });
      return;
    }

    // Filter out already extracted files
    const filesToProcess = uploadedFiles.filter(file => !extractedFileNames.has(file.name));
    
    if (filesToProcess.length === 0) {
      toast({
        title: "All files already extracted",
        description: "All uploaded files have already been processed."
      });
      return;
    }
    
    setIsExtracting(true);
    const newExtractedFiles = new Set(extractedFileNames);
    
    try {
      let combinedText = note;
      console.log('Starting text extraction. Initial note length:', combinedText.length);
      console.log(`Processing ${filesToProcess.length} new file(s), skipping ${extractedFileNames.size} already extracted`);
      
      for (const file of filesToProcess) {
        console.log(`Processing file: ${file.name}`);
        
        if (file.type === 'application/pdf') {
          // Attempt direct text extraction first (faster, for native PDFs)
          const directText = await extractTextDirectly(file, MAX_PAGES_PER_DOCUMENT);
          
          if (directText.trim().length > MIN_DIRECT_EXTRACTION_LENGTH) {
            console.log(`Direct extraction successful for ${file.name}, extracted ${directText.length} characters`);
            combinedText += (combinedText ? '\n\n' : '') + `--- Extracted from ${file.name} ---\n${directText}`;
            newExtractedFiles.add(file.name);
            continue;
          }

          // Fallback to OCR for scanned PDFs
          console.log(`Falling back to OCR for ${file.name} (scanned document detected)`);
          await extractTextViaOCR(file, newExtractedFiles, (text) => {
            combinedText += text;
          });
        } else {
          // Image files: send directly for OCR
          await extractImageText(file, newExtractedFiles, (text) => {
            combinedText += text;
          });
        }
      }
      
      console.log('Extraction complete. Final text length:', combinedText.length);
      setNote(combinedText);
      setExtractedFileNames(newExtractedFiles);
      
      toast({
        title: "Text extracted",
        description: `Extracted text from ${filesToProcess.length} new file(s). Total: ${newExtractedFiles.size}/${uploadedFiles.length} files extracted.`
      });
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing error",
        description: "We could not extract all text. Please review and make corrections.",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Extracts text from a PDF using OCR (for scanned documents)
   * Converts PDF pages to images and sends to OCR edge function
   */
  const extractTextViaOCR = async (
    file: File,
    extractedSet: Set<string>,
    appendText: (text: string) => void
  ) => {
    let pageIndex = 0;
    let fileExtracted = false;
    
    try {
      const images = await pdfToImageDataUrls(file, {
        maxPages: MAX_PAGES_PER_DOCUMENT,
        scale: 1.0
      });
      
      for (const imgUrl of images) {
        pageIndex++;
        const { data, error } = await supabase.functions.invoke('extract-text-from-document', {
          body: { fileData: imgUrl, fileType: 'image/png' }
        });
        
        if (error) {
          toast({
            title: "Extraction failed",
            description: `Could not extract text from ${file.name} (page ${pageIndex}).`,
            variant: "destructive"
          });
          continue;
        }
        
        if (data?.extractedText) {
          console.log(`OCR extracted ${data.extractedText.length} characters from ${file.name} page ${pageIndex}`);
          appendText(`\n\n--- Extracted from ${file.name} (page ${pageIndex}) ---\n${data.extractedText}`);
          fileExtracted = true;
        }
      }
      
      if (fileExtracted) {
        extractedSet.add(file.name);
      }
    } catch (e) {
      console.error('PDF processing error:', e);
      toast({
        title: "PDF processing error",
        description: `We could not process ${file.name}. Please review and make corrections.`,
        variant: "destructive"
      });
    }
  };

  /**
   * Extracts text from an image file using OCR
   */
  const extractImageText = async (
    file: File,
    extractedSet: Set<string>,
    appendText: (text: string) => void
  ) => {
    const reader = new FileReader();
    const fileData = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const { data, error } = await supabase.functions.invoke('extract-text-from-document', {
      body: { fileData, fileType: file.type }
    });
    
    if (error) {
      toast({
        title: "Extraction failed",
        description: `Could not extract text from ${file.name}. Please review and make corrections manually.`,
        variant: "destructive"
      });
      return;
    }
    
    if (data?.extractedText) {
      console.log(`Image OCR extracted ${data.extractedText.length} characters from ${file.name}`);
      appendText(`\n\n--- Extracted from ${file.name} ---\n${data.extractedText}`);
      extractedSet.add(file.name);
    }
  };

  /**
   * Removes a file from the upload list
   * Also clears its extracted status if applicable
   */
  const removeFile = (index: number) => {
    const fileName = uploadedFiles[index].name;
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setExtractedFileNames(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
  };

  /**
   * Creates a new case and proceeds to the next step
   */
  const handleNext = async () => {
    if (!note.trim()) return;
    
    setIsProcessing(true);
    const fileNames = uploadedFiles.map(f => f.name);
    
    const { data, error } = await createCase(note, fileNames);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to save case",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }
    
    if (data) {
      toast({
        title: "Success",
        description: "Case saved successfully"
      });
      onNext(note, data.id);
    }
    
    setIsProcessing(false);
  };

  const isUploadLimitReached = uploadedFiles.length >= MAX_UPLOAD_FILES;
  const hasContent = note.trim().length > 0;
  const isDisabled = isProcessing || isExtracting;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Technical Clinical Documents</CardTitle>
          </div>
          <CardDescription>
            Enter the technical clinical documents that will be transformed into patient-friendly communication.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label htmlFor="technical-note">Clinical Notes</Label>
            <RichTextEditor
              value={note}
              onChange={setNote}
              placeholder="Enter technical clinical note here or upload documents below..."
              disabled={isDisabled}
            />
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>
                Uploaded Documents ({uploadedFiles.length}/{MAX_UPLOAD_FILES}) - {extractedFileNames.size} extracted
              </Label>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => {
                  const isExtracted = extractedFileNames.has(file.name);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        isExtracted ? 'bg-green-100 dark:bg-green-950' : 'bg-medical-light-blue'
                      }`}
                    >
                      {isExtracted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <File className="h-4 w-4 text-primary" />
                      )}
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={isDisabled}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Upload and Extract Controls */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload PDF or Images (Max {MAX_UPLOAD_FILES})</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isDisabled || isUploadLimitReached}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
                <span>Upload Documents</span>
              </Button>
              
              <Button
                type="button"
                variant="default"
                className="flex-1"
                disabled={isDisabled || uploadedFiles.length === 0}
                onClick={handleExtractText}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting text...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Get Text from Documents</span>
                  </>
                )}
              </Button>
              
              <input
                id="file-upload"
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadedFiles.length === 0
                ? "Upload documents first, then click 'Get Text from Documents' to extract text."
                : "Click 'Get Text from Documents' to extract text from uploaded files."}
            </p>
          </div>
          
          {/* Continue Button */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <Button
              onClick={handleNext}
              disabled={!hasContent || isDisabled}
              className="flex items-center space-x-2"
            >
              <span>Continue to Patient Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicalNoteInput;

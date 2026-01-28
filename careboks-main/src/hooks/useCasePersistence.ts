/**
 * @fileoverview Case Persistence Hook
 * 
 * Custom hook providing database operations for patient case management.
 * Handles CRUD operations for:
 * - Patient cases
 * - Patient profiles
 * - AI analyses
 * - Clinical approvals
 * 
 * All operations are scoped to the authenticated user via RLS policies.
 * 
 * @module hooks/useCasePersistence
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Case status enumeration matching database enum
 */
export type CaseStatus = 'draft' | 'processing' | 'pending_approval' | 'approved' | 'completed';

/**
 * Data structure for patient case updates
 */
export interface CaseData {
  /** Case ID (optional for updates) */
  id?: string;
  /** Technical clinical note content */
  technicalNote?: string;
  /** Names of uploaded files */
  uploadedFileNames?: string[];
  /** Current case status */
  status?: CaseStatus;
}

/**
 * Patient profile data structure for personalization
 */
export interface PatientProfileData {
  /** Age bracket (e.g., "20-30", "60+") */
  age: string;
  /** Biological sex */
  sex: string;
  /** Preferred language */
  language: string;
  /** Health literacy level */
  healthLiteracy: string;
  /** Patient journey type */
  journeyType: string;
  /** Risk communication preference */
  riskAppetite: string;
  /** Whether patient has accessibility needs */
  hasAccessibilityNeeds: boolean;
  /** Whether to include content for caregivers */
  includeRelatives: boolean;
  /** List of comorbidities */
  comorbidities: string[];
}

/**
 * Standard response type for hook operations
 */
interface OperationResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Case Persistence Hook
 * 
 * Provides database operations for the patient communication workflow.
 * All operations respect RLS policies for data security.
 * 
 * @returns Object containing database operation functions
 * 
 * @example
 * ```tsx
 * const { createCase, savePatientProfile, saveApproval } = useCasePersistence();
 * 
 * const { data, error } = await createCase(technicalNote, fileNames);
 * if (error) {
 *   console.error('Failed to create case:', error);
 * }
 * ```
 */
export const useCasePersistence = () => {
  /**
   * Creates a new patient case with technical note
   * Ensures user profile exists before creating case
   * 
   * @param technicalNote - The clinical note content
   * @param uploadedFileNames - Array of uploaded file names
   * @returns Created case data or error
   */
  const createCase = async (
    technicalNote: string,
    uploadedFileNames: string[]
  ): Promise<OperationResult<any>> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Ensure profile exists before creating case (required by FK)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || "",
            first_name: "",
            last_name: ""
          });

        if (profileError) throw profileError;
      }

      const { data, error } = await supabase
        .from('patient_cases')
        .insert({
          created_by: user.id,
          technical_note: technicalNote,
          uploaded_file_names: uploadedFileNames,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating case:', error);
      return { data: null, error };
    }
  };

  /**
   * Updates an existing patient case
   * 
   * @param caseId - The case ID to update
   * @param updates - Partial case data to update
   * @returns Updated case data or error
   */
  const updateCase = async (
    caseId: string,
    updates: Partial<CaseData>
  ): Promise<OperationResult<any>> => {
    try {
      const updateData: Record<string, any> = {};
      
      if (updates.technicalNote !== undefined) {
        updateData.technical_note = updates.technicalNote;
      }
      if (updates.uploadedFileNames !== undefined) {
        updateData.uploaded_file_names = updates.uploadedFileNames;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }

      const { data, error } = await supabase
        .from('patient_cases')
        .update(updateData)
        .eq('id', caseId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating case:', error);
      return { data: null, error };
    }
  };

  /**
   * Saves patient profile data for a case
   * 
   * @param caseId - The case ID to associate profile with
   * @param profileData - Patient profile data
   * @returns Saved profile data or error
   */
  const savePatientProfile = async (
    caseId: string,
    profileData: PatientProfileData
  ): Promise<OperationResult<any>> => {
    try {
      const { data, error } = await supabase
        .from('patient_profiles')
        .insert({
          case_id: caseId,
          age_bracket: profileData.age,
          sex: profileData.sex,
          language: profileData.language,
          health_literacy: profileData.healthLiteracy,
          journey_type: profileData.journeyType,
          risk_appetite: profileData.riskAppetite,
          has_accessibility_needs: profileData.hasAccessibilityNeeds,
          include_relatives: profileData.includeRelatives,
          comorbidities: profileData.comorbidities
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error saving patient profile:', error);
      return { data: null, error };
    }
  };

  /**
   * Saves AI analysis results for a case
   * 
   * @param caseId - The case ID
   * @param analysisData - Structured analysis metadata
   * @param aiDraftText - Generated text content
   * @param modelUsed - AI model identifier
   * @returns Saved analysis data or error
   */
  const saveAIAnalysis = async (
    caseId: string,
    analysisData: any,
    aiDraftText: string,
    modelUsed: string = 'gemini-2.5-pro'
  ): Promise<OperationResult<any>> => {
    try {
      const { data, error } = await supabase
        .from('ai_analyses')
        .insert({
          case_id: caseId,
          analysis_data: analysisData,
          ai_draft_text: aiDraftText,
          model_used: modelUsed
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error saving AI analysis:', error);
      return { data: null, error };
    }
  };

  /**
   * Saves clinician approval for a case
   * 
   * @param caseId - The case ID
   * @param approvedText - Final approved text content
   * @param notes - Optional approval notes
   * @returns Saved approval data or error
   */
  const saveApproval = async (
    caseId: string,
    approvedText: string,
    notes?: string
  ): Promise<OperationResult<any>> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('approvals')
        .insert({
          case_id: caseId,
          approved_by: user.id,
          approved_text: approvedText,
          notes: notes
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error saving approval:', error);
      return { data: null, error };
    }
  };

  /**
   * Loads a complete case with all related data
   * 
   * @param caseId - The case ID to load
   * @returns Case data with profiles, analyses, and approvals
   */
  const loadCase = async (caseId: string): Promise<OperationResult<any>> => {
    try {
      const { data, error } = await supabase
        .from('patient_cases')
        .select(`
          *,
          patient_profiles (*),
          ai_analyses (*),
          approvals (*)
        `)
        .eq('id', caseId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error loading case:', error);
      return { data: null, error };
    }
  };

  /**
   * Retrieves case history for the current user
   * 
   * @param limit - Maximum number of cases to retrieve
   * @returns Array of cases ordered by creation date
   */
  const getCaseHistory = async (limit: number = 10): Promise<OperationResult<any[]>> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('patient_cases')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching case history:', error);
      return { data: null, error };
    }
  };

  return {
    createCase,
    updateCase,
    savePatientProfile,
    saveAIAnalysis,
    saveApproval,
    loadCase,
    getCaseHistory
  };
};

-- Add missing UPDATE and DELETE RLS policies for patient_profiles table
-- These policies ensure that users can only modify patient profiles for their own cases

CREATE POLICY "Users can update profiles for their cases" 
ON patient_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM patient_cases 
    WHERE patient_cases.id = patient_profiles.case_id 
    AND patient_cases.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete profiles for their cases" 
ON patient_profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM patient_cases 
    WHERE patient_cases.id = patient_profiles.case_id 
    AND patient_cases.created_by = auth.uid()
  )
);
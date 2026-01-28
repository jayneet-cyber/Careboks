-- Remove mental_state column from patient_profiles table
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS mental_state;
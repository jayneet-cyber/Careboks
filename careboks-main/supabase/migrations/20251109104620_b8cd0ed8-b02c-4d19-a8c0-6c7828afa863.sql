-- Add language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN language TEXT DEFAULT 'est';

-- Add a check constraint to ensure only valid language codes
ALTER TABLE public.profiles
ADD CONSTRAINT valid_language CHECK (language IN ('est', 'rus', 'eng'));
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('doctor', 'nurse')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create status enum for patient cases
CREATE TYPE public.case_status AS ENUM ('draft', 'processing', 'pending_approval', 'approved', 'completed');

-- Create patient_cases table to track each workflow
CREATE TABLE public.patient_cases (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status case_status NOT NULL DEFAULT 'draft',
  technical_note TEXT,
  uploaded_file_names TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on patient_cases
ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;

-- Create patient_profiles table for patient demographic data
CREATE TABLE public.patient_profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  age_bracket TEXT,
  sex TEXT,
  language TEXT CHECK (language IN ('estonian', 'russian', 'english')),
  health_literacy TEXT CHECK (health_literacy IN ('low', 'medium', 'high')),
  journey_type TEXT,
  risk_appetite TEXT,
  has_accessibility_needs BOOLEAN DEFAULT false,
  include_relatives BOOLEAN DEFAULT false,
  mental_state TEXT,
  comorbidities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patient_profiles
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- Create ai_analyses table for AI processing results
CREATE TABLE public.ai_analyses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  analysis_data JSONB,
  ai_draft_text TEXT,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ai_analyses
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- Create approvals table for audit trail
CREATE TABLE public.approvals (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_text TEXT NOT NULL,
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on approvals
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for patient_cases
CREATE POLICY "Users can view their own cases"
  ON public.patient_cases FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create cases"
  ON public.patient_cases FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own cases"
  ON public.patient_cases FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recent cases"
  ON public.patient_cases FOR DELETE
  USING (auth.uid() = created_by AND created_at > now() - interval '24 hours');

-- RLS Policies for patient_profiles
CREATE POLICY "Users can view profiles for their cases"
  ON public.patient_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patient_cases
    WHERE patient_cases.id = patient_profiles.case_id
    AND patient_cases.created_by = auth.uid()
  ));

CREATE POLICY "Users can create patient profiles for their cases"
  ON public.patient_profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patient_cases
    WHERE patient_cases.id = patient_profiles.case_id
    AND patient_cases.created_by = auth.uid()
  ));

-- RLS Policies for ai_analyses
CREATE POLICY "Users can view analyses for their cases"
  ON public.ai_analyses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patient_cases
    WHERE patient_cases.id = ai_analyses.case_id
    AND patient_cases.created_by = auth.uid()
  ));

CREATE POLICY "Users can create analyses for their cases"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patient_cases
    WHERE patient_cases.id = ai_analyses.case_id
    AND patient_cases.created_by = auth.uid()
  ));

-- RLS Policies for approvals (immutable audit trail)
CREATE POLICY "Users can view approvals for their cases"
  ON public.approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patient_cases
    WHERE patient_cases.id = approvals.case_id
    AND patient_cases.created_by = auth.uid()
  ) OR auth.uid() = approved_by);

CREATE POLICY "Users can create approvals"
  ON public.approvals FOR INSERT
  WITH CHECK (auth.uid() = approved_by);

-- Create indexes for performance
CREATE INDEX idx_patient_cases_created_by_created_at ON public.patient_cases(created_by, created_at DESC);
CREATE INDEX idx_patient_cases_status_created_by ON public.patient_cases(status, created_by);
CREATE INDEX idx_patient_profiles_case_id ON public.patient_profiles(case_id);
CREATE INDEX idx_ai_analyses_case_id ON public.ai_analyses(case_id);
CREATE INDEX idx_approvals_case_id ON public.approvals(case_id);
CREATE INDEX idx_approvals_approved_by_approved_at ON public.approvals(approved_by, approved_at DESC);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_cases_updated_at
  BEFORE UPDATE ON public.patient_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
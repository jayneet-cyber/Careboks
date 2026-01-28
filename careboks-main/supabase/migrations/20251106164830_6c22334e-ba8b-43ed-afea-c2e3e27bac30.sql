-- Add RLS policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Backfill existing users who don't have profiles
INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT u.id, u.email, '', ''
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
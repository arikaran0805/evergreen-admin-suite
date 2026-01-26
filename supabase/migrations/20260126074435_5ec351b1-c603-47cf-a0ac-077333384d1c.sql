-- Update certificates status to use pending/verified instead of valid/revoked
-- First drop the old check constraint
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_status_check;

-- Add new check constraint with pending/verified/revoked states
ALTER TABLE public.certificates 
ADD CONSTRAINT certificates_status_check 
CHECK (status IN ('pending', 'verified', 'revoked'));

-- Update default to 'pending' instead of 'valid'
ALTER TABLE public.certificates 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add approved_by and approved_at columns for tracking moderator approval
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add moderator update policy (moderators and admins can update certificate status)
CREATE POLICY "Moderators can update certificate status"
ON public.certificates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator', 'senior_moderator', 'super_moderator')
  )
);
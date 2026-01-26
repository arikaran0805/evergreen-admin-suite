-- Create invitations table for invite-based role assignment
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for token lookup
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can create invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view an invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.invitations
FOR SELECT
USING (true);

-- Add active_role column to profiles for tracking current session role
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_role app_role DEFAULT NULL;

-- Update profiles RLS to allow updating active_role
-- (already has "Users can update own profile" policy)
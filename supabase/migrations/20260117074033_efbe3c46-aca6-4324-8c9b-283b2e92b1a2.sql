-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create teams table for organizing ownership units within careers
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    UNIQUE (name, career_id)
);

-- Add team_id to existing tables for team-based ownership
ALTER TABLE public.career_assignments 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.course_assignments 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add is_default_manager flag to course_assignments for Senior Moderators
ALTER TABLE public.course_assignments 
ADD COLUMN is_default_manager BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams (Admin only)
CREATE POLICY "Admins can manage all teams"
ON public.teams
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super moderators can view teams they're assigned to
CREATE POLICY "Super moderators can view assigned teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_moderator')
    AND EXISTS (
        SELECT 1 FROM public.career_assignments ca
        WHERE ca.team_id = teams.id
        AND ca.user_id = auth.uid()
    )
);

-- Create trigger for updated_at on teams
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_teams_career_id ON public.teams(career_id);
CREATE INDEX idx_teams_archived_at ON public.teams(archived_at);
CREATE INDEX idx_career_assignments_team_id ON public.career_assignments(team_id);
CREATE INDEX idx_course_assignments_team_id ON public.course_assignments(team_id);
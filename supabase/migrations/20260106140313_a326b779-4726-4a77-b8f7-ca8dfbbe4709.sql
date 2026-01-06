-- Create a table for course versions (similar to post_versions)
CREATE TABLE public.course_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  editor_type TEXT DEFAULT 'rich-text',
  edited_by UUID NOT NULL,
  editor_role TEXT DEFAULT 'moderator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  change_summary TEXT,
  versioning_note_type TEXT,
  versioning_note_locked BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for course_versions
CREATE POLICY "Admins and moderators can view all course versions"
  ON public.course_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can insert course versions"
  ON public.course_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update course versions"
  ON public.course_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete course versions"
  ON public.course_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create a table for course annotations (similar to post_annotations)
CREATE TABLE public.course_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.course_versions(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bubble_index INTEGER,
  editor_type TEXT DEFAULT 'rich-text'
);

-- Enable Row Level Security
ALTER TABLE public.course_annotations ENABLE ROW LEVEL SECURITY;

-- Create policies for course_annotations
CREATE POLICY "Admins and moderators can view all course annotations"
  ON public.course_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can insert course annotations"
  ON public.course_annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update course annotations"
  ON public.course_annotations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can delete course annotations"
  ON public.course_annotations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Create a table for course annotation replies
CREATE TABLE public.course_annotation_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id UUID NOT NULL REFERENCES public.course_annotations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.course_annotation_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for course_annotation_replies
CREATE POLICY "Admins and moderators can view all course annotation replies"
  ON public.course_annotation_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can insert course annotation replies"
  ON public.course_annotation_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update course annotation replies"
  ON public.course_annotation_replies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can delete course annotation replies"
  ON public.course_annotation_replies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_course_versions_course_id ON public.course_versions(course_id);
CREATE INDEX idx_course_versions_version_number ON public.course_versions(version_number);
CREATE INDEX idx_course_annotations_course_id ON public.course_annotations(course_id);
CREATE INDEX idx_course_annotation_replies_annotation_id ON public.course_annotation_replies(annotation_id);

-- Enable realtime for course annotations and replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_annotation_replies;
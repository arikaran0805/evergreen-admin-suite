-- Create table to track read notifications
CREATE TABLE public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read states
CREATE POLICY "Users can view their own notification reads"
  ON public.notification_reads FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark notifications as read
CREATE POLICY "Users can insert their own notification reads"
  ON public.notification_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reads (to mark as unread)
CREATE POLICY "Users can delete their own notification reads"
  ON public.notification_reads FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_notification_reads_user_type ON public.notification_reads(user_id, notification_type);
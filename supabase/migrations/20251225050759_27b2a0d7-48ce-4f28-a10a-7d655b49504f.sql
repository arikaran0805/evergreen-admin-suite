-- Enable realtime for annotations tables
ALTER TABLE public.post_annotations REPLICA IDENTITY FULL;
ALTER TABLE public.annotation_replies REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.annotation_replies;
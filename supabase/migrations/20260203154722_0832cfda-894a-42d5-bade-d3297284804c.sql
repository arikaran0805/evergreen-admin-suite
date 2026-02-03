-- Drop the trigger that auto-creates sub_topics when lessons are created
DROP TRIGGER IF EXISTS trigger_auto_create_default_sub_topic ON public.course_lessons;

-- Drop the function with CASCADE
DROP FUNCTION IF EXISTS public.auto_create_default_sub_topic_for_lesson() CASCADE;
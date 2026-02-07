
-- Add locked region support and sample output for Fix the Error problems
ALTER TABLE public.fix_error_problems 
ADD COLUMN IF NOT EXISTS editable_start_line integer,
ADD COLUMN IF NOT EXISTS editable_end_line integer,
ADD COLUMN IF NOT EXISTS sample_output text;

-- Add comment for clarity
COMMENT ON COLUMN public.fix_error_problems.editable_start_line IS '1-indexed line number where the editable region begins. NULL means entire code is editable.';
COMMENT ON COLUMN public.fix_error_problems.editable_end_line IS '1-indexed line number where the editable region ends. NULL means entire code is editable.';
COMMENT ON COLUMN public.fix_error_problems.sample_output IS 'Sample output shown to learners in the description panel. If NULL, derived from expected_output or first visible test case.';

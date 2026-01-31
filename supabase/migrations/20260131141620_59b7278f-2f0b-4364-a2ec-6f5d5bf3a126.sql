-- Add LeetCode-critical fields to practice_problems table
ALTER TABLE public.practice_problems
ADD COLUMN IF NOT EXISTS test_cases jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS input_format text DEFAULT '',
ADD COLUMN IF NOT EXISTS output_format text DEFAULT '',
ADD COLUMN IF NOT EXISTS time_limit integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS memory_limit integer DEFAULT 256,
ADD COLUMN IF NOT EXISTS supported_languages text[] DEFAULT ARRAY['python', 'javascript']::text[],
ADD COLUMN IF NOT EXISTS function_signature jsonb DEFAULT '{"name": "solution", "parameters": [], "return_type": "int"}'::jsonb,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Add comment for clarity
COMMENT ON COLUMN public.practice_problems.test_cases IS 'Array of test cases with id, input, expected_output, is_visible';
COMMENT ON COLUMN public.practice_problems.input_format IS 'Markdown description of input format';
COMMENT ON COLUMN public.practice_problems.output_format IS 'Markdown description of output format';
COMMENT ON COLUMN public.practice_problems.time_limit IS 'Time limit in milliseconds';
COMMENT ON COLUMN public.practice_problems.memory_limit IS 'Memory limit in MB';
COMMENT ON COLUMN public.practice_problems.supported_languages IS 'Languages available for this problem';
COMMENT ON COLUMN public.practice_problems.function_signature IS 'Function name, parameters, and return type';
COMMENT ON COLUMN public.practice_problems.tags IS 'Problem tags for categorization';
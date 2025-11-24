-- Add level field to categories table
ALTER TABLE categories ADD COLUMN level text DEFAULT 'Beginner';

-- Add check constraint for valid levels
ALTER TABLE categories ADD CONSTRAINT categories_level_check 
  CHECK (level IN ('Beginner', 'Intermediate', 'Advanced'));
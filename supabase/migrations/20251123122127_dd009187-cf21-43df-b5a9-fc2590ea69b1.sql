-- Add parent_id column to posts table for hierarchical lessons
ALTER TABLE posts ADD COLUMN parent_id uuid REFERENCES posts(id) ON DELETE CASCADE;

-- Create index for faster parent-child queries
CREATE INDEX idx_posts_parent_id ON posts(parent_id);

-- Add a comment explaining the relationship
COMMENT ON COLUMN posts.parent_id IS 'References parent post for sub-lessons. NULL means this is a main lesson.';
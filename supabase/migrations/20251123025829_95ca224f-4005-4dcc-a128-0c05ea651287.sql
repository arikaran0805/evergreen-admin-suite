-- Add featured column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create an index for better performance when filtering featured categories
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(featured) WHERE featured = true;
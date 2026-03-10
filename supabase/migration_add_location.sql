-- Add location column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS location text DEFAULT '';

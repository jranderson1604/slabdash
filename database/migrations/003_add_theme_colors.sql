-- Add theme customization columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#f5f5f5';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT '#ffffff';

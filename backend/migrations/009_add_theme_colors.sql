-- Add customizable background and sidebar colors to companies table

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS background_color VARCHAR(7) DEFAULT '#f5f5f5';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7) DEFAULT '#ffffff';

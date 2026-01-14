-- Add images column to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS form_images TEXT[];

-- Store array of base64 images or URLs
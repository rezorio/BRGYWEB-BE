-- Add imageFilename column to announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS imageFilename VARCHAR(255) NULL AFTER image;

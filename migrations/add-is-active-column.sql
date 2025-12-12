-- Add isActive column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT TRUE;

-- Update existing users to be active
UPDATE users SET isActive = TRUE WHERE isActive IS NULL;

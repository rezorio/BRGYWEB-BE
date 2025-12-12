-- Create Document Requests Table
CREATE TABLE IF NOT EXISTS document_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'barangay_clearance',
  purpose VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
  admin_notes TEXT,
  denial_reason TEXT,
  processed_by VARCHAR(36),
  processed_at DATETIME,
  generated_file_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_requests (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);

-- Add profile completion fields to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS street_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS street_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have default values
UPDATE users 
SET is_profile_completed = FALSE 
WHERE is_profile_completed IS NULL;

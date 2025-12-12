-- Add Philippine address and profile fields to users table
ALTER TABLE users
ADD COLUMN middle_name VARCHAR(100) AFTER firstName,
ADD COLUMN suffix VARCHAR(20) AFTER lastName,
ADD COLUMN date_of_birth DATE,
ADD COLUMN place_of_birth VARCHAR(255),
ADD COLUMN gender ENUM('male', 'female', 'other'),
ADD COLUMN civil_status ENUM('single', 'married', 'widowed', 'separated', 'divorced'),
ADD COLUMN nationality VARCHAR(100) DEFAULT 'Filipino',
ADD COLUMN phone_number VARCHAR(50),

-- Philippine Address Fields
ADD COLUMN house_number VARCHAR(50),
ADD COLUMN street VARCHAR(255),
ADD COLUMN barangay VARCHAR(100),
ADD COLUMN city VARCHAR(100),
ADD COLUMN province VARCHAR(100),
ADD COLUMN region VARCHAR(100),
ADD COLUMN zip_code VARCHAR(20),

-- Additional Information
ADD COLUMN occupation VARCHAR(255),
ADD COLUMN monthly_income VARCHAR(50),
ADD COLUMN years_of_residency INT,
ADD COLUMN voter_id VARCHAR(50),
ADD COLUMN precinct_number VARCHAR(50),
ADD COLUMN is_registered_voter BOOLEAN DEFAULT FALSE,
ADD COLUMN is_profile_complete BOOLEAN DEFAULT FALSE,

-- Indexes for commonly searched fields
ADD INDEX idx_barangay (barangay),
ADD INDEX idx_city (city),
ADD INDEX idx_is_profile_complete (is_profile_complete);

-- Create otps table for OTP verification
CREATE TABLE IF NOT EXISTS `otps` (
  `id` VARCHAR(36) PRIMARY KEY,
  `type` ENUM('registration', 'password_reset') NOT NULL,
  `status` ENUM('pending', 'verified', 'expired', 'failed') NOT NULL DEFAULT 'pending',
  `phoneNumber` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255) NOT NULL COMMENT 'Hashed OTP code',
  `registrationData` JSON NULL COMMENT 'Temporary storage for registration data',
  `userId` VARCHAR(36) NULL COMMENT 'User ID for password reset',
  `attempts` INT DEFAULT 0 COMMENT 'Number of verification attempts',
  `expiresAt` TIMESTAMP NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX `idx_otps_phone` (`phoneNumber`),
  INDEX `idx_otps_email` (`email`),
  INDEX `idx_otps_status` (`status`),
  INDEX `idx_otps_expires` (`expiresAt`),
  INDEX `idx_otps_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_requests table
CREATE TABLE IF NOT EXISTS `user_requests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `type` ENUM('registration', 'password_reset') NOT NULL,
  `status` ENUM('pending', 'approved', 'denied') NOT NULL DEFAULT 'pending',
  `userData` JSON NULL COMMENT 'For registration requests - stores user data',
  `user_id` VARCHAR(36) NULL COMMENT 'For password reset requests - references existing user',
  `email` VARCHAR(255) NOT NULL,
  `message` TEXT NULL COMMENT 'Reason/message from user',
  `processed_by_id` VARCHAR(36) NULL COMMENT 'Admin who processed the request',
  `denial_reason` TEXT NULL COMMENT 'Admin reason for denial',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP address for security tracking',
  `user_agent` TEXT NULL COMMENT 'User agent for security tracking',
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT `fk_user_requests_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE,
  
  CONSTRAINT `fk_user_requests_processed_by` 
    FOREIGN KEY (`processed_by_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX `idx_user_requests_type` (`type`),
  INDEX `idx_user_requests_status` (`status`),
  INDEX `idx_user_requests_email` (`email`),
  INDEX `idx_user_requests_user_id` (`user_id`),
  INDEX `idx_user_requests_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

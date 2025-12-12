-- Migration: Create login_attempts table for tracking failed login attempts
-- This table tracks failed login attempts for rate limiting and account lockout

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(500),
  `attempt_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `success` BOOLEAN DEFAULT FALSE,
  `failure_reason` VARCHAR(255),
  INDEX `idx_email` (`email`),
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_attempt_time` (`attempt_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add login attempt tracking fields to users table
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `failed_login_attempts` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `account_locked_until` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `last_failed_login` TIMESTAMP NULL DEFAULT NULL;

-- Add index for account lockout queries
ALTER TABLE `users` ADD INDEX IF NOT EXISTS `idx_account_locked` (`account_locked_until`);

-- Activity Logs Migration Script
-- Create the activity_logs table for the BRGYWEB application

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'system',
  `changes` json DEFAULT NULL,
  `userEmail` varchar(255) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `userRole` varchar(100) NOT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` varchar(500) DEFAULT NULL,
  `userId` varchar(36) DEFAULT NULL,
  `timestamp` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_activity_logs_timestamp` (`timestamp`),
  KEY `idx_activity_logs_type` (`type`),
  KEY `idx_activity_logs_userId` (`userId`),
  KEY `idx_activity_logs_userEmail` (`userEmail`),
  CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance on common queries
CREATE INDEX `idx_activity_logs_composite` ON `activity_logs` (`type`, `timestamp`);
CREATE INDEX `idx_activity_logs_user_composite` ON `activity_logs` (`userId`, `timestamp`);

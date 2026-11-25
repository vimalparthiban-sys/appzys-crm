-- =========================================================================
-- APPZYS CRM - Phase 2 Additive Migration: Permanent Access, Invites, Sessions & AI Audit
-- Target: TiDB Cloud / MySQL 8.0+
-- NOTE: Additive only. No existing data is deleted, dropped, or modified.
-- =========================================================================

-- 1. Centralized Employee Identities Table (Source of Truth for Active/Revoked Status)
CREATE TABLE IF NOT EXISTS crm_employees (
    member_id VARCHAR(32) PRIMARY KEY,
    member_name VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    INDEX idx_emp_status (status)
);

-- Seed the initial 4 company employee records if they do not exist
INSERT IGNORE INTO crm_employees (member_id, member_name, status) VALUES
('emp1', 'Vimal P', 'ACTIVE'),
('emp2', 'Employee 2', 'ACTIVE'),
('emp3', 'Employee 3', 'ACTIVE'),
('emp4', 'Employee 4', 'ACTIVE');

-- 2. One-Time Ephemeral Invites Table (Atomic Consumption)
CREATE TABLE IF NOT EXISTS crm_auth_invites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(32) NOT NULL,
    member_name VARCHAR(64) NOT NULL,
    invite_hash VARCHAR(64) NOT NULL UNIQUE,
    pin_hash VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NULL,
    is_consumed BOOLEAN DEFAULT FALSE,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invite_hash (invite_hash),
    INDEX idx_member_id (member_id)
);

-- 3. Permanent Device Session Registry (Cross-Device, Survives Restarts)
CREATE TABLE IF NOT EXISTS crm_member_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    member_id VARCHAR(32) NOT NULL,
    member_name VARCHAR(64) NOT NULL,
    device_name VARCHAR(100) NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    INDEX idx_member_session (member_id, is_revoked),
    INDEX idx_session_lookup (session_id, is_revoked)
);

-- 4. Sanitized AI Audit Log Table (Zero Prompts, Zero Secrets)
CREATE TABLE IF NOT EXISTS crm_ai_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NULL,
    summary VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_agent_action (agent_id, action),
    INDEX idx_created_at (created_at)
);

-- 5. Optimistic Locking for Concurrent Company Updates Across All 4 Members
ALTER TABLE companies ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

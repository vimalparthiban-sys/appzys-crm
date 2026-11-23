-- ======================================================
-- APPZYS Client Acquisition CRM - Database Initial Schema
-- ======================================================

CREATE DATABASE IF NOT EXISTS appzys_crm;
USE appzys_crm;

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    official_website VARCHAR(500) NOT NULL,
    normalized_website VARCHAR(500) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'FOUND',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_norm_name (normalized_name),
    INDEX idx_company_norm_website (normalized_website),
    INDEX idx_company_status (status)
);

-- Company Sources Table (Multiple sources per company)
CREATE TABLE IF NOT EXISTS company_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    platform_name VARCHAR(150) NOT NULL,
    source_url VARCHAR(1000),
    normalized_source_url VARCHAR(1000),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_source_platform (platform_name),
    INDEX idx_source_url (normalized_source_url(255))
);

-- Follow-ups Table
CREATE TABLE IF NOT EXISTS follow_ups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    scheduled_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, RESCHEDULED, CANCELLED
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_followup_date (scheduled_date),
    INDEX idx_followup_status (status),
    INDEX idx_followup_completed (is_completed)
);

-- Activities Table (Timeline of automatic and manual events)
CREATE TABLE IF NOT EXISTS activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- LEAD_CREATED, STATUS_CHANGED, FOLLOWUP_SCHEDULED, FOLLOWUP_RESCHEDULED, FOLLOWUP_COMPLETED, CALL, EMAIL, MESSAGE, MEETING, REPLY, OTHER
    platform VARCHAR(100),
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    outcome VARCHAR(255),
    is_automatic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_activity_company_time (company_id, event_timestamp DESC)
);

-- Settings / Reusable Sources Table
CREATE TABLE IF NOT EXISTS setting_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    normalized_name VARCHAR(150) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial default reusable source options
INSERT IGNORE INTO setting_sources (id, name, normalized_name, is_default) VALUES
(1, 'LinkedIn', 'linkedin', TRUE),
(2, 'Company Website', 'company website', TRUE),
(3, 'Freelance Platform', 'freelance platform', TRUE),
(4, 'Upwork', 'upwork', TRUE),
(5, 'Clutch', 'clutch', TRUE),
(6, 'Email Campaign', 'email campaign', TRUE),
(7, 'Referral', 'referral', TRUE),
(8, 'Other', 'other', TRUE);

-- Sample Leads matching the reference mockups
INSERT IGNORE INTO companies (id, name, normalized_name, official_website, normalized_website, contact_person, email, phone, status, created_at) VALUES
(1, 'ABC Technologies', 'abc technologies', 'https://abctechnologies.io', 'abctechnologies.io', 'Alex Mercer', 'alex@abctechnologies.io', '+1-555-0192', 'CONTACTED', NOW() - INTERVAL 5 DAY),
(2, 'Nova Solutions', 'nova solutions', 'https://novasolutions.com', 'novasolutions.com', 'Sarah Connor', 'sarah@novasolutions.com', '+1-555-0143', 'REPLY_RECEIVED', NOW() - INTERVAL 4 DAY),
(3, 'PixelCraft Studio', 'pixelcraft studio', 'https://pixelcraft.design', 'pixelcraft.design', 'David Miller', 'david@pixelcraft.design', '+1-555-0177', 'INTERESTED', NOW() - INTERVAL 3 DAY),
(4, 'TechNova', 'technova', 'https://technovagroup.com', 'technovagroup.com', 'Elena Rostova', 'elena@technovagroup.com', '+1-555-0188', 'CONTACTED', NOW() - INTERVAL 2 DAY),
(5, 'BlueSky Industries', 'bluesky industries', 'https://blueskyind.org', 'blueskyind.org', 'Mark Vance', 'contact@blueskyind.org', '+1-555-0111', 'MEETING', NOW() - INTERVAL 6 DAY),
(6, 'Horizon Ventures', 'horizon ventures', 'https://horizonventures.co', 'horizonventures.co', 'Linda Zhang', 'linda@horizonventures.co', '+1-555-0129', 'FOUND', NOW() - INTERVAL 1 DAY),
(7, 'Summit Partners', 'summit partners', 'https://summitpartners.net', 'summitpartners.net', 'Jason Ross', 'jason@summitpartners.net', '+1-555-0165', 'CONVERTED', NOW() - INTERVAL 10 DAY);

-- Sample Company Sources
INSERT IGNORE INTO company_sources (id, company_id, platform_name, source_url, normalized_source_url, notes, created_at) VALUES
(1, 1, 'LinkedIn', 'https://www.linkedin.com/company/abc-technologies', 'linkedin.com/company/abc-technologies', 'Found through CTO profile post', NOW() - INTERVAL 5 DAY),
(2, 2, 'Company Website', 'https://novasolutions.com/contact', 'novasolutions.com/contact', 'Contact form submission', NOW() - INTERVAL 4 DAY),
(3, 3, 'Freelance Platform', 'https://upwork.com/jobs/pixelcraft-ux-redesign', 'upwork.com/jobs/pixelcraft-ux-redesign', 'Project RFP posting', NOW() - INTERVAL 3 DAY),
(4, 4, 'LinkedIn', 'https://www.linkedin.com/in/elena-rostova', 'linkedin.com/in/elena-rostova', 'InMail connection message sent', NOW() - INTERVAL 2 DAY),
(5, 5, 'Company Website', 'https://blueskyind.org/about', 'blueskyind.org/about', 'Direct website research', NOW() - INTERVAL 6 DAY),
(6, 6, 'LinkedIn', 'https://www.linkedin.com/company/horizon-ventures', 'linkedin.com/company/horizon-ventures', 'Lead list export', NOW() - INTERVAL 1 DAY),
(7, 7, 'Referral', 'https://summitpartners.net', 'summitpartners.net', 'Referred by past client', NOW() - INTERVAL 10 DAY);

-- Sample Follow-ups with explicit status lifecycle
INSERT IGNORE INTO follow_ups (id, company_id, scheduled_date, reason, status, is_completed, created_at) VALUES
(1, 1, CURDATE(), 'Follow-up on proposal submission', 'SCHEDULED', FALSE, NOW() - INTERVAL 2 DAY),
(2, 3, CURDATE(), 'Check for response after demo pitch', 'SCHEDULED', FALSE, NOW() - INTERVAL 1 DAY),
(3, 2, CURDATE() - INTERVAL 2 DAY, 'Overdue reply check on introductory email', 'SCHEDULED', FALSE, NOW() - INTERVAL 4 DAY),
(4, 4, CURDATE() + INTERVAL 3 DAY, 'Discuss project scope call', 'SCHEDULED', FALSE, NOW() - INTERVAL 1 DAY),
(5, 5, CURDATE() + INTERVAL 5 DAY, 'Client negotiation meeting preparation', 'SCHEDULED', FALSE, NOW() - INTERVAL 2 DAY);

-- Sample Activities (Audit & timeline)
INSERT IGNORE INTO activities (id, company_id, activity_type, platform, event_timestamp, title, description, outcome, is_automatic, created_at) VALUES
(1, 1, 'LEAD_CREATED', 'LinkedIn', NOW() - INTERVAL 5 DAY, 'New lead added: ABC Technologies', 'Initial lead found on LinkedIn and imported.', 'Lead Created', TRUE, NOW() - INTERVAL 5 DAY),
(2, 1, 'STATUS_CHANGED', 'LinkedIn', NOW() - INTERVAL 3 DAY, 'Status changed: ABC Technologies', 'Status updated from FOUND to CONTACTED', 'Contacted', TRUE, NOW() - INTERVAL 3 DAY),
(3, 1, 'FOLLOWUP_SCHEDULED', 'Internal', NOW() - INTERVAL 2 DAY, 'Follow-up scheduled: ABC Technologies', CONCAT('Scheduled follow-up for proposal feedback on ', CURDATE()), 'Scheduled', TRUE, NOW() - INTERVAL 2 DAY),
(4, 2, 'EMAIL', 'Email', NOW() - INTERVAL 2 DAY, 'Email sent to Nova Solutions', 'Introduction and service portfolio deck sent to Sarah Connor.', 'Sent', FALSE, NOW() - INTERVAL 2 DAY),
(5, 3, 'STATUS_CHANGED', 'Freelance Platform', NOW() - INTERVAL 1 DAY, 'Status changed: PixelCraft Studio', 'Status updated from CONTACTED to INTERESTED', 'Interested', TRUE, NOW() - INTERVAL 1 DAY),
(6, 5, 'MEETING', 'Google Meet', NOW() - INTERVAL 1 DAY, 'Discovery Call with BlueSky Industries', 'Reviewed app modernization requirements with Mark Vance.', 'Positive, drafting proposal', FALSE, NOW() - INTERVAL 1 DAY);

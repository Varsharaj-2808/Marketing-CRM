-- ============================================================
-- STORY-2.1.1 Lead Management — Master Data Seed
-- Run AFTER: database/schema/006_lead_management.sql
-- ============================================================

-- Lead Sources
INSERT INTO lead_sources (name, status) VALUES
  ('Website',       'Active'),
  ('Referral',      'Active'),
  ('Google Ads',    'Active'),
  ('LinkedIn',      'Active'),
  ('Facebook',      'Active'),
  ('Trade Show',    'Active'),
  ('Cold Call',     'Active'),
  ('Email Campaign','Active'),
  ('Partner',       'Active'),
  ('Direct Visit',  'Inactive')
ON CONFLICT DO NOTHING;

-- Business Categories (fixed UUIDs for API testing)
INSERT INTO business_categories (id, category_name, status) VALUES
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'IT Services',           'Active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Digital Marketing',     'Active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Consulting',            'Active'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Manufacturing',         'Active'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Healthcare',            'Active'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Real Estate',           'Active'),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Education & Training',  'Active'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'E-commerce',            'Inactive')
ON CONFLICT DO NOTHING;

-- Business Sub Categories
INSERT INTO business_sub_categories (category_id, sub_category_name, status) VALUES
  -- IT Services
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'Web Development',       'Active'),
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'Mobile App Development','Active'),
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'Cloud Solutions',      'Active'),
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'Cybersecurity',        'Active'),
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'DevOps',               'Active'),
  ('d3b07384-d113-4a00-a541-b8448fb8b801', 'AI / Machine Learning','Active'),

  -- Digital Marketing
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SEO',                  'Active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Social Media Management','Active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PPC Advertising',      'Active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Content Marketing',    'Active'),

  -- Consulting
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Management Consulting', 'Active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'IT Strategy',          'Active'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Business Process Outsourcing','Active'),

  -- Manufacturing
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Automation',           'Active'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Supply Chain',         'Active'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Quality Assurance',    'Active'),

  -- Healthcare
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Telemedicine',         'Active'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Health Analytics',     'Active'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'EHR Solutions',        'Active'),

  -- Real Estate
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Property Management',  'Active'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Real Estate CRM',      'Active'),

  -- Education
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'LMS Development',      'Active'),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'E-learning Content',   'Active'),

  -- E-commerce (Inactive category — sub-categories still listed for reference)
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'Shopify Development',  'Inactive'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'Marketplace Integration','Inactive')
ON CONFLICT DO NOTHING;

-- Services
INSERT INTO services (name, status) VALUES
  ('Web Development',       'Active'),
  ('App Development',       'Active'),
  ('Cloud Migration',       'Active'),
  ('Digital Marketing',     'Active'),
  ('SEO Services',          'Active'),
  ('Content Writing',       'Active'),
  ('UI/UX Design',          'Active'),
  ('Consulting',            'Active'),
  ('Training',              'Active'),
  ('Support & Maintenance', 'Active'),
  ('Data Analytics',        'Active'),
  ('Legacy System Upgrade', 'Inactive')
ON CONFLICT DO NOTHING;

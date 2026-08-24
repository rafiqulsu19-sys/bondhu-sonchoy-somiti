-- Default admin: username=admin password=admin123
-- Password hash for "admin123" using bcrypt cost 10
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role, must_change_password)
VALUES (
  'admin',
  'admin@bondhu.local',
  '$2a$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuG5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y',
  'সিস্টেম অ্যাডমিন',
  'admin',
  1
);

-- Note: Real bcrypt hash will be generated at runtime on first setup.
-- The app will create proper hash on first run if needed.

INSERT OR IGNORE INTO categories (type, name) VALUES
('income', 'সদস্য ফি'),
('income', 'দন্ড/জরিমানা'),
('income', 'অন্যান্য আয়'),
('expense', 'অফিস ভাড়া'),
('expense', 'বিদ্যুৎ বিল'),
('expense', 'স্টেশনারি'),
('expense', 'অন্যান্য ব্যয়');

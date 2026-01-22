-- Set your user account to 'owner' role to access the Platform Owner Dashboard
-- Replace 'your@email.com' with your actual email address

-- Option 1: Set by email
UPDATE users 
SET role = 'owner' 
WHERE email = 'your@email.com';

-- Option 2: Set by user ID (if you know it)
-- UPDATE users SET role = 'owner' WHERE id = 'your-user-id-here';

-- Verify the change
SELECT id, name, email, role, company_id 
FROM users 
WHERE role = 'owner';

-- Expected result: Should show your user with role = 'owner'

-- Update users to have 'owner' role if they don't have one
-- This ensures that the first/primary user in each company is the owner

UPDATE users
SET role = 'owner'
WHERE role IS NULL OR role = '';

-- For companies with multiple users, ensure at least one is an owner
UPDATE users u
SET role = 'owner'
WHERE u.id IN (
    SELECT MIN(id)
    FROM users
    WHERE company_id = u.company_id
    GROUP BY company_id
    HAVING COUNT(*) > 0
)
AND (u.role IS NULL OR u.role = '' OR u.role != 'owner');

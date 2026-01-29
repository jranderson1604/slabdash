-- RESET SHIPPED STATUS FOR ALL SUBMISSIONS
-- This fixes submissions that were incorrectly marked as shipped by CSV import
-- Run this ONCE to reset your database, then re-import your CSV

-- First, let's see what we're working with
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN shipped = true THEN 1 END) as marked_shipped,
    COUNT(CASE WHEN shipped = false THEN 1 END) as marked_active
FROM submissions;

-- Reset ALL submissions to shipped=false
-- Only PSA API refresh should set shipped=true
UPDATE submissions
SET shipped = false
WHERE shipped = true;

-- Verify the fix
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN shipped = true THEN 1 END) as marked_shipped,
    COUNT(CASE WHEN shipped = false THEN 1 END) as marked_active
FROM submissions;

-- Now you can re-import your PSA CSV and all submissions will show as active
-- Then use "Refresh All" to get accurate shipping status from PSA API

-- Find the orphaned submission
SELECT id, psa_submission_number, customer_id, company_id, created_at
FROM submissions
WHERE psa_submission_number = '12666485';

-- To delete it, uncomment and run this line after verifying above:
-- DELETE FROM submissions WHERE psa_submission_number = '12666485';

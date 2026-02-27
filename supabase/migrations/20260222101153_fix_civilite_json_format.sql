/*
  # Fix civilite JSON format in prospects table

  1. Changes
    - Convert all civilite values stored as JSON objects to plain text strings
    - Extract the 'civilite_lib' value from JSON objects like {"civilite_lib":"M."}
    - Clean up any malformed civilite data
  
  2. Details
    - Affects prospects table where civilite contains JSON-formatted strings
    - Preserves existing plain text civilite values
    - Updates only rows where civilite looks like a JSON object
*/

-- Update all civilite values that are stored as JSON objects
UPDATE prospects
SET civilite = TRIM(BOTH '"' FROM (civilite::jsonb->>'civilite_lib'))
WHERE civilite::text LIKE '{%'
  AND civilite::text LIKE '%civilite_lib%';

-- Handle any edge cases where civilite might be a JSON object but with different structure
UPDATE prospects
SET civilite = TRIM(BOTH '"' FROM (civilite::jsonb->>'civilite'))
WHERE civilite::text LIKE '{%'
  AND civilite::text LIKE '%civilite%'
  AND civilite::text NOT LIKE '%civilite_lib%';
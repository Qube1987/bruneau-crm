/*
  # Add prioritaire field to opportunites

  1. Changes
    - Add `prioritaire` column to `opportunites` table (boolean, default false)
    - Allows marking opportunities as priority for display at the top of the list
  
  2. Purpose
    - Enable users to flag important opportunities
    - Priority opportunities will be displayed with visual emphasis
    - Priority opportunities will appear at the top of the list
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'prioritaire'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN prioritaire boolean DEFAULT false;
  END IF;
END $$;
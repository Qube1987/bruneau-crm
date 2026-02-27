/*
  # Migration: Harmonisation des champs Extrabat ID

  1. Modifications
    - Renommer `campagne_prospects.client_extrabat_id` → `campagne_prospects.extrabat_id`
    - Renommer `chantiers.extrabat_client_id` → `chantiers.extrabat_id`
  
  2. Tables déjà correctes (non modifiées)
    - `prospects.extrabat_id` ✅
    - `opportunites.extrabat_id` ✅
  
  3. Notes importantes
    - Cette migration harmonise tous les noms de colonnes pour l'ID client Extrabat
    - Les autres champs Extrabat (extrabat_appointment_id, etc.) ne sont pas modifiés
    - Type de données maintenu: integer
*/

-- Renommer client_extrabat_id → extrabat_id dans campagne_prospects
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campagne_prospects' AND column_name = 'client_extrabat_id'
  ) THEN
    ALTER TABLE campagne_prospects RENAME COLUMN client_extrabat_id TO extrabat_id;
  END IF;
END $$;

-- Renommer extrabat_client_id → extrabat_id dans chantiers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'extrabat_client_id'
  ) THEN
    ALTER TABLE chantiers RENAME COLUMN extrabat_client_id TO extrabat_id;
  END IF;
END $$;
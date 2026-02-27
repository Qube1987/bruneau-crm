/*
  # Ajout du champ activité aux prospects

  1. Modifications
    - Ajout du champ `activite` (text, nullable) à la table `prospects`
      - Permet de stocker l'activité professionnelle du prospect (ex: "Plomberie", "Électricité", etc.)
    
  2. Notes
    - Le champ est nullable pour permettre la compatibilité avec les données existantes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'activite'
  ) THEN
    ALTER TABLE prospects ADD COLUMN activite text;
  END IF;
END $$;
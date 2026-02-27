/*
  # Ajouter extrabat_id à la table chantiers

  1. Modifications
    - Ajouter la colonne `extrabat_id` (integer, nullable) à la table `chantiers`
    - Créer un index sur cette colonne pour améliorer les performances des recherches
  
  2. Notes importantes
    - Cette colonne permet de lier les chantiers aux clients Extrabat
    - Nullable car certains chantiers peuvent ne pas avoir de lien Extrabat
*/

-- Ajouter la colonne extrabat_id si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'extrabat_id'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN extrabat_id integer;
  END IF;
END $$;

-- Créer un index sur extrabat_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chantiers_extrabat_id ON chantiers(extrabat_id);

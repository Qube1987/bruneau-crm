/*
  # Ajouter les colonnes pour le statut final et l'archivage des opportunités

  1. Nouvelles colonnes
    - `statut_final` (text) - pour stocker le statut final (gagne, perdu, standby)
    - `archive` (boolean) - pour marquer les opportunités archivées

  2. Mise à jour
    - Ajouter les colonnes à la table opportunites
    - Définir des valeurs par défaut appropriées
*/

-- Ajouter la colonne statut_final
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'statut_final'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN statut_final text;
  END IF;
END $$;

-- Ajouter la colonne archive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'archive'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN archive boolean DEFAULT false;
  END IF;
END $$;
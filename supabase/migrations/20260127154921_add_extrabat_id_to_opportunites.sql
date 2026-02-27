/*
  # Ajout de la colonne extrabat_id à la table opportunites

  1. Modifications
    - Ajout de la colonne `extrabat_id` (integer, nullable) à la table `opportunites`
    - Cette colonne permet de lier une opportunité directement à un client Extrabat
    - Utile pour les saisies rapides qui sont ensuite liées à un client créé dans Extrabat

  2. Index
    - Ajout d'un index sur `extrabat_id` pour améliorer les performances de recherche
*/

-- Ajout de la colonne extrabat_id à la table opportunites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'extrabat_id'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN extrabat_id integer;
  END IF;
END $$;

-- Ajout d'un index sur extrabat_id
CREATE INDEX IF NOT EXISTS idx_opportunites_extrabat_id ON opportunites(extrabat_id);

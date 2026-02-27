/*
  # Ajouter colonne actif à la table prospects

  1. Modifications
    - Ajouter la colonne `actif` de type boolean avec valeur par défaut `true`
    - Cette colonne permettra de marquer les prospects comme actifs ou inactifs
    - Les prospects inactifs ne seront pas affichés dans la liste principale
    - Ils pourront être retrouvés via la recherche

  2. Sécurité
    - Pas de changement aux politiques RLS existantes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'actif'
  ) THEN
    ALTER TABLE prospects ADD COLUMN actif boolean DEFAULT true;
  END IF;
END $$;
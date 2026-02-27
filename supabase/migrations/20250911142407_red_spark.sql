/*
  # Ajouter le champ commentaires aux actions commerciales

  1. Modifications
    - Ajouter la colonne `commentaires` à la table `actions_commerciales`
    - Type: text avec valeur par défaut vide
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'actions_commerciales' AND column_name = 'commentaires'
  ) THEN
    ALTER TABLE actions_commerciales ADD COLUMN commentaires text DEFAULT '';
  END IF;
END $$;
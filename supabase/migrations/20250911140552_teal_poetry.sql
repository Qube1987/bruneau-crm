/*
  # Ajouter description et commentaires aux salariés

  1. Modifications
    - Ajouter colonne `description` à `actions_commerciales_salaries`
    - Ajouter colonne `commentaires` à `actions_commerciales_salaries`
  
  2. Colonnes ajoutées
    - `description` (text, nullable) - Description de l'intérêt du salarié
    - `commentaires` (text, nullable) - Commentaires sur le salarié
*/

-- Ajouter la colonne description si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'actions_commerciales_salaries' AND column_name = 'description'
  ) THEN
    ALTER TABLE actions_commerciales_salaries ADD COLUMN description TEXT;
  END IF;
END $$;

-- Ajouter la colonne commentaires si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'actions_commerciales_salaries' AND column_name = 'commentaires'
  ) THEN
    ALTER TABLE actions_commerciales_salaries ADD COLUMN commentaires TEXT;
  END IF;
END $$;
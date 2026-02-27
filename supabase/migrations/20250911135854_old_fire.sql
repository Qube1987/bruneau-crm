/*
  # Ajouter la colonne commentaires à la table prospection_actions

  1. Modifications
    - Ajouter la colonne `commentaires` de type TEXT à la table `prospection_actions`
    - La colonne est nullable pour permettre les valeurs vides
    - Valeur par défaut : chaîne vide

  2. Notes
    - Cette colonne permet de stocker des commentaires additionnels pour chaque action de prospection
    - Compatible avec l'interface TypeScript existante
*/

-- Ajouter la colonne commentaires à la table prospection_actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospection_actions' AND column_name = 'commentaires'
  ) THEN
    ALTER TABLE prospection_actions ADD COLUMN commentaires TEXT DEFAULT '';
  END IF;
END $$;
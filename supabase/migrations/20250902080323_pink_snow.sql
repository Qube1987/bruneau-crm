/*
  # Ajouter champ date de travaux estimée

  1. Modifications
    - Ajouter colonne `date_travaux_estimee` à la table `opportunites`
    - Type: date (nullable)
    - Permet de planifier les travaux estimés pour chaque opportunité
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'date_travaux_estimee'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN date_travaux_estimee date;
  END IF;
END $$;
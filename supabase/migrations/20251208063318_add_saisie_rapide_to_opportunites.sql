/*
  # Ajout champ saisie rapide aux opportunités

  1. Modifications
    - Ajout du champ `saisie_rapide` à la table `opportunites`
      - Type: boolean
      - Valeur par défaut: false
      - Description: Indique si l'opportunité a été créée via la saisie rapide
  
  2. Notes
    - Les opportunités créées en saisie rapide ne déclenchent pas l'appel à l'API Extrabat
    - Permet de compléter les informations ultérieurement
    - Un badge visuel indique les opportunités incomplètes
*/

-- Ajouter le champ saisie_rapide
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'saisie_rapide'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN saisie_rapide boolean DEFAULT false;
  END IF;
END $$;
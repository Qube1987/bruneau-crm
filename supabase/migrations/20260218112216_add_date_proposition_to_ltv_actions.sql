/*
  # Ajout de la date de proposition aux actions LTV

  ## Description
  Cette migration ajoute une colonne `date_proposition` à la table `ltv_actions` pour
  enregistrer la date à laquelle chaque action a été proposée au client. Cette date permet
  de cadencer les différentes actions commerciales et de suivre le timing des propositions.

  ## Modifications
    - `ltv_actions`
      - Ajout colonne `date_proposition` (timestamptz) : Date à laquelle l'action a été proposée au client

  ## Notes importantes
    - Cette date est distincte de `date_action` (date de réalisation effective)
    - Elle permet de suivre le délai entre la proposition et la réalisation
    - Utile pour analyser l'efficacité des actions commerciales
*/

-- Ajouter la colonne date_proposition
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ltv_actions' AND column_name = 'date_proposition'
  ) THEN
    ALTER TABLE ltv_actions ADD COLUMN date_proposition timestamptz;
  END IF;
END $$;

-- Créer un index pour améliorer les performances des requêtes sur date_proposition
CREATE INDEX IF NOT EXISTS idx_ltv_actions_date_proposition ON ltv_actions(date_proposition);
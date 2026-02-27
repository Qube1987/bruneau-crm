/*
  # Ajouter champ Avis Google

  1. Modifications
    - Ajouter colonne `avis_google` à la table `prospect_actions_commerciales`
    - Valeur par défaut : 'solliciter'
    - Choix possibles : 'solliciter', 'deja_fait'

  2. Sécurité
    - Aucune modification RLS nécessaire (table existante)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospect_actions_commerciales' AND column_name = 'avis_google'
  ) THEN
    ALTER TABLE prospect_actions_commerciales ADD COLUMN avis_google text DEFAULT 'solliciter';
  END IF;
END $$;
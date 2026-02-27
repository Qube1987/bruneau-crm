/*
  # Ajout des champs de rendez-vous pour les interactions

  1. Modifications
    - Ajoute le champ `date_rdv_debut` (timestamp with time zone) à la table `interactions`
      - Stocke la date et heure de début du rendez-vous pour les interactions physiques
    - Ajoute le champ `date_rdv_fin` (timestamp with time zone) à la table `interactions`
      - Stocke la date et heure de fin du rendez-vous pour les interactions physiques
    - Ces champs sont optionnels et utilisés uniquement pour les interactions de type "physique"

  2. Notes
    - Ces champs permettent de synchroniser les rendez-vous avec l'agenda Extrabat
    - Les champs sont nullable car tous les types d'interactions n'ont pas besoin de RDV
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'date_rdv_debut'
  ) THEN
    ALTER TABLE interactions ADD COLUMN date_rdv_debut timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'date_rdv_fin'
  ) THEN
    ALTER TABLE interactions ADD COLUMN date_rdv_fin timestamptz;
  END IF;
END $$;
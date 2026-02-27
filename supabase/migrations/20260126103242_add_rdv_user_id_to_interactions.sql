/*
  # Ajout du champ utilisateur pour les rendez-vous

  1. Modifications
    - Ajoute le champ `rdv_user_id` (text) à la table `interactions`
      - Stocke l'identifiant de l'utilisateur assigné au rendez-vous
      - Correspond aux codes utilisateurs Extrabat (46516, 218599, 485533, 47191, 467514)
    
  2. Notes
    - Ce champ est optionnel et utilisé uniquement pour les interactions de type "physique"
    - Permet de synchroniser les rendez-vous avec l'utilisateur approprié dans Extrabat
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'rdv_user_id'
  ) THEN
    ALTER TABLE interactions ADD COLUMN rdv_user_id text;
  END IF;
END $$;

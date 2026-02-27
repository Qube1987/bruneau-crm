/*
  # Ajouter colonne commentaires à la table opportunites

  1. Modifications
    - Ajouter la colonne `commentaires` à la table `opportunites`
    - Type TEXT pour permettre des commentaires longs
    - Valeur par défaut : chaîne vide
    - Nullable pour la compatibilité

  2. Sécurité
    - Utilise IF NOT EXISTS pour éviter les erreurs si la colonne existe déjà
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'commentaires'
  ) THEN
    ALTER TABLE opportunites ADD COLUMN commentaires TEXT DEFAULT '' NULL;
  END IF;
END $$;
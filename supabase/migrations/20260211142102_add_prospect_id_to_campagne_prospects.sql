/*
  # Ajout du support de saisie manuelle des prospects dans les campagnes

  ## Modifications

  1. Ajout de la colonne `prospect_id` dans `campagne_prospects`
     - Référence vers la table `prospects`
     - Permet de lier les prospects saisis manuellement
     - NULL pour les prospects Extrabat uniquement

  2. Modification de `client_extrabat_id` pour le rendre nullable
     - Permet de différencier les prospects Extrabat (avec client_extrabat_id)
     - Des prospects saisis manuellement (avec prospect_id mais sans client_extrabat_id)

  ## Notes importantes

  - Un prospect peut avoir soit un `client_extrabat_id`, soit un `prospect_id`, soit les deux
  - Les deux champs ne peuvent pas être NULL en même temps (validation applicative)
*/

-- Ajouter la colonne prospect_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campagne_prospects' AND column_name = 'prospect_id'
  ) THEN
    ALTER TABLE campagne_prospects ADD COLUMN prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Créer un index pour la performance
CREATE INDEX IF NOT EXISTS idx_campagne_prospects_prospect_id ON campagne_prospects(prospect_id);

-- Rendre client_extrabat_id nullable
ALTER TABLE campagne_prospects ALTER COLUMN client_extrabat_id DROP NOT NULL;

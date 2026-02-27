/*
  # Modifier la colonne extrabat_id pour permettre les valeurs NULL
  
  1. Modification
    - Rendre la colonne `extrabat_id` nullable dans la table `prospects`
    - Supprimer la contrainte UNIQUE existante
    - Ajouter une nouvelle contrainte UNIQUE qui ignore les valeurs NULL
  
  2. Raison
    - Les prospects créés via saisie rapide n'ont pas encore d'ID Extrabat
    - Ils seront créés dans Extrabat plus tard
    - La contrainte UNIQUE doit seulement s'appliquer aux valeurs non-NULL
*/

-- Supprimer la contrainte UNIQUE existante
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_extrabat_id_key;

-- Modifier la colonne pour permettre les valeurs NULL
ALTER TABLE prospects ALTER COLUMN extrabat_id DROP NOT NULL;

-- Créer un index unique partiel qui ignore les valeurs NULL
CREATE UNIQUE INDEX IF NOT EXISTS prospects_extrabat_id_unique_idx 
ON prospects(extrabat_id) 
WHERE extrabat_id IS NOT NULL;
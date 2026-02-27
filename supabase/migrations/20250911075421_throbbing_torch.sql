/*
  # Ajouter une source aux prospects pour différencier fidélisation et devis

  1. Modifications
    - Ajouter une colonne `source` à la table `prospects`
    - Valeurs possibles : 'fidelisation', 'devis', 'prospection'
    - Mettre à jour les prospects existants comme 'devis' par défaut

  2. Index
    - Ajouter un index sur la colonne source pour optimiser les requêtes
*/

-- Ajouter la colonne source
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS source text DEFAULT 'devis';

-- Mettre à jour tous les prospects existants comme étant de source 'devis'
UPDATE prospects SET source = 'devis' WHERE source IS NULL;

-- Ajouter une contrainte pour limiter les valeurs possibles
ALTER TABLE prospects ADD CONSTRAINT prospects_source_check 
  CHECK (source IN ('fidelisation', 'devis', 'prospection'));

-- Ajouter un index pour optimiser les requêtes par source
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
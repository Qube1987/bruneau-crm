/*
  # Ajout des données commerciales pour les prospects

  1. Nouvelles Tables
    - `prospect_types_ouvrage`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key)
      - `type_ouvrage` (text)
      - `statut` (text) - possede, interesse, pas_interesse
    - `prospect_actions_commerciales`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key)
      - `contrat_maintenance` (text)
      - `telesurveillance` (text)
      - `parrainage` (text)
      - `commentaires` (text)

  2. Sécurité
    - Enable RLS sur les nouvelles tables
    - Politiques d'accès public pour les données commerciales
*/

-- Table pour les types d'ouvrage
CREATE TABLE IF NOT EXISTS prospect_types_ouvrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  type_ouvrage text NOT NULL,
  statut text NOT NULL DEFAULT 'pas_interesse',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(prospect_id, type_ouvrage)
);

-- Table pour les actions commerciales
CREATE TABLE IF NOT EXISTS prospect_actions_commerciales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  contrat_maintenance text DEFAULT 'a_proposer',
  telesurveillance text DEFAULT 'a_proposer',
  parrainage text DEFAULT 'a_proposer',
  commentaires text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(prospect_id)
);

-- Enable RLS
ALTER TABLE prospect_types_ouvrage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_actions_commerciales ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès
CREATE POLICY "Accès libre prospect_types_ouvrage"
  ON prospect_types_ouvrage
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Accès libre prospect_actions_commerciales"
  ON prospect_actions_commerciales
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_prospect_types_ouvrage_prospect_id 
  ON prospect_types_ouvrage(prospect_id);

CREATE INDEX IF NOT EXISTS idx_prospect_actions_commerciales_prospect_id 
  ON prospect_actions_commerciales(prospect_id);
/*
  # Créer la table des actions de prospection

  1. Nouvelle table
    - `prospection_actions`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key vers prospects)
      - `description` (text)
      - `responsable` (text)
      - `statut` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `prospection_actions`
    - Politique d'accès libre pour tous les utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS prospection_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsable text NOT NULL DEFAULT 'Quentin',
  statut text NOT NULL DEFAULT 'a_contacter' CHECK (statut IN ('a_contacter', 'contacte')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prospection_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès libre prospection_actions"
  ON prospection_actions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_prospection_actions_prospect_id 
  ON prospection_actions(prospect_id);

CREATE INDEX IF NOT EXISTS idx_prospection_actions_responsable 
  ON prospection_actions(responsable);

CREATE INDEX IF NOT EXISTS idx_prospection_actions_statut 
  ON prospection_actions(statut);
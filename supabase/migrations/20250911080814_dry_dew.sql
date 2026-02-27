/*
  # Création des tables pour les actions commerciales

  1. Nouvelles Tables
    - `actions_commerciales`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key vers prospects)
      - `type_action` (text) - type d'action commerciale
      - `contact_nom` (text) - nom du contact
      - `contact_prenom` (text) - prénom du contact
      - `contact_poste` (text) - poste du contact
      - `contact_telephone` (text) - téléphone du contact
      - `contact_email` (text) - email du contact
      - `statut` (text) - statut de l'action
      - `responsable` (text) - responsable de l'action
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `actions_commerciales_salaries`
      - `id` (uuid, primary key)
      - `action_commerciale_id` (uuid, foreign key vers actions_commerciales)
      - `nom` (text) - nom du salarié
      - `prenom` (text) - prénom du salarié
      - `telephone` (text) - téléphone du salarié
      - `email` (text) - email du salarié
      - `adresse` (text) - adresse du salarié
      - `code_postal` (text) - code postal
      - `ville` (text) - ville
      - `statut` (text) - statut du contact avec le salarié
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (temporary for development)
*/

-- Table des actions commerciales
CREATE TABLE IF NOT EXISTS actions_commerciales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  type_action text NOT NULL DEFAULT 'clients_pros_remise_salaries',
  contact_nom text NOT NULL,
  contact_prenom text,
  contact_poste text,
  contact_telephone text,
  contact_email text,
  statut text NOT NULL DEFAULT 'a_contacter',
  responsable text NOT NULL DEFAULT 'Quentin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des salariés intéressés
CREATE TABLE IF NOT EXISTS actions_commerciales_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_commerciale_id uuid REFERENCES actions_commerciales(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text,
  telephone text,
  email text,
  adresse text,
  code_postal text,
  ville text,
  statut text NOT NULL DEFAULT 'a_contacter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE actions_commerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_commerciales_salaries ENABLE ROW LEVEL SECURITY;

-- Policies for public access (development)
CREATE POLICY "Accès libre actions_commerciales"
  ON actions_commerciales
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Accès libre actions_commerciales_salaries"
  ON actions_commerciales_salaries
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_actions_commerciales_prospect_id 
  ON actions_commerciales(prospect_id);

CREATE INDEX IF NOT EXISTS idx_actions_commerciales_salaries_action_id 
  ON actions_commerciales_salaries(action_commerciale_id);
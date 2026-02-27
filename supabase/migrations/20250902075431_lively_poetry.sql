/*
  # Schéma CRM pour gestion des opportunités

  1. Nouvelles Tables
    - `prospects`
      - `id` (uuid, clé primaire)
      - `extrabat_id` (integer, ID du client dans Extrabat)
      - `nom` (text)
      - `prenom` (text)
      - `email` (text)
      - `telephone` (text)
      - `adresse` (text)
      - `code_postal` (text)
      - `ville` (text)
      - `civilite` (text)
      - `origine_contact` (text)
      - `suivi_par` (text)
      - `date_creation` (timestamp)
      - `date_modification` (timestamp)

    - `opportunites`
      - `id` (uuid, clé primaire)
      - `prospect_id` (uuid, référence vers prospects)
      - `titre` (text)
      - `description` (text)
      - `statut` (text)
      - `suivi_par` (text)
      - `montant_estime` (decimal)
      - `date_creation` (timestamp)
      - `date_modification` (timestamp)
      - `date_cloture` (timestamp)
      - `statut_cloture` (text)

    - `interactions`
      - `id` (uuid, clé primaire)
      - `opportunite_id` (uuid, référence vers opportunites)
      - `type` (text)
      - `description` (text)
      - `date` (timestamp)
      - `utilisateur` (text)

  2. Sécurité
    - Activation RLS sur toutes les tables
    - Politiques pour utilisateurs authentifiés
*/

-- Table des prospects (clients sélectionnés depuis Extrabat)
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  nom text NOT NULL,
  prenom text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  civilite text,
  origine_contact text,
  suivi_par text NOT NULL DEFAULT 'Quentin',
  date_creation timestamptz DEFAULT now(),
  date_modification timestamptz DEFAULT now()
);

-- Table des opportunités
CREATE TABLE IF NOT EXISTS opportunites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text DEFAULT '',
  statut text NOT NULL DEFAULT 'a-contacter',
  suivi_par text NOT NULL DEFAULT 'Quentin',
  montant_estime decimal(10,2),
  date_creation timestamptz DEFAULT now(),
  date_modification timestamptz DEFAULT now(),
  date_cloture timestamptz,
  statut_cloture text
);

-- Table des interactions
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id uuid REFERENCES opportunites(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  date timestamptz DEFAULT now(),
  utilisateur text NOT NULL
);

-- Activation RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (accès libre pour l'instant, à adapter selon vos besoins)
CREATE POLICY "Accès libre prospects"
  ON prospects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Accès libre opportunites"
  ON opportunites
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Accès libre interactions"
  ON interactions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_prospects_extrabat_id ON prospects(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_prospect_id ON opportunites(prospect_id);
CREATE INDEX IF NOT EXISTS idx_interactions_opportunite_id ON interactions(opportunite_id);
/*
  # Création des tables pour les paramètres Extrabat

  1. Nouvelles Tables
    - `extrabat_utilisateurs` - Stockage des utilisateurs Extrabat
    - `extrabat_civilites` - Stockage des civilités
    - `extrabat_origines_contact` - Stockage des origines de contact
    - `extrabat_questions_complementaires` - Stockage des questions complémentaires
    - `extrabat_regroupements` - Stockage des regroupements
    - `extrabat_client_statuts` - Stockage des statuts clients
    - `extrabat_type_adresse` - Stockage des types d'adresse
    - `extrabat_type_telephone` - Stockage des types de téléphone
    - `extrabat_sync_log` - Log des synchronisations

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politique d'accès libre pour toutes les tables (lecture/écriture)

  3. Index
    - Index sur les champs extrabat_id pour optimiser les recherches
*/

-- Table des utilisateurs Extrabat
CREATE TABLE IF NOT EXISTS extrabat_utilisateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  nom text NOT NULL,
  email text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des civilités
CREATE TABLE IF NOT EXISTS extrabat_civilites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  professionnel boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des origines de contact
CREATE TABLE IF NOT EXISTS extrabat_origines_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des questions complémentaires
CREATE TABLE IF NOT EXISTS extrabat_questions_complementaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  type text,
  ordre integer DEFAULT 0,
  obligatoire boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des regroupements
CREATE TABLE IF NOT EXISTS extrabat_regroupements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des statuts clients
CREATE TABLE IF NOT EXISTS extrabat_client_statuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  corbeille boolean DEFAULT false,
  planning boolean DEFAULT false,
  restreint boolean DEFAULT false,
  ordre integer DEFAULT 0,
  prospect boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des types d'adresse
CREATE TABLE IF NOT EXISTS extrabat_type_adresse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des types de téléphone
CREATE TABLE IF NOT EXISTS extrabat_type_telephone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de log des synchronisations
CREATE TABLE IF NOT EXISTS extrabat_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  sync_status text NOT NULL, -- 'success', 'error', 'partial'
  records_synced integer DEFAULT 0,
  error_message text,
  sync_date timestamptz DEFAULT now()
);

-- Enable RLS sur toutes les tables
ALTER TABLE extrabat_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_civilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_origines_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_questions_complementaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_regroupements ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_client_statuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_type_adresse ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_type_telephone ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_sync_log ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès libre pour toutes les tables
CREATE POLICY "Accès libre extrabat_utilisateurs" ON extrabat_utilisateurs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_civilites" ON extrabat_civilites FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_origines_contact" ON extrabat_origines_contact FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_questions_complementaires" ON extrabat_questions_complementaires FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_regroupements" ON extrabat_regroupements FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_client_statuts" ON extrabat_client_statuts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_type_adresse" ON extrabat_type_adresse FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_type_telephone" ON extrabat_type_telephone FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_sync_log" ON extrabat_sync_log FOR ALL TO public USING (true) WITH CHECK (true);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_extrabat_utilisateurs_extrabat_id ON extrabat_utilisateurs(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_civilites_extrabat_id ON extrabat_civilites(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_origines_contact_extrabat_id ON extrabat_origines_contact(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_questions_complementaires_extrabat_id ON extrabat_questions_complementaires(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_regroupements_extrabat_id ON extrabat_regroupements(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_client_statuts_extrabat_id ON extrabat_client_statuts(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_type_adresse_extrabat_id ON extrabat_type_adresse(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_type_telephone_extrabat_id ON extrabat_type_telephone(extrabat_id);
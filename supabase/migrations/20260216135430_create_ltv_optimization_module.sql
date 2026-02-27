/*
  # Module d'Optimisation de la Valeur à Vie Client (LTV)

  ## Description
  Cette migration crée le module permettant de gérer l'optimisation de la valeur à vie client
  après la finalisation d'un chantier. Elle permet de suivre et automatiser les actions
  commerciales post-installation pour maximiser la valeur récurrente.

  ## Modifications des tables existantes
    - `chantiers`
      - Ajout colonne `statut` (text) : 'en_cours' ou 'finalise'
      - Ajout colonne `date_finalisation` (timestamptz) : Date de finalisation du chantier
      - Ajout colonne `ltv_score` (integer) : Score calculé de la valeur à vie (0-10+)

  ## Nouvelles tables
    - `ltv_actions`
      - `id` (uuid, primary key) - Identifiant unique de l'action
      - `chantier_id` (uuid, foreign key) - Référence vers le chantier
      - `categorie` (text) - Catégorie : 'reputation', 'parrainage', 'contrat_recurrent', 'upsell'
      - `action` (text) - Nom de l'action spécifique
      - `statut` (text) - Statut : 'a_faire', 'en_cours', 'fait', 'refus'
      - `date_action` (timestamptz) - Date de réalisation de l'action
      - `date_echeance` (timestamptz) - Date d'échéance pour l'action
      - `commentaires` (text) - Commentaires sur l'action
      - `parrainages_obtenus` (integer) - Nombre de parrainages obtenus (si applicable)
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de dernière modification

  ## Sécurité
    - Active RLS sur la table `ltv_actions`
    - Politiques permettant aux utilisateurs authentifiés de gérer les actions LTV

  ## Notes importantes
    - Lorsqu'un chantier passe en statut 'finalise', une checklist d'actions LTV est générée automatiquement
    - Le score LTV est calculé en fonction des actions réalisées
    - Les actions peuvent avoir des échéances pour déclencher des rappels
*/

-- Ajouter les colonnes au chantier pour le module LTV
DO $$
BEGIN
  -- Colonne statut
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'statut'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN statut text DEFAULT 'en_cours';
  END IF;

  -- Colonne date_finalisation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'date_finalisation'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN date_finalisation timestamptz;
  END IF;

  -- Colonne ltv_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'ltv_score'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN ltv_score integer DEFAULT 0;
  END IF;
END $$;

-- Ajouter une contrainte pour le statut
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chantiers_statut_check'
  ) THEN
    ALTER TABLE chantiers ADD CONSTRAINT chantiers_statut_check 
    CHECK (statut IN ('en_cours', 'finalise'));
  END IF;
END $$;

-- Créer la table ltv_actions
CREATE TABLE IF NOT EXISTS ltv_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  categorie text NOT NULL,
  action text NOT NULL,
  statut text DEFAULT 'a_faire',
  date_action timestamptz,
  date_echeance timestamptz,
  commentaires text DEFAULT '',
  parrainages_obtenus integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter des contraintes sur les valeurs possibles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ltv_actions_categorie_check'
  ) THEN
    ALTER TABLE ltv_actions ADD CONSTRAINT ltv_actions_categorie_check 
    CHECK (categorie IN ('reputation', 'parrainage', 'contrat_recurrent', 'upsell'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ltv_actions_statut_check'
  ) THEN
    ALTER TABLE ltv_actions ADD CONSTRAINT ltv_actions_statut_check 
    CHECK (statut IN ('a_faire', 'en_cours', 'fait', 'refus'));
  END IF;
END $$;

-- Activer RLS sur ltv_actions
ALTER TABLE ltv_actions ENABLE ROW LEVEL SECURITY;

-- Politiques pour ltv_actions
CREATE POLICY "Utilisateurs authentifiés peuvent voir les actions LTV"
  ON ltv_actions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer des actions LTV"
  ON ltv_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les actions LTV"
  ON ltv_actions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les actions LTV"
  ON ltv_actions
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chantiers_statut ON chantiers(statut);
CREATE INDEX IF NOT EXISTS idx_chantiers_ltv_score ON chantiers(ltv_score);
CREATE INDEX IF NOT EXISTS idx_ltv_actions_chantier_id ON ltv_actions(chantier_id);
CREATE INDEX IF NOT EXISTS idx_ltv_actions_categorie ON ltv_actions(categorie);
CREATE INDEX IF NOT EXISTS idx_ltv_actions_statut ON ltv_actions(statut);
CREATE INDEX IF NOT EXISTS idx_ltv_actions_date_echeance ON ltv_actions(date_echeance);

-- Fonction pour calculer le score LTV d'un chantier
CREATE OR REPLACE FUNCTION calculate_ltv_score(chantier_uuid uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  action_record RECORD;
BEGIN
  -- Parcourir toutes les actions "fait" pour ce chantier
  FOR action_record IN 
    SELECT action, categorie, parrainages_obtenus 
    FROM ltv_actions 
    WHERE chantier_id = chantier_uuid AND statut = 'fait'
  LOOP
    CASE action_record.action
      -- Réputation
      WHEN 'avis_google_recu' THEN score := score + 1;
      WHEN 'avis_google_repondu' THEN score := score + 1;
      
      -- Parrainage
      WHEN 'parrainage_propose' THEN score := score + 1;
      WHEN 'parrainage_accepte' THEN score := score + (2 * COALESCE(action_record.parrainages_obtenus, 0));
      
      -- Contrat récurrent
      WHEN 'contrat_maintenance_signe' THEN score := score + 2;
      WHEN 'telesurveillance_active' THEN score := score + 3;
      
      -- Upsell
      WHEN 'detecteurs_ext_installes' THEN score := score + 1;
      WHEN 'detecteurs_incendie_installes' THEN score := score + 1;
      WHEN 'protection_perimetre_installee' THEN score := score + 1;
      WHEN 'maintenance_planifiee' THEN score := score + 1;
      WHEN 'audit_cyber_realise' THEN score := score + 1;
      
      ELSE score := score + 0;
    END CASE;
  END LOOP;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer automatiquement la checklist LTV
CREATE OR REPLACE FUNCTION generate_ltv_checklist(chantier_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Bloc 1 - Réputation
  INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) VALUES
    (chantier_uuid, 'reputation', 'avis_google_envoye', now() + interval '3 days'),
    (chantier_uuid, 'reputation', 'avis_google_recu', now() + interval '7 days'),
    (chantier_uuid, 'reputation', 'avis_google_repondu', now() + interval '10 days');
  
  -- Bloc 2 - Parrainage
  INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) VALUES
    (chantier_uuid, 'parrainage', 'parrainage_propose', now() + interval '30 days'),
    (chantier_uuid, 'parrainage', 'coupon_envoye', now() + interval '35 days'),
    (chantier_uuid, 'parrainage', 'parrainage_accepte', now() + interval '90 days');
  
  -- Bloc 3 - Contrat récurrent
  INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) VALUES
    (chantier_uuid, 'contrat_recurrent', 'maintenance_propose', now() + interval '30 days'),
    (chantier_uuid, 'contrat_recurrent', 'contrat_maintenance_signe', now() + interval '45 days'),
    (chantier_uuid, 'contrat_recurrent', 'telesurveillance_propose', now() + interval '30 days'),
    (chantier_uuid, 'contrat_recurrent', 'telesurveillance_active', now() + interval '60 days');
  
  -- Bloc 4 - Upsell technique
  INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) VALUES
    (chantier_uuid, 'upsell', 'detecteurs_ext_proposes', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'detecteurs_ext_installes', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'detecteurs_incendie_proposes', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'detecteurs_incendie_installes', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'protection_perimetre_proposee', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'protection_perimetre_installee', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'maintenance_proposee', now() + interval '180 days'),
    (chantier_uuid, 'upsell', 'maintenance_planifiee', now() + interval '180 days'),
    (chantier_uuid, 'upsell', 'audit_cyber_propose', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'audit_cyber_realise', now() + interval '120 days');
END;
$$ LANGUAGE plpgsql;

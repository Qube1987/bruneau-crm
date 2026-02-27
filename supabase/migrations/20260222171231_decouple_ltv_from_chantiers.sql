/*
  # Dissocier les actions LTV des chantiers et les lier aux prospects

  ## Description
  Cette migration transforme le module LTV pour qu'il soit lié aux clients/prospects plutôt qu'aux chantiers.
  Le chantier devient un simple déclencheur initial, mais les actions LTV appartiennent au client.

  ## Modifications apportées
  
  ### Table `ltv_actions`
    - Ajouter `prospect_id` (uuid, foreign key vers prospects)
    - Rendre `chantier_id` nullable (optionnel, pour historique)
    - Ajouter `date_proposition` (timestamptz) - Date de proposition de l'action au client
    
  ### Table `prospects`
    - Ajouter `ltv_actif` (boolean) - Indique si le client est dans le programme LTV
    - Ajouter `ltv_date_inscription` (timestamptz) - Date d'inscription au programme LTV
    - Ajouter `ltv_score` (integer) - Score LTV du client (déplacé depuis chantiers)
    
  ### Fonctions
    - Modifier `calculate_ltv_score` pour calculer par prospect_id au lieu de chantier_id
    - Modifier `generate_ltv_checklist` pour générer par prospect_id
    - Créer `enroll_client_in_ltv` pour inscrire un client au programme LTV

  ## Sécurité
    - Maintenir les mêmes politiques RLS sur ltv_actions
    
  ## Migration des données existantes
    - Les actions LTV existantes seront migrées vers les prospects via leur chantier
    - Les scores LTV des chantiers seront copiés vers les prospects
*/

-- 1. Ajouter les colonnes LTV aux prospects
DO $$
BEGIN
  -- Colonne ltv_actif
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'ltv_actif'
  ) THEN
    ALTER TABLE prospects ADD COLUMN ltv_actif boolean DEFAULT false;
  END IF;

  -- Colonne ltv_date_inscription
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'ltv_date_inscription'
  ) THEN
    ALTER TABLE prospects ADD COLUMN ltv_date_inscription timestamptz;
  END IF;

  -- Colonne ltv_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospects' AND column_name = 'ltv_score'
  ) THEN
    ALTER TABLE prospects ADD COLUMN ltv_score integer DEFAULT 0;
  END IF;
END $$;

-- 2. Ajouter prospect_id à ltv_actions et rendre chantier_id nullable
DO $$
BEGIN
  -- Ajouter prospect_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ltv_actions' AND column_name = 'prospect_id'
  ) THEN
    ALTER TABLE ltv_actions ADD COLUMN prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE;
  END IF;

  -- Ajouter date_proposition
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ltv_actions' AND column_name = 'date_proposition'
  ) THEN
    ALTER TABLE ltv_actions ADD COLUMN date_proposition timestamptz;
  END IF;
END $$;

-- 3. Migrer les données existantes: lier les actions LTV aux prospects via opportunites
DO $$
BEGIN
  -- Mettre à jour prospect_id pour toutes les actions existantes
  UPDATE ltv_actions la
  SET prospect_id = o.prospect_id,
      date_proposition = la.created_at
  FROM chantiers c
  JOIN opportunites o ON c.opportunite_id = o.id
  WHERE la.chantier_id = c.id
    AND la.prospect_id IS NULL;

  -- Activer le programme LTV pour tous les prospects qui ont des actions
  UPDATE prospects
  SET ltv_actif = true,
      ltv_date_inscription = (
        SELECT MIN(created_at)
        FROM ltv_actions
        WHERE ltv_actions.prospect_id = prospects.id
      )
  WHERE id IN (
    SELECT DISTINCT prospect_id
    FROM ltv_actions
    WHERE prospect_id IS NOT NULL
  );

  -- Copier les scores LTV des chantiers vers les prospects
  UPDATE prospects p
  SET ltv_score = COALESCE(
    (SELECT MAX(c.ltv_score)
     FROM chantiers c
     JOIN opportunites o ON c.opportunite_id = o.id
     WHERE o.prospect_id = p.id
     AND c.ltv_score > 0),
    0
  )
  WHERE ltv_actif = true;
END $$;

-- 4. Rendre chantier_id nullable après migration
DO $$
BEGIN
  -- Supprimer la contrainte NOT NULL sur chantier_id
  ALTER TABLE ltv_actions ALTER COLUMN chantier_id DROP NOT NULL;
END $$;

-- 5. Créer des index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_prospects_ltv_actif ON prospects(ltv_actif);
CREATE INDEX IF NOT EXISTS idx_prospects_ltv_score ON prospects(ltv_score);
CREATE INDEX IF NOT EXISTS idx_ltv_actions_prospect_id ON ltv_actions(prospect_id);

-- 6. Supprimer et recréer la fonction calculate_ltv_score pour calculer par prospect
DROP FUNCTION IF EXISTS calculate_ltv_score(uuid);

CREATE OR REPLACE FUNCTION calculate_ltv_score(prospect_uuid uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  action_record RECORD;
BEGIN
  -- Parcourir toutes les actions "fait" pour ce prospect
  FOR action_record IN 
    SELECT action, categorie, parrainages_obtenus 
    FROM ltv_actions 
    WHERE prospect_id = prospect_uuid AND statut = 'fait'
  LOOP
    CASE action_record.action
      -- Réputation
      WHEN 'avis_google_recu' THEN score := score + 1;
      WHEN 'avis_google_repondu' THEN score := score + 1;
      WHEN 'appel_satisfaction_realise' THEN score := score + 1;
      
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
      WHEN 'boules_blockfire_installees' THEN score := score + 1;
      WHEN 'detection_inondation_installee' THEN score := score + 1;
      WHEN 'electrovanne_installee' THEN score := score + 1;
      
      ELSE score := score + 0;
    END CASE;
  END LOOP;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- 7. Supprimer et recréer la fonction generate_ltv_checklist pour générer par prospect
DROP FUNCTION IF EXISTS generate_ltv_checklist(uuid);

CREATE OR REPLACE FUNCTION generate_ltv_checklist(prospect_uuid uuid, chantier_uuid uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Bloc 1 - Réputation
  INSERT INTO ltv_actions (prospect_id, chantier_id, categorie, action, date_echeance, date_proposition) VALUES
    (prospect_uuid, chantier_uuid, 'reputation', 'appel_satisfaction_realise', now() + interval '2 days', now()),
    (prospect_uuid, chantier_uuid, 'reputation', 'avis_google_envoye', now() + interval '3 days', now()),
    (prospect_uuid, chantier_uuid, 'reputation', 'avis_google_recu', now() + interval '7 days', now()),
    (prospect_uuid, chantier_uuid, 'reputation', 'avis_google_repondu', now() + interval '10 days', now());
  
  -- Bloc 2 - Parrainage
  INSERT INTO ltv_actions (prospect_id, chantier_id, categorie, action, date_echeance, date_proposition) VALUES
    (prospect_uuid, chantier_uuid, 'parrainage', 'parrainage_propose', now() + interval '30 days', now()),
    (prospect_uuid, chantier_uuid, 'parrainage', 'coupon_envoye', now() + interval '35 days', now()),
    (prospect_uuid, chantier_uuid, 'parrainage', 'parrainage_accepte', now() + interval '90 days', now());
  
  -- Bloc 3 - Contrat récurrent
  INSERT INTO ltv_actions (prospect_id, chantier_id, categorie, action, date_echeance, date_proposition) VALUES
    (prospect_uuid, chantier_uuid, 'contrat_recurrent', 'maintenance_propose', now() + interval '30 days', now()),
    (prospect_uuid, chantier_uuid, 'contrat_recurrent', 'contrat_maintenance_signe', now() + interval '45 days', now()),
    (prospect_uuid, chantier_uuid, 'contrat_recurrent', 'telesurveillance_propose', now() + interval '30 days', now()),
    (prospect_uuid, chantier_uuid, 'contrat_recurrent', 'telesurveillance_active', now() + interval '60 days', now());
  
  -- Bloc 4 - Upsell technique
  INSERT INTO ltv_actions (prospect_id, chantier_id, categorie, action, date_echeance, date_proposition) VALUES
    (prospect_uuid, chantier_uuid, 'upsell', 'detecteurs_ext_proposes', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'detecteurs_ext_installes', now() + interval '120 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'detecteurs_incendie_proposes', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'detecteurs_incendie_installes', now() + interval '120 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'protection_perimetre_proposee', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'protection_perimetre_installee', now() + interval '120 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'maintenance_proposee', now() + interval '180 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'maintenance_planifiee', now() + interval '180 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'boules_blockfire_proposees', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'boules_blockfire_installees', now() + interval '120 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'detection_inondation_proposee', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'detection_inondation_installee', now() + interval '120 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'electrovanne_proposee', now() + interval '90 days', now()),
    (prospect_uuid, chantier_uuid, 'upsell', 'electrovanne_installee', now() + interval '120 days', now());
END;
$$ LANGUAGE plpgsql;

-- 8. Créer une fonction pour inscrire un client au programme LTV
CREATE OR REPLACE FUNCTION enroll_client_in_ltv(prospect_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Activer le programme LTV pour ce prospect
  UPDATE prospects
  SET ltv_actif = true,
      ltv_date_inscription = now()
  WHERE id = prospect_uuid;

  -- Générer la checklist LTV (sans chantier associé)
  PERFORM generate_ltv_checklist(prospect_uuid, NULL);
END;
$$ LANGUAGE plpgsql;

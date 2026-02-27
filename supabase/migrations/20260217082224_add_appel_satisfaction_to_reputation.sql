/*
  # Ajout de l'appel de satisfaction dans la catégorie Réputation

  ## Description
  Cette migration ajoute une nouvelle action "Appel de satisfaction" dans la catégorie réputation
  du module LTV pour permettre le suivi des appels de satisfaction client.

  ## Modifications
  1. Mise à jour de la fonction calculate_ltv_score pour inclure l'appel de satisfaction
  2. Mise à jour de la fonction generate_ltv_checklist pour générer automatiquement cette action
  3. Ajout de l'action aux chantiers finalisés existants qui n'ont pas déjà cette action

  ## Actions ajoutées
  - `appel_satisfaction_fait` : Appel de satisfaction réalisé (+1 point au score)

  ## Notes importantes
  - Cette action compte pour 1 point dans le score LTV
  - Elle est générée automatiquement 7 jours après la finalisation d'un chantier
  - Elle est ajoutée à tous les chantiers finalisés existants
*/

-- Mettre à jour la fonction calculate_ltv_score pour inclure l'appel de satisfaction
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
      WHEN 'appel_satisfaction_fait' THEN score := score + 1;
      
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

-- Mettre à jour la fonction generate_ltv_checklist pour inclure l'appel de satisfaction
CREATE OR REPLACE FUNCTION generate_ltv_checklist(chantier_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Bloc 1 - Réputation
  INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) VALUES
    (chantier_uuid, 'reputation', 'avis_google_envoye', now() + interval '3 days'),
    (chantier_uuid, 'reputation', 'avis_google_recu', now() + interval '7 days'),
    (chantier_uuid, 'reputation', 'avis_google_repondu', now() + interval '10 days'),
    (chantier_uuid, 'reputation', 'appel_satisfaction_fait', now() + interval '7 days');
  
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
    (chantier_uuid, 'upsell', 'boules_blockfire_proposees', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'boules_blockfire_installees', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'detection_inondation_proposee', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'detection_inondation_installee', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'electrovanne_proposee', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'electrovanne_installee', now() + interval '120 days');
END;
$$ LANGUAGE plpgsql;

-- Ajouter l'action appel de satisfaction aux chantiers finalisés existants
DO $$
DECLARE
  chantier_record RECORD;
BEGIN
  FOR chantier_record IN 
    SELECT id FROM chantiers WHERE statut = 'finalise'
  LOOP
    -- Vérifier si l'action n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM ltv_actions 
      WHERE chantier_id = chantier_record.id 
      AND action = 'appel_satisfaction_fait'
    ) THEN
      INSERT INTO ltv_actions (chantier_id, categorie, action, date_echeance) 
      VALUES (chantier_record.id, 'reputation', 'appel_satisfaction_fait', now() + interval '7 days');
    END IF;
  END LOOP;
END $$;
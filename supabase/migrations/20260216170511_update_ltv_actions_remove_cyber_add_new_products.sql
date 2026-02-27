/*
  # Mise à jour des actions LTV - Remplacement audit cyber par nouveaux produits

  ## Description
  Cette migration met à jour le module LTV en :
  - Supprimant les actions liées à l'audit cybersécurité
  - Ajoutant les nouvelles actions pour les produits :
    - Boules Block'Fire (proposées/installées)
    - Détection inondation (proposée/installée)
    - Electrovanne (proposée/installée)

  ## Modifications
  1. Suppression des anciennes actions cyber des chantiers existants
  2. Mise à jour de la fonction generate_ltv_checklist pour générer les nouvelles actions
  3. Mise à jour de la fonction calculate_ltv_score pour calculer le score avec les nouvelles actions

  ## Notes importantes
  - Les chantiers existants verront leurs actions cyber supprimées
  - Les nouveaux chantiers finalisés auront automatiquement les nouvelles actions
  - Le score LTV sera recalculé pour prendre en compte les nouvelles actions
*/

-- Supprimer les actions d'audit cybersécurité existantes
DELETE FROM ltv_actions 
WHERE action IN ('audit_cyber_propose', 'audit_cyber_realise');

-- Mettre à jour la fonction calculate_ltv_score
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
      WHEN 'boules_blockfire_installees' THEN score := score + 1;
      WHEN 'detection_inondation_installee' THEN score := score + 1;
      WHEN 'electrovanne_installee' THEN score := score + 1;
      
      ELSE score := score + 0;
    END CASE;
  END LOOP;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la fonction generate_ltv_checklist
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
    (chantier_uuid, 'upsell', 'boules_blockfire_proposees', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'boules_blockfire_installees', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'detection_inondation_proposee', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'detection_inondation_installee', now() + interval '120 days'),
    (chantier_uuid, 'upsell', 'electrovanne_proposee', now() + interval '90 days'),
    (chantier_uuid, 'upsell', 'electrovanne_installee', now() + interval '120 days');
END;
$$ LANGUAGE plpgsql;

-- Recalculer tous les scores LTV pour les chantiers finalisés
DO $$
DECLARE
  chantier_record RECORD;
  new_score integer;
BEGIN
  FOR chantier_record IN 
    SELECT id FROM chantiers WHERE statut = 'finalise'
  LOOP
    new_score := calculate_ltv_score(chantier_record.id);
    UPDATE chantiers SET ltv_score = new_score WHERE id = chantier_record.id;
  END LOOP;
END $$;
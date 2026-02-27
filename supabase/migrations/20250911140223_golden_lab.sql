/*
  # Mise à jour de la contrainte source pour inclure actions_commerciales

  1. Modifications
    - Suppression de l'ancienne contrainte prospects_source_check
    - Ajout de la nouvelle contrainte incluant 'actions_commerciales'
  
  2. Valeurs autorisées
    - 'fidelisation'
    - 'devis' 
    - 'prospection'
    - 'actions_commerciales'
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_source_check;

-- Ajouter la nouvelle contrainte avec actions_commerciales
ALTER TABLE prospects ADD CONSTRAINT prospects_source_check 
CHECK (source = ANY (ARRAY['fidelisation'::text, 'devis'::text, 'prospection'::text, 'actions_commerciales'::text]));
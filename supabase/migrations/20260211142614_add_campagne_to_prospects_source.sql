/*
  # Ajout de 'campagne' aux sources de prospects autorisées

  ## Modifications

  1. Modification de la contrainte `prospects_source_check`
     - Ajout de la valeur 'campagne' aux sources autorisées
     - Permet aux prospects créés via les campagnes commerciales d'être enregistrés

  ## Valeurs autorisées après la migration
  - 'fidelisation'
  - 'devis'
  - 'prospection'
  - 'actions_commerciales'
  - 'campagne' (nouveau)
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_source_check;

-- Recréer la contrainte avec 'campagne' ajouté
ALTER TABLE prospects ADD CONSTRAINT prospects_source_check 
CHECK (source = ANY (ARRAY['fidelisation'::text, 'devis'::text, 'prospection'::text, 'actions_commerciales'::text, 'campagne'::text]));

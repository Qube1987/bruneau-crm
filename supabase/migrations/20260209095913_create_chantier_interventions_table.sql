/*
  # Création de la table chantier_interventions

  ## Objectif
  Stocker les interventions planifiées pour les chantiers avec les techniciens affectés,
  les dates/heures de début et fin, et l'ID du rendez-vous Extrabat pour synchronisation.

  ## 1. Nouvelle table
    - `chantier_interventions`
      - `id` (uuid, clé primaire)
      - `chantier_id` (uuid, foreign key vers chantiers)
      - `started_at` (timestamptz, date/heure de début)
      - `ended_at` (timestamptz, date/heure de fin)
      - `technician_ids` (text[], liste des IDs des techniciens affectés)
      - `notes` (text, notes d'intervention optionnelles)
      - `extrabat_appointment_id` (text, ID du RDV Extrabat pour synchronisation)
      - `created_at` (timestamptz, date de création)
      - `updated_at` (timestamptz, date de modification)

  ## 2. Sécurité
    - Active RLS sur la table
    - Politique SELECT : utilisateurs authentifiés peuvent voir toutes les interventions
    - Politique INSERT : utilisateurs authentifiés peuvent créer des interventions
    - Politique UPDATE : utilisateurs authentifiés peuvent modifier des interventions
    - Politique DELETE : utilisateurs authentifiés peuvent supprimer des interventions

  ## 3. Index
    - Index sur `chantier_id` pour améliorer les performances de recherche
*/

-- Créer la table chantier_interventions
CREATE TABLE IF NOT EXISTS chantier_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  technician_ids text[] DEFAULT '{}',
  notes text,
  extrabat_appointment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE chantier_interventions ENABLE ROW LEVEL SECURITY;

-- Politique SELECT
CREATE POLICY "Utilisateurs authentifiés peuvent voir les interventions"
  ON chantier_interventions
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT
CREATE POLICY "Utilisateurs authentifiés peuvent créer des interventions"
  ON chantier_interventions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique UPDATE
CREATE POLICY "Utilisateurs authentifiés peuvent modifier des interventions"
  ON chantier_interventions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique DELETE
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer des interventions"
  ON chantier_interventions
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chantier_interventions_chantier_id 
  ON chantier_interventions(chantier_id);
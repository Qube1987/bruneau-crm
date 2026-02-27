/*
  # Création de la table prospect_interactions

  1. Nouvelle table
    - `prospect_interactions`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key vers prospects)
      - `type` (text, type d'interaction: telephonique, physique, mail)
      - `description` (text, description de l'interaction)
      - `date` (timestamptz, date de l'interaction)
      - `utilisateur` (text, utilisateur ayant créé l'interaction)
      - `date_rdv_debut` (timestamptz, nullable, date de début du RDV)
      - `date_rdv_fin` (timestamptz, nullable, date de fin du RDV)
      - `rdv_user_id` (text, nullable, utilisateur concerné par le RDV)
      - `created_at` (timestamptz, date de création)
  
  2. Sécurité
    - Enable RLS sur la table `prospect_interactions`
    - Policy pour permettre la lecture à tous les utilisateurs authentifiés
    - Policy pour permettre l'insertion aux utilisateurs authentifiés
    - Policy pour permettre la mise à jour aux utilisateurs authentifiés
    - Policy pour permettre la suppression aux utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS prospect_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('telephonique', 'physique', 'mail')),
  description text NOT NULL,
  date timestamptz DEFAULT now(),
  utilisateur text NOT NULL,
  date_rdv_debut timestamptz,
  date_rdv_fin timestamptz,
  rdv_user_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent lire les interactions"
  ON prospect_interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer des interactions"
  ON prospect_interactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les interactions"
  ON prospect_interactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les interactions"
  ON prospect_interactions FOR DELETE
  TO authenticated
  USING (true);
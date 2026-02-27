/*
  # Création de la table prospect_contacts

  1. Nouvelle table
    - `prospect_contacts`
      - `id` (uuid, primary key)
      - `prospect_id` (uuid, foreign key vers prospects)
      - `nom` (text, nom du contact)
      - `prenom` (text, nullable, prénom du contact)
      - `telephone` (text, nullable, numéro de téléphone)
      - `email` (text, nullable, adresse email)
      - `fonction` (text, nullable, fonction/poste du contact)
      - `principal` (boolean, indique si c'est le contact principal)
      - `created_at` (timestamptz, date de création)
      - `updated_at` (timestamptz, date de modification)
  
  2. Sécurité
    - Enable RLS sur la table `prospect_contacts`
    - Policy pour permettre la lecture à tous les utilisateurs authentifiés
    - Policy pour permettre l'insertion aux utilisateurs authentifiés
    - Policy pour permettre la mise à jour aux utilisateurs authentifiés
    - Policy pour permettre la suppression aux utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text,
  telephone text,
  email text,
  fonction text,
  principal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prospect_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent lire les contacts"
  ON prospect_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer des contacts"
  ON prospect_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les contacts"
  ON prospect_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les contacts"
  ON prospect_contacts FOR DELETE
  TO authenticated
  USING (true);
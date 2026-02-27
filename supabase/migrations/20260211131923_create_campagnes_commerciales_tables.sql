/*
  # Création des tables pour les campagnes commerciales

  ## Nouvelles tables
  
  ### `campagnes_commerciales`
  Gère les campagnes d'actions commerciales
  - `id` (uuid, clé primaire) - Identifiant unique de la campagne
  - `titre` (text) - Titre de la campagne
  - `description` (text) - Description détaillée de la campagne
  - `objectif_montant` (numeric) - Objectif de chiffre d'affaires en euros
  - `user_id` (uuid) - ID du commercial créateur (référence auth.users)
  - `created_at` (timestamptz) - Date de création
  - `updated_at` (timestamptz) - Date de dernière modification
  
  ### `campagne_prospects`
  Gère les prospects associés à chaque campagne
  - `id` (uuid, clé primaire) - Identifiant unique
  - `campagne_id` (uuid) - Référence à la campagne
  - `client_extrabat_id` (integer) - ID du client dans Extrabat
  - `client_nom` (text) - Nom du client (dénormalisé pour performance)
  - `montant` (numeric) - Montant estimé de l'opportunité
  - `commentaires` (text) - Commentaires et notes
  - `statut` (text) - Statut : 'a_contacter', 'contacte', 'transforme', 'decline'
  - `created_at` (timestamptz) - Date d'ajout
  - `updated_at` (timestamptz) - Date de dernière modification

  ## Sécurité
  
  1. RLS activé sur toutes les tables
  2. Les utilisateurs authentifiés peuvent :
     - Créer leurs propres campagnes
     - Voir toutes les campagnes (visibilité d'équipe)
     - Modifier uniquement leurs propres campagnes
     - Ajouter/modifier des prospects sur toutes les campagnes (collaboration d'équipe)
*/

-- Créer la table campagnes_commerciales
CREATE TABLE IF NOT EXISTS campagnes_commerciales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  objectif_montant numeric DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer la table campagne_prospects
CREATE TABLE IF NOT EXISTS campagne_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id uuid REFERENCES campagnes_commerciales(id) ON DELETE CASCADE NOT NULL,
  client_extrabat_id integer NOT NULL,
  client_nom text NOT NULL,
  montant numeric DEFAULT 0,
  commentaires text DEFAULT '',
  statut text DEFAULT 'a_contacter' CHECK (statut IN ('a_contacter', 'contacte', 'transforme', 'decline')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_campagnes_user_id ON campagnes_commerciales(user_id);
CREATE INDEX IF NOT EXISTS idx_campagne_prospects_campagne_id ON campagne_prospects(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_prospects_statut ON campagne_prospects(statut);

-- Activer RLS sur campagnes_commerciales
ALTER TABLE campagnes_commerciales ENABLE ROW LEVEL SECURITY;

-- Activer RLS sur campagne_prospects
ALTER TABLE campagne_prospects ENABLE ROW LEVEL SECURITY;

-- Politiques pour campagnes_commerciales

-- Lecture : tous les utilisateurs authentifiés peuvent voir toutes les campagnes
CREATE POLICY "Authenticated users can view all campaigns"
  ON campagnes_commerciales FOR SELECT
  TO authenticated
  USING (true);

-- Insertion : les utilisateurs peuvent créer leurs propres campagnes
CREATE POLICY "Users can create their own campaigns"
  ON campagnes_commerciales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Mise à jour : les utilisateurs peuvent modifier leurs propres campagnes
CREATE POLICY "Users can update their own campaigns"
  ON campagnes_commerciales FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression : les utilisateurs peuvent supprimer leurs propres campagnes
CREATE POLICY "Users can delete their own campaigns"
  ON campagnes_commerciales FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour campagne_prospects

-- Lecture : tous les utilisateurs authentifiés peuvent voir tous les prospects
CREATE POLICY "Authenticated users can view all campaign prospects"
  ON campagne_prospects FOR SELECT
  TO authenticated
  USING (true);

-- Insertion : tous les utilisateurs authentifiés peuvent ajouter des prospects
CREATE POLICY "Authenticated users can add prospects to campaigns"
  ON campagne_prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Mise à jour : tous les utilisateurs authentifiés peuvent modifier les prospects
CREATE POLICY "Authenticated users can update campaign prospects"
  ON campagne_prospects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Suppression : tous les utilisateurs authentifiés peuvent supprimer les prospects
CREATE POLICY "Authenticated users can delete campaign prospects"
  ON campagne_prospects FOR DELETE
  TO authenticated
  USING (true);
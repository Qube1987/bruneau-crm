/*
  # Création de la table chantiers

  ## Description
  Cette migration crée une nouvelle table pour gérer le suivi des chantiers issus des devis gagnés.
  Elle permet de suivre l'avancement d'un chantier à travers différentes étapes : commande, planification, réalisation.

  ## Nouvelles tables
    - `chantiers`
      - `id` (uuid, primary key) - Identifiant unique du chantier
      - `opportunite_id` (uuid, foreign key) - Référence vers l'opportunité (devis gagné)
      - `consignes` (text) - Consignes et instructions pour le chantier
      - `commande_passee` (boolean) - Indique si la commande a été passée
      - `commande_recue` (boolean) - Indique si la commande a été reçue
      - `chantier_planifie` (boolean) - Indique si le chantier a été planifié
      - `chantier_realise` (boolean) - Indique si le chantier a été réalisé
      - `date_commande_passee` (timestamptz) - Date de passage de la commande
      - `date_commande_recue` (timestamptz) - Date de réception de la commande
      - `date_chantier_planifie` (timestamptz) - Date de planification du chantier
      - `date_chantier_realise` (timestamptz) - Date de réalisation du chantier
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de dernière modification

  ## Sécurité
    - Active RLS sur la table `chantiers`
    - Ajoute une politique permettant aux utilisateurs authentifiés de lire tous les chantiers
    - Ajoute une politique permettant aux utilisateurs authentifiés de créer des chantiers
    - Ajoute une politique permettant aux utilisateurs authentifiés de modifier tous les chantiers
    - Ajoute une politique permettant aux utilisateurs authentifiés de supprimer des chantiers

  ## Notes importantes
    - Un chantier est lié à une opportunité unique
    - Les dates sont enregistrées automatiquement lors du changement d'état
    - Les consignes sont modifiables à tout moment
*/

-- Créer la table chantiers
CREATE TABLE IF NOT EXISTS chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id uuid REFERENCES opportunites(id) ON DELETE CASCADE NOT NULL,
  consignes text DEFAULT '',
  commande_passee boolean DEFAULT false,
  commande_recue boolean DEFAULT false,
  chantier_planifie boolean DEFAULT false,
  chantier_realise boolean DEFAULT false,
  date_commande_passee timestamptz,
  date_commande_recue timestamptz,
  date_chantier_planifie timestamptz,
  date_chantier_realise timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(opportunite_id)
);

-- Activer RLS
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : les utilisateurs authentifiés peuvent voir tous les chantiers
CREATE POLICY "Utilisateurs authentifiés peuvent voir les chantiers"
  ON chantiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT : les utilisateurs authentifiés peuvent créer des chantiers
CREATE POLICY "Utilisateurs authentifiés peuvent créer des chantiers"
  ON chantiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique UPDATE : les utilisateurs authentifiés peuvent modifier tous les chantiers
CREATE POLICY "Utilisateurs authentifiés peuvent modifier les chantiers"
  ON chantiers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique DELETE : les utilisateurs authentifiés peuvent supprimer des chantiers
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les chantiers"
  ON chantiers
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chantiers_opportunite_id ON chantiers(opportunite_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_chantier_realise ON chantiers(chantier_realise);
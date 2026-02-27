/*
  # Ajout de la table pour les photos d'opportunités

  1. Nouvelle table
    - `opportunite_photos`
      - `id` (uuid, primary key)
      - `opportunite_id` (uuid, foreign key vers opportunites)
      - `url` (text, URL publique de la photo)
      - `storage_path` (text, chemin dans Supabase Storage)
      - `file_name` (text, nom du fichier)
      - `file_size` (bigint, taille en octets)
      - `mime_type` (text, type MIME)
      - `uploaded_at` (timestamptz, date d'upload)
      - `uploaded_by` (uuid, référence à auth.users)

  2. Sécurité
    - Enable RLS sur `opportunite_photos`
    - Policies pour SELECT, INSERT, UPDATE, DELETE
*/

-- Créer la table
CREATE TABLE IF NOT EXISTS opportunite_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id uuid NOT NULL REFERENCES opportunites(id) ON DELETE CASCADE,
  url text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Activer Row Level Security
ALTER TABLE opportunite_photos ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : les utilisateurs authentifiés peuvent voir les photos
CREATE POLICY "Users can view opportunite photos"
  ON opportunite_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT : les utilisateurs authentifiés peuvent ajouter des photos
CREATE POLICY "Users can upload opportunite photos"
  ON opportunite_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Policy UPDATE : les utilisateurs peuvent modifier leurs propres photos
CREATE POLICY "Users can update their own photos"
  ON opportunite_photos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Policy DELETE : les utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
  ON opportunite_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunite_photos_opportunite_id
  ON opportunite_photos(opportunite_id);

CREATE INDEX IF NOT EXISTS idx_opportunite_photos_uploaded_by
  ON opportunite_photos(uploaded_by);
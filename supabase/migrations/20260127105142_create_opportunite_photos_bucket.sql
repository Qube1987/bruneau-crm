/*
  # Configuration du Storage pour les photos d'opportunités

  1. Bucket
    - Créer le bucket `opportunite-photos`
    - Configuration : public, taille max 10MB

  2. Policies
    - SELECT : tout le monde peut voir (photos publiques)
    - INSERT : utilisateurs authentifiés uniquement
    - UPDATE : propriétaire uniquement
    - DELETE : propriétaire uniquement
*/

-- Créer le bucket (public pour accès direct aux images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opportunite-photos',
  'opportunite-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy SELECT : tout le monde peut voir les photos (bucket public)
CREATE POLICY "Public photos are viewable by everyone"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'opportunite-photos');

-- Policy INSERT : utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'opportunite-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy UPDATE : utilisateurs peuvent mettre à jour leurs propres photos
CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'opportunite-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'opportunite-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy DELETE : utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'opportunite-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
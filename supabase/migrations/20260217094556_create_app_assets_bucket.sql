/*
  # Create app-assets storage bucket
  
  1. New Storage Bucket
    - `app-assets` bucket for storing application assets like QR codes, logos, etc.
    - Public access enabled for easy retrieval
    - File size limit set to 10MB
    - Allows common image formats
*/

-- Create the bucket for app assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

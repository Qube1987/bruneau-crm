import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseApi';

interface Photo {
  id: string;
  opportunite_id: string;
  url: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export function usePhotos(opportuniteId: string | null) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = async () => {
    if (!opportuniteId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('opportunite_photos')
        .select('*')
        .eq('opportunite_id', opportuniteId)
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Erreur lors du chargement des photos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [opportuniteId]);

  return {
    photos,
    loading,
    error,
    reload: loadPhotos
  };
}

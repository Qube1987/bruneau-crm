import { useState } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseApi';

interface Photo {
  id: string;
  url: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoDeleted: () => void;
}

export function PhotoGallery({ photos, onPhotoDeleted }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;

    setDeletingId(photo.id);

    try {
      const { error: dbError } = await supabase
        .from('opportunite_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from('opportunite-photos')
        .remove([photo.storage_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      onPhotoDeleted();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Erreur lors de la suppression de la photo');
    } finally {
      setDeletingId(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune photo pour le moment
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
            <img
              src={photo.url}
              alt={photo.file_name}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPhoto(photo)}
              loading="lazy"
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(photo);
              }}
              disabled={deletingId === photo.id}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === photo.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="truncate">{photo.file_name}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.file_name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-4 right-4 text-white text-center">
            <p className="text-lg font-medium">{selectedPhoto.file_name}</p>
            <p className="text-sm text-gray-300">
              {new Date(selectedPhoto.uploaded_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

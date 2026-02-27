import { useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseApi';

interface PhotoUploadProps {
  opportuniteId: string;
  onPhotoUploaded: () => void;
}

export function PhotoUpload({ opportuniteId, onPhotoUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(file => uploadPhoto(file));
      await Promise.all(uploadPromises);

      onPhotoUploaded();

      event.target.value = '';
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError('Erreur lors de l\'upload des photos');
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${opportuniteId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('opportunite-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('opportunite-photos')
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('opportunite_photos')
      .insert({
        opportunite_id: opportuniteId,
        url: publicUrl,
        storage_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      });

    if (dbError) {
      await supabase.storage
        .from('opportunite-photos')
        .remove([filePath]);
      throw dbError;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploading
              ? 'bg-primary-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 cursor-pointer'
          } text-white`}>
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Prendre une photo</span>
              </>
            )}
          </div>
        </label>

        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 cursor-pointer'
          } text-white`}>
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Choisir depuis la galerie</span>
              </>
            )}
          </div>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Formats acceptés : JPG, PNG, GIF, WebP (max 10MB par photo)
      </p>
    </div>
  );
}

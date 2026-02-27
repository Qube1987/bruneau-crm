import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { TypeInteraction } from '../types';
import { supabaseApi, Interaction } from '../services/supabaseApi';
import { TYPES_INTERACTION } from '../constants';

interface InteractionEditModalProps {
  interaction: Interaction;
  onClose: () => void;
  onInteractionUpdated: () => void;
  onInteractionDeleted: () => void;
}

const InteractionEditModal: React.FC<InteractionEditModalProps> = ({ 
  interaction, 
  onClose, 
  onInteractionUpdated,
  onInteractionDeleted 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    type: interaction.type as TypeInteraction,
    description: interaction.description,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    setIsLoading(true);
    try {
      await supabaseApi.updateInteraction(interaction.id, {
        type: formData.type,
        description: formData.description,
      });

      onInteractionUpdated();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'interaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette interaction ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await supabaseApi.deleteInteraction(interaction.id);
      onInteractionDeleted();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'interaction:', error);
      alert('Erreur lors de la suppression de l\'interaction');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Modifier l'interaction</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">
              {new Date(interaction.date).toLocaleDateString('fr-FR')} à {new Date(interaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-gray-600">Par {interaction.utilisateur}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'interaction *</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              {TYPES_INTERACTION.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              placeholder="Décrivez l'interaction..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.description.trim()}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InteractionEditModal;
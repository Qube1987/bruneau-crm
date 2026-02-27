import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { supabaseApi, ProspectionAction } from '../services/supabaseApi';
import { extrabatParametersService } from '../services/extrabatParametersService';

interface ProspectionActionModalProps {
  action: ProspectionAction;
  onClose: () => void;
  onUpdate: (updatedAction: ProspectionAction) => void;
  onDelete: (actionId: string) => void;
}

const ProspectionActionModal: React.FC<ProspectionActionModalProps> = ({ 
  action, 
  onClose, 
  onUpdate,
  onDelete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    description: action.description,
    responsable: action.responsable,
    statut: action.statut,
    commentaires: action.commentaires || '',
  });

  useEffect(() => {
    loadUtilisateurs();
  }, []);

  const loadUtilisateurs = async () => {
    try {
      const data = await extrabatParametersService.getUtilisateurs();
      setUtilisateurs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    setIsLoading(true);
    try {
      const updatedAction = await supabaseApi.updateProspectionAction(action.id, {
        description: formData.description,
        responsable: formData.responsable,
        statut: formData.statut,
        commentaires: formData.commentaires,
      });

      onUpdate(updatedAction);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'action de prospection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette action de prospection ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await supabaseApi.deleteProspectionAction(action.id);
      onDelete(action.id);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'action de prospection:', error);
      alert('Erreur lors de la suppression de l\'action de prospection');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Action de Prospection</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations du prospect */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {action.prospect?.civilite} {action.prospect?.nom} {action.prospect?.prenom}
            </h4>
            <div className="text-sm text-gray-600">
              {action.prospect?.email && <p>Email: {action.prospect.email}</p>}
              {action.prospect?.telephone && <p>Téléphone: {action.prospect.telephone}</p>}
              {action.prospect?.adresse && (
                <p>Adresse: {action.prospect.adresse}, {action.prospect.code_postal} {action.prospect.ville}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              placeholder="Décrivez l'action de prospection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Commentaires</label>
            <textarea
              value={formData.commentaires}
              onChange={(e) => handleInputChange('commentaires', e.target.value)}
              rows={3}
              placeholder="Ajoutez vos commentaires..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsable</label>
              <select
                value={formData.responsable}
                onChange={(e) => handleInputChange('responsable', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                  <option key={utilisateur.id} value={utilisateur.nom}>
                    {utilisateur.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => handleInputChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="a_contacter">À contacter</option>
                <option value="contacte">Contacté</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>Créé le {new Date(action.created_at).toLocaleDateString('fr-FR')} à {new Date(action.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            {action.updated_at !== action.created_at && (
              <p>Modifié le {new Date(action.updated_at).toLocaleDateString('fr-FR')} à {new Date(action.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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

export default ProspectionActionModal;
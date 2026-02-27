import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../services/supabaseApi';

interface ActionCommerciale {
  id: string;
  client_id: string;
  type_action: string;
  contact_nom: string;
  contact_prenom?: string;
  statut: string;
  responsable: string;
  prospect?: any;
}

interface SalarieModalProps {
  action: ActionCommerciale;
  onClose: () => void;
  onSalarieAdded: () => void;
}

const SalarieModal: React.FC<SalarieModalProps> = ({ action, onClose, onSalarieAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    commentaires: '',
    telephone: '',
    email: '',
    adresse: '',
    code_postal: '',
    ville: '',
    statut: 'a_contacter' as 'a_contacter' | 'contacte',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('actions_commerciales_salaries')
        .insert([{
          action_commerciale_id: action.id,
          nom: formData.nom,
          prenom: formData.prenom,
          commentaires: formData.commentaires,
          telephone: formData.telephone,
          email: formData.email,
          adresse: formData.adresse,
          code_postal: formData.code_postal,
          ville: formData.ville,
          statut: formData.statut,
        }]);

      if (error) throw error;

      onSalarieAdded();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du salarié:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Ajouter un salarié intéressé</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations de l'action commerciale */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Action commerciale: {action.prospect?.nom} {action.prospect?.prenom}
            </h4>
            <p className="text-sm text-gray-600">
              Contact: {action.contact_nom} {action.contact_prenom}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => handleInputChange('prenom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
              <input
                type="text"
                value={formData.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code postal</label>
              <input
                type="text"
                value={formData.code_postal}
                onChange={(e) => handleInputChange('code_postal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <input
                type="text"
                value={formData.ville}
                onChange={(e) => handleInputChange('ville', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.nom.trim()}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Ajout...' : 'Ajouter le salarié'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalarieModal;
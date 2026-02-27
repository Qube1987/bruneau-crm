import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
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

interface SalarieInteresse {
  id: string;
  action_commerciale_id: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  statut: 'a_contacter' | 'contacte';
  description?: string;
  commentaires?: string;
  created_at: string;
  updated_at: string;
}

interface SalarieEditModalProps {
  salarie: SalarieInteresse;
  action: ActionCommerciale;
  onClose: () => void;
  onSalarieUpdated: () => void;
  onSalarieDeleted: () => void;
}

const SalarieEditModal: React.FC<SalarieEditModalProps> = ({ 
  salarie, 
  action, 
  onClose, 
  onSalarieUpdated,
  onSalarieDeleted 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    nom: salarie.nom,
    prenom: salarie.prenom || '',
    commentaires: salarie.commentaires || '',
    telephone: salarie.telephone || '',
    email: salarie.email || '',
    adresse: salarie.adresse || '',
    code_postal: salarie.code_postal || '',
    ville: salarie.ville || '',
    statut: salarie.statut,
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
        .update({
          nom: formData.nom,
          prenom: formData.prenom,
          commentaires: formData.commentaires,
          telephone: formData.telephone,
          email: formData.email,
          adresse: formData.adresse,
          code_postal: formData.code_postal,
          ville: formData.ville,
          statut: formData.statut,
          updated_at: new Date().toISOString()
        })
        .eq('id', salarie.id);

      if (error) throw error;

      onSalarieUpdated();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du salarié:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce salarié ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('actions_commerciales_salaries')
        .delete()
        .eq('id', salarie.id);

      if (error) throw error;

      onSalarieDeleted();
    } catch (error) {
      console.error('Erreur lors de la suppression du salarié:', error);
      alert('Erreur lors de la suppression du salarié');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Modifier le salarié intéressé</h3>
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

          <div className="text-sm text-gray-500">
            <p>Créé le {new Date(salarie.created_at).toLocaleDateString('fr-FR')} à {new Date(salarie.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            {salarie.updated_at !== salarie.created_at && (
              <p>Modifié le {new Date(salarie.updated_at).toLocaleDateString('fr-FR')} à {new Date(salarie.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
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
              disabled={isLoading || !formData.nom.trim()}
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

export default SalarieEditModal;
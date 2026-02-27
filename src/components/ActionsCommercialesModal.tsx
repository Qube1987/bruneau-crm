import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseApi';
import { extrabatApi } from '../services/extrabatApi';
import { extrabatParametersService } from '../services/extrabatParametersService';

interface ActionCommerciale {
  id: string;
  client_id: string;
  type_action: string;
  contact_nom: string;
  contact_prenom?: string;
  contact_poste?: string;
  contact_telephone?: string;
  contact_email?: string;
  statut: string;
  responsable: string;
  commentaires?: string;
  created_at: string;
  updated_at: string;
  prospect?: any;
}

interface ActionsCommercialesModalProps {
  action: ActionCommerciale;
  onClose: () => void;
  onUpdate: (updatedAction: ActionCommerciale) => void;
  onDelete: (actionId: string) => void;
}

const TYPES_ACTION_COMMERCIALE = [
  { value: 'clients_pros_remise_salaries', label: 'Clients pros, remise aux salariés' }
];

const STATUTS_ACTION_COMMERCIALE = [
  { value: 'a_contacter', label: 'À contacter' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'relance', label: 'Relance' },
  { value: 'envoi_elements', label: 'Envoi des éléments de com' },
  { value: 'campagne_lancee', label: 'Campagne lancée' },
  { value: 'accepte', label: 'Accepté!' },
  { value: 'refuse', label: 'Refusé' },
];

const ActionsCommercialesModal: React.FC<ActionsCommercialesModalProps> = ({ 
  action, 
  onClose, 
  onUpdate,
  onDelete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type_action: action.type_action,
    contact_nom: action.contact_nom,
    contact_prenom: action.contact_prenom || '',
    contact_poste: action.contact_poste || '',
    contact_telephone: action.contact_telephone || '',
    contact_email: action.contact_email || '',
    statut: action.statut,
    responsable: action.responsable,
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

  const handleLoadClientData = async () => {
    setIsLoadingClientData(true);
    try {
      if (!action.prospect?.extrabat_id) {
        throw new Error('Aucun ID Extrabat trouvé pour ce prospect');
      }

      console.log('🔍 Récupération des détails pour le client Extrabat ID:', action.prospect.extrabat_id);
      const clientDetails = await extrabatApi.getClientDetails(action.prospect.extrabat_id);
      console.log('📋 Détails client récupérés:', clientDetails);
      
      // Mettre à jour les champs avec les données Extrabat
      setFormData(prev => ({
        ...prev,
        contact_nom: clientDetails.nom || prev.contact_nom,
        contact_prenom: clientDetails.prenom || prev.contact_prenom,
        contact_telephone: clientDetails.telephones?.[0]?.number || prev.contact_telephone,
        contact_email: clientDetails.email || prev.contact_email,
      }));
      
      console.log('✅ Données client mises à jour dans le formulaire:', {
        nom: clientDetails.nom,
        prenom: clientDetails.prenom,
        telephone: clientDetails.telephones?.[0]?.number,
        email: clientDetails.email
      });
      alert('Informations client récupérées avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données client:', error);
      alert(`Erreur lors de la récupération des données client: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsLoadingClientData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_nom.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('actions_commerciales')
        .update({
          type_action: formData.type_action,
          contact_nom: formData.contact_nom,
          contact_prenom: formData.contact_prenom,
          contact_poste: formData.contact_poste,
          contact_telephone: formData.contact_telephone,
          contact_email: formData.contact_email,
          statut: formData.statut,
          responsable: formData.responsable,
          commentaires: formData.commentaires,
          updated_at: new Date().toISOString()
        })
        .eq('id', action.id)
        .select(`
          *,
          prospect:clients(*),
          salaries:actions_commerciales_salaries(*)
        `)
        .single();

      if (error) throw error;

      onUpdate(data);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'action commerciale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette action commerciale ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('actions_commerciales')
        .delete()
        .eq('id', action.id);

      if (error) throw error;

      onDelete(action.id);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'action commerciale:', error);
      alert('Erreur lors de la suppression de l\'action commerciale');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Action Commerciale</h3>
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
            <div className="flex justify-between items-start">
              <div>
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
              <button
                type="button"
                onClick={handleLoadClientData}
                disabled={isLoadingClientData}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingClientData ? 'animate-spin' : ''}`} />
                {isLoadingClientData ? 'Chargement...' : 'Récupérer données Extrabat'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'action</label>
            <select
              value={formData.type_action}
              onChange={(e) => handleInputChange('type_action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {TYPES_ACTION_COMMERCIALE.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du contact *</label>
              <input
                type="text"
                value={formData.contact_nom}
                onChange={(e) => handleInputChange('contact_nom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom du contact</label>
              <input
                type="text"
                value={formData.contact_prenom}
                onChange={(e) => handleInputChange('contact_prenom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Poste</label>
              <input
                type="text"
                value={formData.contact_poste}
                onChange={(e) => handleInputChange('contact_poste', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.contact_telephone}
                onChange={(e) => handleInputChange('contact_telephone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
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
                {STATUTS_ACTION_COMMERCIALE.map((statut) => (
                  <option key={statut.value} value={statut.value}>
                    {statut.label}
                  </option>
                ))}
              </select>
            </div>

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
              disabled={isLoading || !formData.contact_nom.trim()}
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

export default ActionsCommercialesModal;
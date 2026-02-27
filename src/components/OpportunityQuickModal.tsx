import React, { useState } from 'react';
import { X, Save, Zap } from 'lucide-react';
import { supabaseApi } from '../services/supabaseApi';
import { useAuth } from '../contexts/AuthContext';

interface OpportunityQuickModalProps {
  onClose: () => void;
  onOpportunityCreated: () => void;
}

const OpportunityQuickModal: React.FC<OpportunityQuickModalProps> = ({ onClose, onOpportunityCreated }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom_client: '',
    telephone: '',
    email: '',
    adresse: '',
    description: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const prospectData = {
        nom: formData.nom_client || 'Client',
        prenom: '',
        email: formData.email || '',
        telephone: formData.telephone || '',
        adresse: formData.adresse || '',
        code_postal: '',
        ville: '',
        civilite: '',
        origine_contact: '',
        suivi_par: 'Quentin BRUNEAU',
        source: 'devis' as const,
      };

      const prospect = await supabaseApi.createProspect(prospectData);

      const opportuniteData = {
        client_id: prospect.id,
        titre: formData.nom_client || 'Client',
        description: formData.description || '',
        statut: 'a-contacter' as const,
        suivi_par: 'Quentin BRUNEAU',
        saisie_rapide: true,
      };

      const shouldSendSms = user?.email !== 'quentin@bruneau27.com';
      await supabaseApi.createOpportunite(opportuniteData, shouldSendSms);

      if (shouldSendSms) {
        console.log('[QUICK] SMS envoyé pour:', formData.nom_client);
      } else {
        console.log('[QUICK] SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      onOpportunityCreated();
    } catch (error) {
      console.error('Erreur lors de la création de l\'opportunité rapide:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Saisie Rapide</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Saisie rapide pour enregistrer une opportunité avec des informations minimales.
              Vous pourrez la compléter plus tard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client</label>
            <input
              type="text"
              value={formData.nom_client}
              onChange={(e) => handleInputChange('nom_client', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Ex: M. Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => handleInputChange('telephone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="06 12 34 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={formData.adresse}
              onChange={(e) => handleInputChange('adresse', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="123 Rue de la Paix"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Notes rapides sur l'opportunité..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Zap className="h-4 w-4" />
              {isLoading ? 'Création...' : 'Créer rapidement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunityQuickModal;

import React, { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';
import { TypeInteraction } from '../types';
import { supabaseApi, Opportunite } from '../services/supabaseApi';
import { TYPES_INTERACTION } from '../constants';
import { TimeSelector } from './TimeSelector';
import { extrabatParametersService } from '../services/extrabatParametersService';
import { useAuth } from '../contexts/AuthContext';

interface InteractionModalProps {
  opportunity?: Opportunite;
  opportuniteId?: string;
  onClose: () => void;
  onInteractionAdded: (data?: any) => void;
  isProspect?: boolean;
}

const InteractionModal: React.FC<InteractionModalProps> = ({ opportunity, opportuniteId, onClose, onInteractionAdded, isProspect = false }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [defaultUser, setDefaultUser] = useState<string>(opportunity?.suivi_par || 'Quentin BRUNEAU');

  const generateBaseDescription = (type: TypeInteraction) => {
    const typeConfig = TYPES_INTERACTION.find(t => t.value === type);
    const today = new Date().toLocaleDateString('fr-FR');
    return `Conversation ${typeConfig?.label} le ${today} : `;
  };

  const roundToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const formatDateTimeForInput = (date: Date) => {
    const roundedDate = roundToNearest15Minutes(date);
    const year = roundedDate.getFullYear();
    const month = String(roundedDate.getMonth() + 1).padStart(2, '0');
    const day = String(roundedDate.getDate()).padStart(2, '0');
    const hours = String(roundedDate.getHours()).padStart(2, '0');
    const minutes = String(roundedDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    type: 'telephonique' as TypeInteraction,
    description: generateBaseDescription('telephonique'),
    utilisateur: defaultUser,
    dateRdvDebut: formatDateTimeForInput(new Date()),
    dateRdvFin: formatDateTimeForInput(new Date(Date.now() + 30 * 60 * 1000)),
  });

  useEffect(() => {
    loadUtilisateurs();
    loadDefaultUser();
  }, []);

  const loadDefaultUser = async () => {
    if (user?.email) {
      try {
        const utilisateurs = await extrabatParametersService.getUtilisateurs();
        const currentUser = utilisateurs.find(u => u.email === user.email);
        if (currentUser) {
          setDefaultUser(currentUser.nom);
          setFormData(prev => ({ ...prev, utilisateur: currentUser.nom }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur par défaut:', error);
      }
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const data = await extrabatParametersService.getUtilisateurs();
      setUtilisateurs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  useEffect(() => {
    if (formData.dateRdvDebut && formData.type === 'physique') {
      const startDate = new Date(formData.dateRdvDebut);
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        const formattedEndDate = formatDateTimeForInput(endDate);
        if (formData.dateRdvFin !== formattedEndDate) {
          setFormData(prev => ({ ...prev, dateRdvFin: formattedEndDate }));
        }
      }
    }
  }, [formData.dateRdvDebut]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'type') {
      const newDescription = generateBaseDescription(value as TypeInteraction);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        description: newDescription
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    if (formData.type === 'physique' && (!formData.dateRdvDebut || !formData.dateRdvFin)) {
      alert('Veuillez renseigner les dates de début et de fin du rendez-vous');
      return;
    }

    setIsLoading(true);
    try {
      const interactionData = {
        type: formData.type,
        description: formData.description,
        utilisateur: formData.utilisateur,
        date: new Date().toISOString(),
        ...(formData.type === 'physique' && formData.dateRdvDebut && formData.dateRdvFin && {
          date_rdv_debut: new Date(formData.dateRdvDebut).toISOString(),
          date_rdv_fin: new Date(formData.dateRdvFin).toISOString(),
          rdv_user_id: formData.utilisateur,
        }),
      };

      if (isProspect) {
        onInteractionAdded(interactionData);
      } else {
        await supabaseApi.createInteraction({
          opportunite_id: opportunity?.id || opportuniteId!,
          ...interactionData,
        });
        onInteractionAdded();
      }

      onClose();
    } catch (error) {
      console.error('Erreur lors de la création de l\'interaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nouvelle Interaction</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isProspect && opportunity && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-gray-900">{opportunity.titre}</h4>
              <p className="text-sm text-gray-600">
                {opportunity.prospect?.nom} {opportunity.prospect?.prenom}
              </p>
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-2" />
              Utilisateur de l'interaction *
            </label>
            <select
              value={formData.utilisateur}
              onChange={(e) => handleInputChange('utilisateur', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              {utilisateurs.filter(u => u.actif).map((user) => (
                <option key={user.id} value={user.nom}>
                  {user.nom}
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

          {formData.type === 'physique' && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Informations du rendez-vous</h4>

                <div className="mb-4">
                  <TimeSelector
                    label="Date et heure de début"
                    value={formData.dateRdvDebut}
                    onChange={(value) => handleInputChange('dateRdvDebut', value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <TimeSelector
                    label="Date et heure de fin"
                    value={formData.dateRdvFin}
                    onChange={(value) => handleInputChange('dateRdvFin', value)}
                    required
                  />
                </div>

                <p className="text-xs text-gray-700 mt-2">Le rendez-vous sera automatiquement ajouté à votre agenda Extrabat</p>
              </div>
            </>
          )}

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

export default InteractionModal;
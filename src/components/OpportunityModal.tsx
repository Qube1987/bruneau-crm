import React, { useState, useEffect } from 'react';
import { X, Save, Plus, MessageSquare, Phone, Mail, MapPin, Video, Trash2 } from 'lucide-react';
import { StatutOpportunite, TypeInteraction } from '../types';
import { supabaseApi, Prospect } from '../services/supabaseApi';
import { STATUTS_OPPORTUNITE, TYPES_INTERACTION } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { extrabatParametersService } from '../services/extrabatParametersService';

interface OpportunityModalProps {
  onClose: () => void;
  onOpportunityCreated: () => void;
}

interface LocalInteraction {
  type: TypeInteraction;
  description: string;
  id: string;
}

const OpportunityModal: React.FC<OpportunityModalProps> = ({ onClose, onOpportunityCreated }) => {
  const { user } = useAuth();

  const generateBaseDescription = (type: TypeInteraction) => {
    const typeConfig = TYPES_INTERACTION.find(t => t.value === type);
    const today = new Date().toLocaleDateString('fr-FR');
    return `Conversation ${typeConfig?.label} le ${today} : `;
  };

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localInteractions, setLocalInteractions] = useState<LocalInteraction[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    titre: '',
    description: '',
    statut: 'a-contacter' as StatutOpportunite,
    suiviPar: 'Quentin BRUNEAU',
    montant_estime: '',
    date_travaux_estimee: '',
  });

  const [interactionFormData, setInteractionFormData] = useState({
    type: 'telephonique' as TypeInteraction,
    description: generateBaseDescription('telephonique'),
  });

  useEffect(() => {
    loadProspects();
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

  const loadProspects = async () => {
    try {
      const results = await supabaseApi.getProspects();
      setProspects(results);
    } catch (error) {
      console.error('Erreur lors du chargement des prospects:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInteractionInputChange = (field: string, value: string) => {
    if (field === 'type') {
      const newDescription = generateBaseDescription(value as TypeInteraction);
      setInteractionFormData(prev => ({
        ...prev,
        [field]: value,
        description: newDescription
      }));
    } else {
      setInteractionFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddLocalInteraction = () => {
    if (!interactionFormData.description.trim()) return;

    const newInteraction: LocalInteraction = {
      id: Date.now().toString(),
      type: interactionFormData.type,
      description: interactionFormData.description,
    };

    setLocalInteractions(prev => [...prev, newInteraction]);

    const newType = 'telephonique' as TypeInteraction;
    setInteractionFormData({
      type: newType,
      description: generateBaseDescription(newType),
    });
  };

  const handleRemoveLocalInteraction = (id: string) => {
    setLocalInteractions(prev => prev.filter(i => i.id !== id));
  };

  const getInteractionIcon = (type: TypeInteraction) => {
    switch (type) {
      case 'telephonique':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'visite':
        return <MapPin className="h-4 w-4" />;
      case 'visio':
        return <Video className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.titre) return;

    setIsLoading(true);
    try {
      console.log('[CLIENT] Début de la création de l\'opportunité');

      const newOpportunite = await supabaseApi.createOpportunite({
        client_id: formData.clientId,
        titre: formData.titre,
        description: formData.description,
        statut: formData.statut,
        suivi_par: formData.suiviPar,
        montant_estime: formData.montant_estime ? parseFloat(formData.montant_estime) : undefined,
        date_travaux_estimee: formData.date_travaux_estimee || undefined,
      }, false);

      console.log('[CLIENT] Opportunité créée:', newOpportunite.id);

      for (const interaction of localInteractions) {
        await supabaseApi.createInteraction({
          opportunite_id: newOpportunite.id,
          type: interaction.type,
          description: interaction.description,
          utilisateur: formData.suiviPar,
        });
      }

      console.log('[CLIENT] Interactions créées:', localInteractions.length);

      if (user?.email !== 'quentin@bruneau27.com') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log('[CLIENT] Variables env:', { supabaseUrl, hasKey: !!supabaseKey });
        console.log('[CLIENT] Préparation envoi SMS pour:', formData.titre);

        const smsUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;
        console.log('[CLIENT] URL complète:', smsUrl);

        const requestBody = {
          clientName: formData.titre,
          description: formData.description,
        };
        console.log('[CLIENT] Body:', requestBody);

        const smsResponse = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[CLIENT] Statut réponse:', smsResponse.status);
        const responseText = await smsResponse.text();
        console.log('[CLIENT] Réponse complète:', responseText);

        if (!smsResponse.ok) {
          console.error('[CLIENT] ERREUR SMS:', responseText);
        } else {
          console.log('[CLIENT] ✓ SMS ENVOYÉ AVEC SUCCÈS');
        }
      } else {
        console.log('[CLIENT] SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      console.log('[CLIENT] Appel de onOpportunityCreated');
      onOpportunityCreated();
    } catch (error) {
      console.error('[CLIENT] ERREUR GLOBALE:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log('[CLIENT] Fin du processus');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nouvelle Opportunité</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prospect *</label>
            <select
              value={formData.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un prospect</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.civilite} {prospect.nom} {prospect.prenom} - {prospect.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <input
              type="text"
              value={formData.titre}
              onChange={(e) => handleInputChange('titre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Section Interactions */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interactions ({localInteractions.length})
              </h4>
            </div>

            {/* Formulaire d'ajout d'interaction (toujours visible) */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'interaction *</label>
                <select
                  value={interactionFormData.type}
                  onChange={(e) => handleInteractionInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  value={interactionFormData.description}
                  onChange={(e) => handleInteractionInputChange('description', e.target.value)}
                  rows={3}
                  placeholder="Décrivez l'interaction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddLocalInteraction}
                  disabled={!interactionFormData.description.trim()}
                  className="px-3 py-1.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Liste des interactions ajoutées */}
            {localInteractions.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {localInteractions.map((interaction) => (
                  <div key={interaction.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 text-primary-900">
                        {getInteractionIcon(interaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {TYPES_INTERACTION.find(t => t.value === interaction.type)?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{interaction.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocalInteraction(interaction.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => handleInputChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {STATUTS_OPPORTUNITE.map((statut) => (
                  <option key={statut.value} value={statut.value}>
                    {statut.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suivi par</label>
              <select
                value={formData.suiviPar}
                onChange={(e) => handleInputChange('suiviPar', e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de travaux estimée</label>
            <input
              type="date"
              value={formData.date_travaux_estimee}
              onChange={(e) => handleInputChange('date_travaux_estimee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé (€)</label>
            <input
              type="number"
              value={formData.montant_estime}
              onChange={(e) => handleInputChange('montant_estime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
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
              disabled={isLoading || !formData.clientId || !formData.titre}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Création...' : 'Créer l\'opportunité'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunityModal;
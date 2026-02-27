import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { supabaseApi, Prospect, ProspectTypeOuvrage, ProspectActionCommerciale } from '../services/supabaseApi';
import { TYPES_OUVRAGE, STATUTS_TYPE_OUVRAGE, STATUTS_ACTION_COMMERCIALE, STATUTS_PARRAINAGE, STATUTS_AVIS_GOOGLE } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { extrabatParametersService } from '../services/extrabatParametersService';

interface ProspectDetailsModalProps {
  prospect: Prospect;
  onClose: () => void;
  onUpdate: () => void;
}

const ProspectDetailsModal: React.FC<ProspectDetailsModalProps> = ({ prospect, onClose, onUpdate }) => {
  const { user } = useAuth();

  const [typesOuvrage, setTypesOuvrage] = useState<ProspectTypeOuvrage[]>([]);
  const [actionsCommerciales, setActionsCommerciales] = useState<ProspectActionCommerciale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [devisAFaire, setDevisAFaire] = useState(false);
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);

  useEffect(() => {
    loadProspectData();
    loadUtilisateurs();
  }, [prospect.id]);

  const loadUtilisateurs = async () => {
    try {
      const data = await extrabatParametersService.getUtilisateurs();
      setUtilisateurs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const loadProspectData = async () => {
    setIsLoading(true);
    try {
      const [typesData, actionsData] = await Promise.all([
        supabaseApi.getProspectTypesOuvrage(prospect.id),
        supabaseApi.getProspectActionsCommerciales(prospect.id)
      ]);

      setTypesOuvrage(typesData);
      setActionsCommerciales(actionsData || {
        id: '',
        client_id: prospect.id,
        contrat_maintenance: 'a_proposer',
        telesurveillance: 'a_proposer',
        parrainage: 'a_proposer',
        avis_google: 'solliciter',
        commentaires: '',
        created_at: '',
        updated_at: ''
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeOuvrageChange = async (typeOuvrage: string, statut: string) => {
    try {
      await supabaseApi.upsertProspectTypeOuvrage(prospect.id, typeOuvrage, statut);
      
      // Mettre à jour l'état local
      setTypesOuvrage(prev => {
        const existing = prev.find(t => t.type_ouvrage === typeOuvrage);
        if (existing) {
          return prev.map(t => 
            t.type_ouvrage === typeOuvrage 
              ? { ...t, statut: statut as any }
              : t
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            client_id: prospect.id,
            type_ouvrage: typeOuvrage,
            statut: statut as any,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du type d\'ouvrage:', error);
    }
  };

  const handleActionsCommercialesChange = (field: string, value: string) => {
    if (!actionsCommerciales) return;
    
    setActionsCommerciales(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handleSaveActionsCommerciales = async () => {
    if (!actionsCommerciales) return;
    
    setIsSaving(true);
    try {
      await supabaseApi.upsertProspectActionsCommerciales(prospect.id, {
        contrat_maintenance: actionsCommerciales.contrat_maintenance,
        telesurveillance: actionsCommerciales.telesurveillance,
        parrainage: actionsCommerciales.parrainage,
        commentaires: actionsCommerciales.commentaires
      });
      
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDevisAFaireChange = (checked: boolean) => {
    setDevisAFaire(checked);
    if (!checked) {
      // Si on décoche, pas besoin de validation
      return;
    }
  };

  const handleCreateOpportunity = async () => {
    if (!actionsCommerciales) return;
    
    // Validation : vérifier que les commentaires sont remplis
    if (!actionsCommerciales.commentaires.trim()) {
      alert('Veuillez saisir une description dans les commentaires avant de créer le devis.');
      return;
    }
    
    setIsCreatingOpportunity(true);
    try {
      // Créer l'opportunité avec les données du prospect
      const opportunityTitle = `${prospect.nom} ${prospect.prenom || ''}`.trim();
      await supabaseApi.createOpportunite({
        client_id: prospect.id,
        titre: opportunityTitle,
        description: actionsCommerciales.commentaires,
        statut: 'recueil-besoin',
        suivi_par: prospect.suivi_par,
        montant_estime: undefined,
        date_travaux_estimee: undefined,
      }, false);

      if (user?.email !== 'quentin@bruneau27.com') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
          console.log('Envoi du SMS pour l\'opportunité:', opportunityTitle);
          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              opportunityTitle: opportunityTitle,
            }),
          });

          if (!smsResponse.ok) {
            console.error('Erreur lors de l\'envoi du SMS');
          } else {
            console.log('SMS envoyé avec succès');
          }
        } catch (smsError) {
          console.error('Erreur lors de l\'appel de la fonction SMS:', smsError);
        }
      } else {
        console.log('SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      // Décocher la case après création
      setDevisAFaire(false);

      // Notifier le succès
      alert('Opportunité créée avec succès !');

      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la création de l\'opportunité:', error);
      alert('Erreur lors de la création de l\'opportunité');
    } finally {
      setIsCreatingOpportunity(false);
    }
  };

  const getStatutTypeOuvrage = (typeOuvrage: string) => {
    const found = typesOuvrage.find(t => t.type_ouvrage === typeOuvrage);
    return found?.statut || 'pas_interesse';
  };

  const getStatutConfig = (statut: string) => {
    return STATUTS_TYPE_OUVRAGE.find(s => s.value === statut) || STATUTS_TYPE_OUVRAGE[2];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepte':
      case 'deja_sous_contrat':
      case 'deja_fait':
        return 'bg-green-500';
      case 'propose':
        return 'bg-orange-500';
      case 'refuse':
        return 'bg-red-500';
      case 'a_proposer':
      case 'solliciter':
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusTitle = (type: string, status: string) => {
    const statusLabels = {
      a_proposer: 'À proposer',
      propose: 'Proposé',
      accepte: 'Accepté',
      refuse: 'Refusé',
      deja_sous_contrat: 'Déjà sous contrat',
      solliciter: 'Solliciter',
      deja_fait: 'Déjà fait'
    };
    
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const handleToggleActive = async () => {
    setIsUpdatingStatus(true);
    try {
      await supabaseApi.updateProspect(prospect.id, {
        actif: !prospect.actif
      });
      
      // Mettre à jour le prospect local
      prospect.actif = !prospect.actif;
      
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSuiviParChange = async (newSuiviPar: string) => {
    try {
      await supabaseApi.updateProspect(prospect.id, {
        suivi_par: newSuiviPar
      });
      
      // Mettre à jour le prospect local
      prospect.suivi_par = newSuiviPar;
      
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du suivi par:', error);
    }
  };

  const handleDeleteProspect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prospect ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await supabaseApi.updateProspect(prospect.id, {
        actif: false
      });
      
      alert('Prospect désactivé avec succès');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la désactivation du prospect:', error);
      alert('Erreur lors de la désactivation du prospect');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-900">Détails du prospect</h3>
            
            {/* Toggle Actif/Inactif */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleActive}
                disabled={isUpdatingStatus}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  prospect.actif !== false
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {prospect.actif !== false ? (
                  <>
                    <ToggleRight className="h-4 w-4" />
                    Actif
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" />
                    Inactif
                  </>
                )}
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Informations du prospect */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  {prospect.civilite} {prospect.nom} {prospect.prenom}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  {prospect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{prospect.email}</span>
                    </div>
                  )}
                  
                  {prospect.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{prospect.telephone}</span>
                    </div>
                  )}
                  
                  {prospect.adresse && (
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {prospect.adresse}, {prospect.code_postal} {prospect.ville}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-gray-700">Suivi par :</label>
                    <select
                      value={prospect.suivi_par}
                      onChange={(e) => handleSuiviParChange(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                        <option key={utilisateur.id} value={utilisateur.nom}>
                          {utilisateur.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Actions commerciales avec voyants - à droite */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1 font-bold">Actions commerciales :</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-0 flex-1">Contrat maintenance</span>
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(actionsCommerciales?.contrat_maintenance || 'a_proposer')}`}
                      title={getStatusTitle('contrat_maintenance', actionsCommerciales?.contrat_maintenance || 'a_proposer')}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-0 flex-1">Télésurveillance</span>
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(actionsCommerciales?.telesurveillance || 'a_proposer')}`}
                      title={getStatusTitle('telesurveillance', actionsCommerciales?.telesurveillance || 'a_proposer')}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-0 flex-1">Parrainage</span>
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(actionsCommerciales?.parrainage || 'a_proposer')}`}
                      title={getStatusTitle('parrainage', actionsCommerciales?.parrainage || 'a_proposer')}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-0 flex-1">Avis Google</span>
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(actionsCommerciales?.avis_google || 'solliciter')}`}
                      title={getStatusTitle('avis_google', actionsCommerciales?.avis_google || 'solliciter')}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des données...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Section Actions commerciales */}
              {actionsCommerciales && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Actions commerciales</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contrat de maintenance
                        </label>
                        <select
                          value={actionsCommerciales.contrat_maintenance}
                          onChange={(e) => handleActionsCommercialesChange('contrat_maintenance', e.target.value)}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Télésurveillance
                        </label>
                        <select
                          value={actionsCommerciales.telesurveillance}
                          onChange={(e) => handleActionsCommercialesChange('telesurveillance', e.target.value)}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Parrainage
                        </label>
                        <select
                          value={actionsCommerciales.parrainage}
                          onChange={(e) => handleActionsCommercialesChange('parrainage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          {STATUTS_PARRAINAGE.map((statut) => (
                            <option key={statut.value} value={statut.value}>
                              {statut.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Avis Google
                        </label>
                        <select
                          value={actionsCommerciales.avis_google}
                          onChange={(e) => handleActionsCommercialesChange('avis_google', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          {STATUTS_AVIS_GOOGLE.map((statut) => (
                            <option key={statut.value} value={statut.value}>
                              {statut.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commentaires
                      </label>
                      <textarea
                        value={actionsCommerciales.commentaires}
                        onChange={(e) => handleActionsCommercialesChange('commentaires', e.target.value)}
                        rows={4}
                        placeholder="Ajoutez vos commentaires..."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          devisAFaire && !actionsCommerciales.commentaires.trim() 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                      />
                      {devisAFaire && !actionsCommerciales.commentaires.trim() && (
                        <p className="mt-1 text-sm text-red-600">
                          Description obligatoire pour créer un devis
                        </p>
                      )}
                    </div>

                    {/* Section Devis à faire */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="devis-a-faire"
                            checked={devisAFaire}
                            onChange={(e) => handleDevisAFaireChange(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor="devis-a-faire" className="text-sm font-medium text-gray-700">
                            Devis à faire
                          </label>
                        </div>
                        
                        {devisAFaire && (
                          <button
                            onClick={handleCreateOpportunity}
                            disabled={isCreatingOpportunity || !actionsCommerciales.commentaires.trim()}
                            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                          >
                            {isCreatingOpportunity ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Création...
                              </>
                            ) : (
                              'Créer l\'opportunité'
                            )}
                          </button>
                        )}
                      </div>
                      
                      {devisAFaire && (
                        <p className="mt-2 text-sm text-gray-600">
                          Une opportunité sera créée avec le titre "Devis - {prospect.nom} {prospect.prenom || ''}" et la description des commentaires.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section Types d'ouvrage */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Types d'ouvrage</h4>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type d'ouvrage</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Possède</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Intéressé</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Pas intéressé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {TYPES_OUVRAGE.map((typeOuvrage) => {
                        const currentStatut = getStatutTypeOuvrage(typeOuvrage);
                        
                        return (
                          <tr key={typeOuvrage} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {typeOuvrage}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`type-${typeOuvrage}`}
                                checked={currentStatut === 'possede'}
                                onChange={() => handleTypeOuvrageChange(typeOuvrage, 'possede')}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`type-${typeOuvrage}`}
                                checked={currentStatut === 'interesse'}
                                onChange={() => handleTypeOuvrageChange(typeOuvrage, 'interesse')}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`type-${typeOuvrage}`}
                                checked={currentStatut === 'pas_interesse'}
                                onChange={() => handleTypeOuvrageChange(typeOuvrage, 'pas_interesse')}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-8">
            <button
              onClick={handleDeleteProspect}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleSaveActionsCommerciales}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetailsModal;
import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, Users, Shield, Package, MessageSquare, Award, Mail, Gift, Eye } from 'lucide-react';
import { supabaseApi, Chantier, LtvAction, LtvCategorie } from '../services/supabaseApi';
import AvisGoogleEmailModal from './AvisGoogleEmailModal';
import ParrainageEmailModal from './ParrainageEmailModal';
import ContratMaintenanceEmailModal from './ContratMaintenanceEmailModal';
import TelesurveillanceEmailModal from './TelesurveillanceEmailModal';

interface ActionPair {
  id: string;
  label: string;
  proposeAction?: LtvAction;
  installeAction?: LtvAction;
  thirdAction?: LtvAction;
  parrainagesField?: boolean;
}

interface LtvChantierCardProps {
  chantier: Chantier;
  onUpdate: () => void;
}

const LtvChantierCard: React.FC<LtvChantierCardProps> = ({ chantier, onUpdate }) => {
  const [actions, setActions] = useState<LtvAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentValue, setCommentValue] = useState('');
  const [editingParrainages, setEditingParrainages] = useState<string | null>(null);
  const [parrainagesValue, setParrainagesValue] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showParrainageModal, setShowParrainageModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showTelesurveillanceModal, setShowTelesurveillanceModal] = useState(false);

  useEffect(() => {
    loadActions();
  }, [chantier.id]);

  const loadActions = async () => {
    setIsLoading(true);
    try {
      const data = await supabaseApi.getLtvActions(chantier.id);
      setActions(data);
    } catch (error) {
      console.error('Erreur lors du chargement des actions LTV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAction = async (action: LtvAction, isPropositionButton: boolean = false) => {
    try {
      const newStatut = action.statut === 'fait' ? 'a_faire' : 'fait';
      const updates: Partial<LtvAction> = {
        statut: newStatut,
        date_action: newStatut === 'fait' ? new Date().toISOString() : undefined,
      };

      if (isPropositionButton && newStatut === 'fait' && !action.date_proposition) {
        updates.date_proposition = new Date().toISOString();
      }

      await supabaseApi.updateLtvAction(action.id, updates);
      await supabaseApi.updateLtvScore(chantier.id);

      loadActions();
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'action:', error);
      alert('Erreur lors de la mise à jour de l\'action');
    }
  };

  const handleSaveComment = async (actionId: string) => {
    try {
      await supabaseApi.updateLtvAction(actionId, { commentaires: commentValue });
      setEditingComment(null);
      setCommentValue('');
      loadActions();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du commentaire:', error);
      alert('Erreur lors de la sauvegarde du commentaire');
    }
  };

  const handleSaveParrainages = async (actionId: string) => {
    try {
      await supabaseApi.updateLtvAction(actionId, { parrainages_obtenus: parrainagesValue });
      await supabaseApi.updateLtvScore(chantier.id);
      setEditingParrainages(null);
      setParrainagesValue(0);
      loadActions();
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des parrainages:', error);
      alert('Erreur lors de la sauvegarde des parrainages');
    }
  };

  const getCategorieIcon = (categorie: LtvCategorie) => {
    switch (categorie) {
      case 'reputation':
        return <Star className="w-5 h-5 text-yellow-600" />;
      case 'parrainage':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'contrat_recurrent':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'upsell':
        return <Package className="w-5 h-5 text-green-600" />;
    }
  };

  const getCategorieLabel = (categorie: LtvCategorie) => {
    switch (categorie) {
      case 'reputation':
        return 'Réputation';
      case 'parrainage':
        return 'Parrainage';
      case 'contrat_recurrent':
        return 'Contrats Récurrents';
      case 'upsell':
        return 'Upsell Technique';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'avis_google_envoye': 'Demande d\'avis Google envoyée',
      'avis_google_recu': 'Avis Google reçu',
      'avis_google_repondu': 'Avis répondu publiquement',
      'appel_satisfaction_fait': 'Appel de satisfaction réalisé',
      'parrainage_propose': 'Programme parrainage proposé',
      'coupon_envoye': 'Coupon de parrainage envoyé',
      'parrainage_accepte': 'Parrainages obtenus',
      'maintenance_propose': 'Contrat maintenance proposé',
      'contrat_maintenance_signe': 'Contrat maintenance signé',
      'telesurveillance_propose': 'Télésurveillance proposée',
      'telesurveillance_active': 'Télésurveillance activée',
      'detecteurs_ext_proposes': 'Détecteurs extérieurs proposés',
      'detecteurs_ext_installes': 'Détecteurs extérieurs installés',
      'detecteurs_incendie_proposes': 'Détecteurs incendie proposés',
      'detecteurs_incendie_installes': 'Détecteurs incendie installés',
      'protection_perimetre_proposee': 'Protection périmétrique proposée',
      'protection_perimetre_installee': 'Protection périmétrique installée',
      'maintenance_proposee': 'Maintenance préventive proposée',
      'maintenance_planifiee': 'Maintenance préventive planifiée',
      'boules_blockfire_proposees': 'Boules Block\'Fire proposées',
      'boules_blockfire_installees': 'Boules Block\'Fire installées',
      'detection_inondation_proposee': 'Détection inondation proposée',
      'detection_inondation_installee': 'Détection inondation installée',
      'electrovanne_proposee': 'Electrovanne proposée',
      'electrovanne_installee': 'Electrovanne installée',
    };
    return labels[action] || action;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getActionPairs = (categorie: LtvCategorie): ActionPair[] => {
    const categorieActions = actions.filter(a => a.categorie === categorie);

    if (categorie === 'reputation') {
      return [
        {
          id: 'avis_google',
          label: 'Avis Google',
          proposeAction: categorieActions.find(a => a.action === 'avis_google_envoye'),
          installeAction: categorieActions.find(a => a.action === 'avis_google_recu'),
          thirdAction: categorieActions.find(a => a.action === 'avis_google_repondu'),
        },
        {
          id: 'appel_satisfaction',
          label: 'Appel de satisfaction',
          proposeAction: categorieActions.find(a => a.action === 'appel_satisfaction_fait'),
        },
      ];
    }

    if (categorie === 'parrainage') {
      return [
        {
          id: 'parrainage',
          label: 'Programme parrainage',
          proposeAction: categorieActions.find(a => a.action === 'parrainage_propose'),
          installeAction: categorieActions.find(a => a.action === 'parrainage_accepte'),
          parrainagesField: true,
        },
      ];
    }

    if (categorie === 'contrat_recurrent') {
      return [
        {
          id: 'maintenance',
          label: 'Contrat maintenance',
          proposeAction: categorieActions.find(a => a.action === 'maintenance_propose'),
          installeAction: categorieActions.find(a => a.action === 'contrat_maintenance_signe'),
        },
        {
          id: 'telesurveillance',
          label: 'Télésurveillance',
          proposeAction: categorieActions.find(a => a.action === 'telesurveillance_propose'),
          installeAction: categorieActions.find(a => a.action === 'telesurveillance_active'),
        },
      ];
    }

    if (categorie === 'upsell') {
      return [
        {
          id: 'detecteurs_ext',
          label: 'Détecteurs extérieurs',
          proposeAction: categorieActions.find(a => a.action === 'detecteurs_ext_proposes'),
          installeAction: categorieActions.find(a => a.action === 'detecteurs_ext_installes'),
        },
        {
          id: 'detecteurs_incendie',
          label: 'Détecteurs incendie',
          proposeAction: categorieActions.find(a => a.action === 'detecteurs_incendie_proposes'),
          installeAction: categorieActions.find(a => a.action === 'detecteurs_incendie_installes'),
        },
        {
          id: 'boules_blockfire',
          label: 'Boules Block\'Fire',
          proposeAction: categorieActions.find(a => a.action === 'boules_blockfire_proposees'),
          installeAction: categorieActions.find(a => a.action === 'boules_blockfire_installees'),
        },
        {
          id: 'detection_inondation',
          label: 'Détection inondation',
          proposeAction: categorieActions.find(a => a.action === 'detection_inondation_proposee'),
          installeAction: categorieActions.find(a => a.action === 'detection_inondation_installee'),
        },
        {
          id: 'electrovanne',
          label: 'Electrovanne coupure d\'eau',
          proposeAction: categorieActions.find(a => a.action === 'electrovanne_proposee'),
          installeAction: categorieActions.find(a => a.action === 'electrovanne_installee'),
        },
      ];
    }

    return [];
  };

  const getButtonLabel = (categorie: LtvCategorie, buttonIndex: number, actionId?: string): string => {
    if (categorie === 'reputation') {
      if (actionId === 'appel_satisfaction') {
        return 'Appel effectué';
      }
      if (buttonIndex === 0) return 'Demande envoyée';
      if (buttonIndex === 1) return 'Avis reçu';
      if (buttonIndex === 2) return 'Réponse donnée';
    }
    if (categorie === 'parrainage') {
      if (buttonIndex === 0) return 'Proposé';
      return 'Parrainages obtenus';
    }
    if (categorie === 'contrat_recurrent') {
      if (buttonIndex === 0) return 'Proposé';
      return 'Signé/Activé';
    }
    if (categorie === 'upsell') {
      if (buttonIndex === 0) return 'Proposé';
      return 'Installé';
    }
    return buttonIndex === 1 ? 'Fait' : 'Proposé';
  };

  if (isLoading) {
    return <div className="text-center py-4 text-gray-600">Chargement des actions...</div>;
  }

  // Ne pas afficher les chantiers sans actions LTV
  if (actions.length === 0) return null;

  const totalActions = actions.length;
  const completedActions = actions.filter(a => a.statut === 'fait').length;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-green-600" />
          Plan d'actions LTV
        </h3>
        <div className="text-sm text-gray-600">
          {completedActions} / {totalActions} actions complétées
        </div>
      </div>

      <div className="space-y-6">
        {(['reputation', 'parrainage', 'contrat_recurrent', 'upsell'] as LtvCategorie[]).map((categorie) => {
          const pairs = getActionPairs(categorie);
          if (pairs.length === 0) return null;

          return (
            <div key={categorie} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                {getCategorieIcon(categorie)}
                <h4 className="font-semibold text-gray-900">{getCategorieLabel(categorie)}</h4>
              </div>

              <div className="space-y-3">
                {pairs.map((pair) => {
                  const mainAction = pair.proposeAction || pair.installeAction || pair.thirdAction;
                  if (!mainAction) return null;

                  return (
                    <div key={pair.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-gray-900">{pair.label}</h5>
                          {pair.id === 'avis_google' && (
                            <button
                              onClick={() => setShowEmailModal(true)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Envoyer un email de demande d'avis"
                            >
                              <Mail className="w-4 h-4" />
                              Envoyer email
                            </button>
                          )}
                          {pair.id === 'parrainage' && (
                            <button
                              onClick={() => setShowParrainageModal(true)}
                              className="px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Envoyer l'offre de parrainage"
                            >
                              <Gift className="w-4 h-4" />
                              Envoyer offre
                            </button>
                          )}
                          {pair.id === 'maintenance' && (
                            <button
                              onClick={() => setShowMaintenanceModal(true)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Envoyer l'offre de contrat de maintenance"
                            >
                              <Mail className="w-4 h-4" />
                              Envoyer email
                            </button>
                          )}
                          {pair.id === 'telesurveillance' && (
                            <button
                              onClick={() => setShowTelesurveillanceModal(true)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Envoyer l'offre de télésurveillance"
                            >
                              <Eye className="w-4 h-4" />
                              Envoyer email
                            </button>
                          )}
                        </div>
                        {mainAction.date_echeance && mainAction.statut !== 'fait' && (
                          <span className={`text-xs px-2 py-1 rounded ${new Date(mainAction.date_echeance) < new Date()
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            Échéance : {formatDate(mainAction.date_echeance)}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 mb-3">
                        {pair.proposeAction && (
                          <button
                            onClick={() => handleToggleAction(pair.proposeAction!, true)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${pair.proposeAction.statut === 'fait'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {pair.proposeAction.statut === 'fait' && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            <span>
                              {getButtonLabel(categorie, 0, pair.id)}
                              {pair.proposeAction.date_proposition && pair.proposeAction.statut === 'fait' && (
                                <span className="ml-1 opacity-90">
                                  ({formatDate(pair.proposeAction.date_proposition)})
                                </span>
                              )}
                            </span>
                          </button>
                        )}
                        {pair.installeAction && (
                          <button
                            onClick={() => handleToggleAction(pair.installeAction!, false)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${pair.installeAction.statut === 'fait'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {pair.installeAction.statut === 'fait' && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {getButtonLabel(categorie, 1, pair.id)}
                          </button>
                        )}
                        {pair.thirdAction && (
                          <button
                            onClick={() => handleToggleAction(pair.thirdAction!, false)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${pair.thirdAction.statut === 'fait'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {pair.thirdAction.statut === 'fait' && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {getButtonLabel(categorie, 2, pair.id)}
                          </button>
                        )}
                      </div>

                      {pair.parrainagesField && pair.installeAction && (
                        <div className="mb-3">
                          {editingParrainages === pair.installeAction.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={parrainagesValue}
                                onChange={(e) => setParrainagesValue(parseInt(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
                                placeholder="Nombre de parrainages"
                              />
                              <button
                                onClick={() => handleSaveParrainages(pair.installeAction!.id)}
                                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setEditingParrainages(null)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingParrainages(pair.installeAction!.id);
                                setParrainagesValue(pair.installeAction!.parrainages_obtenus);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Parrainages obtenus: {pair.installeAction.parrainages_obtenus}
                            </button>
                          )}
                        </div>
                      )}

                      {mainAction.commentaires && !editingComment && (
                        <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>{mainAction.commentaires}</p>
                          </div>
                        </div>
                      )}

                      {editingComment === mainAction.id ? (
                        <div>
                          <textarea
                            value={commentValue}
                            onChange={(e) => setCommentValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                            rows={2}
                            placeholder="Ajouter un commentaire..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSaveComment(mainAction.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => {
                                setEditingComment(null);
                                setCommentValue('');
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingComment(mainAction.id);
                            setCommentValue(mainAction.commentaires);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {mainAction.commentaires ? 'Modifier le commentaire' : 'Ajouter un commentaire'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showEmailModal && (
        <AvisGoogleEmailModal
          chantier={chantier}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showParrainageModal && (
        <ParrainageEmailModal
          chantier={chantier}
          onClose={() => setShowParrainageModal(false)}
        />
      )}

      {showMaintenanceModal && (
        <ContratMaintenanceEmailModal
          chantier={chantier}
          onClose={() => setShowMaintenanceModal(false)}
        />
      )}

      {showTelesurveillanceModal && (
        <TelesurveillanceEmailModal
          chantier={chantier}
          onClose={() => setShowTelesurveillanceModal(false)}
        />
      )}
    </div>
  );
};

export default LtvChantierCard;

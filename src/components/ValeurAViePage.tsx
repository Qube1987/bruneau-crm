import React, { useState, useEffect } from 'react';
import { TrendingUp, Filter, Star, Users, Shield, Package, ChevronDown, ChevronUp, Plus, Trash2, Search, Clock } from 'lucide-react';
import { supabaseApi, supabase, LtvAction, Chantier } from '../services/supabaseApi';
import LtvChantierCard from './LtvChantierCard';
import LtvManualModal from './LtvManualModal';

type FilterType = 'tous' | 'recents' | 'sans_avis' | 'sans_contrat' | 'fort_potentiel' | 'pro' | 'particulier' | 'a_relancer';

interface ProspectWithLtv {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  ville: string;
  adresse: string;
  code_postal: string;
  civilite: string;
  activite: string;
  ltv_actif: boolean;
  ltv_date_inscription: string;
  ltv_score: number;
  ltv_actions?: LtvAction[];
}

const ValeurAViePage: React.FC = () => {
  const [prospects, setProspects] = useState<ProspectWithLtv[]>([]);
  const [filtreActif, setFiltreActif] = useState<FilterType>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProspect, setExpandedProspect] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [chantiersByProspect, setChantiersByProspect] = useState<Record<string, Chantier[]>>({});
  const [loadingChantiers, setLoadingChantiers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProspectsLtv();
  }, []);

  const loadProspectsLtv = async () => {
    setIsLoading(true);
    try {
      const data = await supabaseApi.getProspectsLtv();
      setProspects(data);
    } catch (error) {
      console.error('Erreur lors du chargement des prospects LTV:', error);
      alert('Erreur lors du chargement des clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandProspect = async (prospectId: string) => {
    if (expandedProspect === prospectId) {
      setExpandedProspect(null);
      return;
    }
    setExpandedProspect(prospectId);
    if (!chantiersByProspect[prospectId]) {
      setLoadingChantiers(prev => ({ ...prev, [prospectId]: true }));
      try {
        // Load actions by client_id to find which chantiers have LTV data
        const actions = await supabaseApi.getLtvActionsByProspect(prospectId);
        const chantierIds = [...new Set(actions.map(a => a.chantier_id).filter(Boolean))];

        if (chantierIds.length === 0) {
          // Fallback: try loading chantiers directly via opportunites
          const chantiers = await supabaseApi.getChantiersByProspect(prospectId);
          setChantiersByProspect(prev => ({ ...prev, [prospectId]: chantiers }));
        } else {
          // Fetch exactly the chantiers that have LTV actions
          const { data, error } = await supabase
            .from('chantiers')
            .select(`*, opportunite:opportunites(*, prospect:clients(*))`)
            .in('id', chantierIds)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setChantiersByProspect(prev => ({ ...prev, [prospectId]: data || [] }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des chantiers:', error);
      } finally {
        setLoadingChantiers(prev => ({ ...prev, [prospectId]: false }));
      }
    }
  };

  const handleRemoveFromLtv = async (prospect: ProspectWithLtv) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${prospect.nom} ${prospect.prenom || ''} du programme LTV ?\n\nToutes les actions LTV associées seront également supprimées.`)) {
      return;
    }

    try {
      await supabaseApi.updateProspect(prospect.id, { ltv_actif: false } as any);
      setProspects(prevProspects => prevProspects.filter(p => p.id !== prospect.id));
      alert('Client retiré du programme LTV avec succès');
    } catch (error) {
      console.error('Erreur lors du retrait du programme LTV:', error);
      alert('Erreur lors du retrait du client');
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) {
      return { color: 'bg-green-100 text-green-800 border-green-300', label: 'Optimisé', icon: '🟢' };
    } else if (score >= 4) {
      return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Partiellement optimisé', icon: '🟡' };
    } else {
      return { color: 'bg-red-100 text-red-800 border-red-300', label: 'Potentiel inexploité', icon: '🔴' };
    }
  };

  const shouldHighlightForReminder = (prospect: ProspectWithLtv): boolean => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (!prospect.ltv_actions) return false;

    const proposeActions = prospect.ltv_actions.filter(a =>
      a.action.includes('propose') &&
      a.statut === 'fait' &&
      a.date_proposition
    );

    return proposeActions.some(action => {
      const dateProposition = new Date(action.date_proposition!);
      return dateProposition <= thirtyDaysAgo;
    });
  };

  const filtrerProspects = (prospects: ProspectWithLtv[]): ProspectWithLtv[] => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let filtered = prospects;

    // Appliquer le filtre de type
    switch (filtreActif) {
      case 'recents':
        filtered = filtered.filter(p => {
          const dateInscription = new Date(p.ltv_date_inscription || '');
          return dateInscription >= thirtyDaysAgo;
        });
        break;
      case 'sans_avis':
        filtered = filtered.filter(p => p.ltv_score < 2);
        break;
      case 'sans_contrat':
        filtered = filtered.filter(p => p.ltv_score < 5);
        break;
      case 'fort_potentiel':
        filtered = filtered.filter(p => p.ltv_score < 4);
        break;
      case 'a_relancer':
        filtered = filtered.filter(p => shouldHighlightForReminder(p));
        break;
      case 'pro':
        filtered = filtered.filter(p => {
          const civilite = p.civilite?.toLowerCase();
          return civilite?.includes('société') || civilite?.includes('entreprise') || civilite?.includes('sarl');
        });
        break;
      case 'particulier':
        filtered = filtered.filter(p => {
          const civilite = p.civilite?.toLowerCase();
          return civilite?.includes('m.') || civilite?.includes('mme') || civilite?.includes('mlle');
        });
        break;
      case 'tous':
      default:
        break;
    }

    // Appliquer la recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const nom = p.nom?.toLowerCase() || '';
        const prenom = p.prenom?.toLowerCase() || '';
        const ville = p.ville?.toLowerCase() || '';
        const adresse = p.adresse?.toLowerCase() || '';

        return nom.includes(query) || prenom.includes(query) || ville.includes(query) || adresse.includes(query);
      });
    }

    return filtered;
  };

  const prospectsFiltres = filtrerProspects(prospects);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getActionSummary = (prospect: ProspectWithLtv) => {
    if (!prospect.ltv_actions) return null;

    const summary = {
      reputation: { done: 0, total: 0, latestProposition: null as string | null },
      parrainage: { done: 0, total: 0, latestProposition: null as string | null },
      contrat_recurrent: { done: 0, total: 0, latestProposition: null as string | null },
      upsell: { done: 0, total: 0, latestProposition: null as string | null },
    };

    prospect.ltv_actions.forEach(action => {
      if (action.categorie in summary) {
        summary[action.categorie].total++;
        if (action.statut === 'fait') {
          summary[action.categorie].done++;
        }
        if (action.date_proposition && action.action.includes('propose')) {
          const currentLatest = summary[action.categorie].latestProposition;
          if (!currentLatest || new Date(action.date_proposition) > new Date(currentLatest)) {
            summary[action.categorie].latestProposition = action.date_proposition;
          }
        }
      }
    });

    return summary;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Optimisation de la Valeur à Vie</h1>
            </div>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Ajouter un client
            </button>
          </div>
          <p className="text-gray-600">
            Transformez vos clients en sources de revenus récurrents et de recommandations
          </p>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, description ou consignes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtres</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFiltreActif('tous')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filtreActif === 'tous'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Tous ({prospects.length})
            </button>
            <button
              onClick={() => setFiltreActif('recents')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filtreActif === 'recents'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Récents (&lt; 30j)
            </button>
            <button
              onClick={() => setFiltreActif('sans_avis')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filtreActif === 'sans_avis'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Star className="w-4 h-4" />
              Sans avis Google
            </button>
            <button
              onClick={() => setFiltreActif('sans_contrat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filtreActif === 'sans_contrat'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Shield className="w-4 h-4" />
              Sans contrat
            </button>
            <button
              onClick={() => setFiltreActif('fort_potentiel')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filtreActif === 'fort_potentiel'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Package className="w-4 h-4" />
              Fort potentiel
            </button>
            <button
              onClick={() => setFiltreActif('a_relancer')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filtreActif === 'a_relancer'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
            >
              <Clock className="w-4 h-4" />
              À relancer (+30j)
            </button>
            <button
              onClick={() => setFiltreActif('pro')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filtreActif === 'pro'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Professionnels
            </button>
            <button
              onClick={() => setFiltreActif('particulier')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filtreActif === 'particulier'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Users className="w-4 h-4" />
              Particuliers
            </button>
          </div>
        </div>

        {prospectsFiltres.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filtreActif === 'tous' ? 'Aucun client dans le programme LTV' : 'Aucun client trouvé'}
            </h3>
            <p className="text-gray-600">
              {filtreActif === 'tous'
                ? 'Les clients apparaîtront ici une fois inscrits au programme LTV'
                : 'Aucun client ne correspond à ce filtre'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {prospectsFiltres.map((prospect) => {
              const scoreBadge = getScoreBadge(prospect.ltv_score);
              const isExpanded = expandedProspect === prospect.id;
              const needsReminder = shouldHighlightForReminder(prospect);
              const summary = getActionSummary(prospect);

              return (
                <div
                  key={prospect.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${needsReminder ? 'ring-2 ring-orange-400' : ''
                    }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-gray-900">
                            {prospect.nom} {prospect.prenom || ''}
                          </h2>
                          {needsReminder && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              À relancer
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {prospect.ville} - {prospect.adresse}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span>Inscrit le : {formatDate(prospect.ltv_date_inscription)}</span>
                        </div>

                        {!isExpanded && summary && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {summary.reputation.total > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                                <Star className="w-3.5 h-3.5 text-yellow-600" />
                                <span className="font-medium text-yellow-900">
                                  Réputation: {summary.reputation.done}/{summary.reputation.total}
                                </span>
                                {summary.reputation.latestProposition && (
                                  <span className="text-yellow-700 ml-1">
                                    ({formatDate(summary.reputation.latestProposition)})
                                  </span>
                                )}
                              </div>
                            )}
                            {summary.parrainage.total > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                                <Users className="w-3.5 h-3.5 text-purple-600" />
                                <span className="font-medium text-purple-900">
                                  Parrainage: {summary.parrainage.done}/{summary.parrainage.total}
                                </span>
                                {summary.parrainage.latestProposition && (
                                  <span className="text-purple-700 ml-1">
                                    ({formatDate(summary.parrainage.latestProposition)})
                                  </span>
                                )}
                              </div>
                            )}
                            {summary.contrat_recurrent.total > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                                <Shield className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-medium text-blue-900">
                                  Contrats: {summary.contrat_recurrent.done}/{summary.contrat_recurrent.total}
                                </span>
                                {summary.contrat_recurrent.latestProposition && (
                                  <span className="text-blue-700 ml-1">
                                    ({formatDate(summary.contrat_recurrent.latestProposition)})
                                  </span>
                                )}
                              </div>
                            )}
                            {summary.upsell.total > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
                                <Package className="w-3.5 h-3.5 text-green-600" />
                                <span className="font-medium text-green-900">
                                  Upsell: {summary.upsell.done}/{summary.upsell.total}
                                </span>
                                {summary.upsell.latestProposition && (
                                  <span className="text-green-700 ml-1">
                                    ({formatDate(summary.upsell.latestProposition)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${scoreBadge.color}`}>
                          {scoreBadge.icon} Score: {prospect.ltv_score} - {scoreBadge.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExpandProspect(prospect.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Réduire
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Voir les actions
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveFromLtv(prospect)}
                            className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Retirer du programme LTV"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        {loadingChantiers[prospect.id] ? (
                          <div className="text-center py-6 text-gray-500 text-sm">Chargement des chantiers...</div>
                        ) : (chantiersByProspect[prospect.id] || []).length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            Aucun chantier finalisé trouvé pour ce client.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(chantiersByProspect[prospect.id] || []).map((chantier) => (
                              <LtvChantierCard
                                key={chantier.id}
                                chantier={chantier}
                                onUpdate={loadProspectsLtv}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showManualModal && (
        <LtvManualModal
          onClose={() => setShowManualModal(false)}
          onLtvCreated={() => {
            setShowManualModal(false);
            loadProspectsLtv();
          }}
        />
      )}
    </div>
  );
};

export default ValeurAViePage;

import { useState, useEffect } from 'react';
import { Phone, Mail, CheckCircle, XCircle, Clock, AlertCircle, Search, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabaseApi, Opportunite, Prospect, Interaction } from '../services/supabaseApi';
import InteractionModal from './InteractionModal';
import OpportunityEditModal from './OpportunityEditModal';
import OpportunityCompletionModal from './OpportunityCompletionModal';

interface OpportuniteWithProspect extends Opportunite {
  prospect: Prospect;
  lastInteraction?: Interaction;
  daysSinceTransmission: number;
}

type SortField = 'client' | 'opportunite' | 'montant' | 'statut' | 'delai' | 'derniere_action';
type SortDirection = 'asc' | 'desc' | null;

export const RelancesDevisPage = () => {
  const [opportunites, setOpportunites] = useState<OpportuniteWithProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunite | null>(null);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [opportunityToComplete, setOpportunityToComplete] = useState<OpportuniteWithProspect | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadOpportunites = async () => {
    setLoading(true);
    try {
      const allOpps = await supabaseApi.getOpportunites();
      const prospects = await supabaseApi.getProspects();

      const devisStatuts = ['devis-transmis', 'relance-1', 'relance-2', 'relance-3'];
      const filteredOpps = allOpps.filter(opp =>
        devisStatuts.includes(opp.statut) && !opp.archive
      );

      const oppsWithData = await Promise.all(
        filteredOpps.map(async (opp) => {
          const prospect = prospects.find(p => p.id === opp.client_id);
          const interactions = await supabaseApi.getInteractionsByOpportunite(opp.id);
          const lastInteraction = interactions.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

          const transmissionDate = new Date(opp.updated_at || opp.created_at);
          const today = new Date();
          const daysSinceTransmission = Math.floor(
            (today.getTime() - transmissionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            ...opp,
            prospect: prospect!,
            lastInteraction,
            daysSinceTransmission
          };
        })
      );

      oppsWithData.sort((a, b) => b.daysSinceTransmission - a.daysSinceTransmission);
      setOpportunites(oppsWithData);
    } catch (error) {
      console.error('Erreur lors du chargement des opportunités:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunites();
  }, []);

  const handleStatusChange = async (opp: OpportuniteWithProspect, newStatus: string) => {
    try {
      if (newStatus === 'gagne' || newStatus === 'perdu') {
        if (newStatus === 'gagne') {
          if (opp.saisie_rapide && !opp.extrabat_id) {
            setOpportunityToComplete(opp);
            setShowCompletionModal(true);
            return;
          }

          await supabaseApi.updateOpportunite(opp.id, {
            statut_final: newStatus,
            date_cloture: new Date().toISOString()
          });

          if (opp.extrabat_id) {
            await supabaseApi.createChantier({
              opportunite_id: opp.id,
              statut: 'en_cours',
              consignes: '',
              commande_passee: false,
              commande_recue: false,
              chantier_planifie: false,
              chantier_realise: false,
              ltv_score: 0
            });
          }
        } else {
          await supabaseApi.updateOpportunite(opp.id, {
            statut_final: newStatus,
            date_cloture: new Date().toISOString()
          });
        }
      } else {
        await supabaseApi.updateOpportunite(opp.id, { statut: newStatus });
      }
      await loadOpportunites();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'devis-transmis':
        return 'bg-blue-100 text-blue-800';
      case 'relance-1':
        return 'bg-yellow-100 text-yellow-800';
      case 'relance-2':
        return 'bg-orange-100 text-orange-800';
      case 'relance-3':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'devis-transmis':
        return 'Devis transmis';
      case 'relance-1':
        return 'Relance 1';
      case 'relance-2':
        return 'Relance 2';
      case 'relance-3':
        return 'Relance 3';
      default:
        return statut;
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days >= 30) return 'text-red-600 font-semibold';
    if (days >= 14) return 'text-orange-600 font-semibold';
    if (days >= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="opacity-40" />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const sortOpportunitesByField = (opps: OpportuniteWithProspect[]) => {
    if (!sortField || !sortDirection) return opps;

    return [...opps].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'client':
          const nameA = `${a.prospect.nom || ''} ${a.prospect.prenom || ''}`.toLowerCase();
          const nameB = `${b.prospect.nom || ''} ${b.prospect.prenom || ''}`.toLowerCase();
          compareValue = nameA.localeCompare(nameB);
          break;
        case 'opportunite':
          compareValue = (a.titre || '').toLowerCase().localeCompare((b.titre || '').toLowerCase());
          break;
        case 'montant':
          compareValue = (a.montant_estime || 0) - (b.montant_estime || 0);
          break;
        case 'statut':
          const statutOrder = ['devis-transmis', 'relance-1', 'relance-2', 'relance-3'];
          compareValue = statutOrder.indexOf(a.statut) - statutOrder.indexOf(b.statut);
          break;
        case 'delai':
          compareValue = a.daysSinceTransmission - b.daysSinceTransmission;
          break;
        case 'derniere_action':
          const dateA = a.lastInteraction ? new Date(a.lastInteraction.date).getTime() : 0;
          const dateB = b.lastInteraction ? new Date(b.lastInteraction.date).getTime() : 0;
          compareValue = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
  };

  const stats = {
    total: opportunites.length,
    devisTransmis: opportunites.filter(o => o.statut === 'devis-transmis').length,
    relance1: opportunites.filter(o => o.statut === 'relance-1').length,
    relance2: opportunites.filter(o => o.statut === 'relance-2').length,
    relance3: opportunites.filter(o => o.statut === 'relance-3').length,
    urgent: opportunites.filter(o => o.daysSinceTransmission >= 14).length,
    tauxSucces: 0 // Placeholder
  };

  let filteredOpportunites = filterStatut === 'all'
    ? opportunites
    : opportunites.filter(opp => opp.statut === filterStatut);

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredOpportunites = filteredOpportunites.filter(opp => {
      const clientName = `${opp.prospect.nom || ''} ${opp.prospect.prenom || ''}`.toLowerCase();
      const ville = (opp.prospect.ville || '').toLowerCase();
      const titre = (opp.titre || '').toLowerCase();
      const description = (opp.description || '').toLowerCase();

      return clientName.includes(searchLower) ||
        ville.includes(searchLower) ||
        titre.includes(searchLower) ||
        description.includes(searchLower);
    });
  }

  filteredOpportunites = sortOpportunitesByField(filteredOpportunites);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relances Devis</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Suivi et relance des devis transmis</p>
        </div>
      </div>

      {/* Statistiques Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs sm:text-sm text-gray-600">Total devis</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-400">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.devisTransmis}</div>
          <div className="text-xs sm:text-sm text-gray-600">Transmis</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-400">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.relance1}</div>
          <div className="text-xs sm:text-sm text-gray-600">Relance 1</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-400">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.relance2}</div>
          <div className="text-xs sm:text-sm text-gray-600">Relance 2</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-400">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.relance3}</div>
          <div className="text-xs sm:text-sm text-gray-600">Relance 3</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.urgent}</div>
          <div className="text-xs sm:text-sm text-gray-600">Urgent (+14j)</div>
        </div>
      </div>

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client, ville, titre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
          />
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilterStatut('all')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${filterStatut === 'all' ? 'bg-primary-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatut('devis-transmis')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${filterStatut === 'devis-transmis' ? 'bg-primary-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Transmis ({stats.devisTransmis})
          </button>
          <button
            onClick={() => setFilterStatut('relance-1')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${filterStatut === 'relance-1' ? 'bg-primary-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Relance 1 ({stats.relance1})
          </button>
          <button
            onClick={() => setFilterStatut('relance-2')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${filterStatut === 'relance-2' ? 'bg-primary-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Relance 2 ({stats.relance2})
          </button>
          <button
            onClick={() => setFilterStatut('relance-3')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${filterStatut === 'relance-3' ? 'bg-primary-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Relance 3 ({stats.relance3})
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('client')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Client {getSortIcon('client')}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('opportunite')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Détails {getSortIcon('opportunite')}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  <button onClick={() => handleSort('montant')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Montant {getSortIcon('montant')}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('statut')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Statut {getSortIcon('statut')}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('delai')} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Délai {getSortIcon('delai')}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOpportunites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle size={40} className="mx-auto mb-2 opacity-20" />
                    Aucun devis trouvé
                  </td>
                </tr>
              ) : (
                filteredOpportunites.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{opp.prospect.nom} {opp.prospect.prenom}</div>
                      <div className="text-xs text-gray-500">{opp.prospect.ville}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {opp.prospect.telephone && (
                          <a href={`tel:${opp.prospect.telephone}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Phone size={16} />
                          </a>
                        )}
                        {opp.prospect.email && (
                          <a href={`mailto:${opp.prospect.email}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Mail size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{opp.titre}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{opp.description}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <div className="text-sm font-bold text-gray-900">
                        {opp.montant_estime ? `${opp.montant_estime.toLocaleString('fr-FR')} €` : '-'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(opp.statut)}`}>
                        {getStatusLabel(opp.statut)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className={`text-sm font-medium ${getUrgencyColor(opp.daysSinceTransmission)} flex items-center gap-1`}>
                        <Clock size={14} />
                        {opp.daysSinceTransmission}j
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedOpportunity(opp);
                            setShowInteractionModal(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Ajouter interaction"
                        >
                          <Plus size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOpportunity(opp);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Modifier"
                        >
                          <Search size={20} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(opp, 'gagne')}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Gagné"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(opp, 'perdu')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Perdu"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showInteractionModal && selectedOpportunity && (
        <InteractionModal
          opportuniteId={selectedOpportunity.id}
          onClose={() => {
            setShowInteractionModal(false);
            setSelectedOpportunity(null);
            loadOpportunites();
          }}
          onInteractionAdded={() => {
            setShowInteractionModal(false);
            setSelectedOpportunity(null);
            loadOpportunites();
          }}
        />
      )}

      {showEditModal && selectedOpportunity && (
        <OpportunityEditModal
          opportunite={selectedOpportunity}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOpportunity(null);
          }}
          onOpportunityUpdated={() => {
            setShowEditModal(false);
            setSelectedOpportunity(null);
            loadOpportunites();
          }}
        />
      )}

      {showCompletionModal && opportunityToComplete && (
        <OpportunityCompletionModal
          opportunity={opportunityToComplete}
          onClose={() => {
            setShowCompletionModal(false);
            setOpportunityToComplete(null);
          }}
          onCompleted={() => {
            setShowCompletionModal(false);
            setOpportunityToComplete(null);
            loadOpportunites();
          }}
        />
      )}
    </div>
  );
};

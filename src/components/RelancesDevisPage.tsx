import { useState, useEffect } from 'react';
import { Phone, Mail, CheckCircle, XCircle, Clock, AlertCircle, Eye, MessageSquare, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabaseApi } from '../services/supabaseApi';
import { Opportunite, Prospect, Interaction } from '../types';
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
  const [selectedOpportunite, setSelectedOpportunite] = useState<Opportunite | null>(null);
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

          const transmissionDate = new Date(opp.date_modification);
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
              extrabat_id: opp.extrabat_id,
              statut: 'en_cours',
              suivi_par: opp.suivi_par,
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

  const handleAddInteraction = (opp: OpportuniteWithProspect) => {
    setSelectedOpportunite(opp);
    setShowInteractionModal(true);
  };

  const handleViewDetails = (opp: OpportuniteWithProspect) => {
    setSelectedOpportunite(opp);
    setShowEditModal(true);
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
      } else if (sortDirection === 'desc') {
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

  const sortOpportunites = (opps: OpportuniteWithProspect[]) => {
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

  let filteredOpportunites = filterStatut === 'all'
    ? opportunites
    : opportunites.filter(opp => opp.statut === filterStatut);

  if (searchTerm) {
    filteredOpportunites = filteredOpportunites.filter(opp => {
      const searchLower = searchTerm.toLowerCase();
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

  filteredOpportunites = sortOpportunites(filteredOpportunites);

  const stats = {
    total: opportunites.length,
    devisTransmis: opportunites.filter(o => o.statut === 'devis-transmis').length,
    relance1: opportunites.filter(o => o.statut === 'relance-1').length,
    relance2: opportunites.filter(o => o.statut === 'relance-2').length,
    relance3: opportunites.filter(o => o.statut === 'relance-3').length,
    urgent: opportunites.filter(o => o.daysSinceTransmission >= 14).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement des devis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relances Devis</h1>
          <p className="text-gray-600 mt-1">Suivi et relance des devis transmis</p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total devis</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-400">
          <div className="text-2xl font-bold text-gray-900">{stats.devisTransmis}</div>
          <div className="text-sm text-gray-600">Transmis</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-400">
          <div className="text-2xl font-bold text-gray-900">{stats.relance1}</div>
          <div className="text-sm text-gray-600">Relance 1</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-400">
          <div className="text-2xl font-bold text-gray-900">{stats.relance2}</div>
          <div className="text-sm text-gray-600">Relance 2</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-400">
          <div className="text-2xl font-bold text-gray-900">{stats.relance3}</div>
          <div className="text-sm text-gray-600">Relance 3</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600">
          <div className="text-2xl font-bold text-gray-900">{stats.urgent}</div>
          <div className="text-sm text-gray-600">Urgent (+14j)</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Rechercher par client, ville, opportunité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatut('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatut === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatut('devis-transmis')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatut === 'devis-transmis'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Devis transmis ({stats.devisTransmis})
          </button>
          <button
            onClick={() => setFilterStatut('relance-1')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatut === 'relance-1'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Relance 1 ({stats.relance1})
          </button>
          <button
            onClick={() => setFilterStatut('relance-2')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatut === 'relance-2'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Relance 2 ({stats.relance2})
          </button>
          <button
            onClick={() => setFilterStatut('relance-3')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatut === 'relance-3'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Relance 3 ({stats.relance3})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('client')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Client
                    {getSortIcon('client')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('opportunite')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Opportunité
                    {getSortIcon('opportunite')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('montant')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Montant
                    {getSortIcon('montant')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('statut')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Statut
                    {getSortIcon('statut')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('delai')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Délai
                    {getSortIcon('delai')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <button
                    onClick={() => handleSort('derniere_action')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Dernière action
                    {getSortIcon('derniere_action')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOpportunites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Aucun devis à relancer
                  </td>
                </tr>
              ) : (
                filteredOpportunites.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {opp.prospect.nom} {opp.prospect.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {opp.prospect.ville || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{opp.titre}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{opp.description}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {opp.montant_estime
                          ? `${opp.montant_estime.toLocaleString('fr-FR')} €`
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(opp.statut)}`}>
                        {getStatusLabel(opp.statut)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className={getUrgencyColor(opp.daysSinceTransmission)} />
                        <span className={`text-sm font-medium ${getUrgencyColor(opp.daysSinceTransmission)}`}>
                          {opp.daysSinceTransmission} j
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {opp.prospect.telephone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone size={12} />
                            <a href={`tel:${opp.prospect.telephone}`} className="hover:text-blue-600">
                              {opp.prospect.telephone}
                            </a>
                          </div>
                        )}
                        {opp.prospect.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Mail size={12} />
                            <a href={`mailto:${opp.prospect.email}`} className="hover:text-blue-600 truncate max-w-[150px]">
                              {opp.prospect.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {opp.lastInteraction ? (
                        <div className="text-xs text-gray-600">
                          <div className="font-medium">
                            {new Date(opp.lastInteraction.date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-gray-500 line-clamp-1">
                            {opp.lastInteraction.type}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aucune action</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(opp)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleAddInteraction(opp)}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Ajouter interaction"
                        >
                          <MessageSquare size={16} />
                        </button>
                        {opp.statut === 'devis-transmis' && (
                          <button
                            onClick={() => handleStatusChange(opp, 'relance-1')}
                            className="px-2 py-1 text-xs font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded transition-colors"
                            title="Passer en Relance 1"
                          >
                            R1
                          </button>
                        )}
                        {opp.statut === 'relance-1' && (
                          <button
                            onClick={() => handleStatusChange(opp, 'relance-2')}
                            className="px-2 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
                            title="Passer en Relance 2"
                          >
                            R2
                          </button>
                        )}
                        {opp.statut === 'relance-2' && (
                          <button
                            onClick={() => handleStatusChange(opp, 'relance-3')}
                            className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                            title="Passer en Relance 3"
                          >
                            R3
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(opp, 'gagne')}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Marquer comme Gagné"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(opp, 'perdu')}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Marquer comme Perdu"
                        >
                          <XCircle size={16} />
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

      {showInteractionModal && selectedOpportunite && (
        <InteractionModal
          opportuniteId={selectedOpportunite.id}
          onClose={() => {
            setShowInteractionModal(false);
            setSelectedOpportunite(null);
            loadOpportunites();
          }}
          onInteractionAdded={() => {
            setShowInteractionModal(false);
            setSelectedOpportunite(null);
            loadOpportunites();
          }}
        />
      )}

      {showEditModal && selectedOpportunite && (
        <OpportunityEditModal
          opportunite={selectedOpportunite}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOpportunite(null);
          }}
          onOpportunityUpdated={() => {
            setShowEditModal(false);
            setSelectedOpportunite(null);
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

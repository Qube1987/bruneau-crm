import React, { useState, useEffect } from 'react';
import { Hammer, CreditCard as Edit2, Save, X, CheckCircle, Circle, Clock, Truck, Calendar, AlertCircle, Plus, Trash2, Search } from 'lucide-react';
import { supabaseApi, Chantier, Opportunite } from '../services/supabaseApi';
import ChantierPlanificationModal from './ChantierPlanificationModal';
import ChantierManualModal from './ChantierManualModal';

type FilterType = 'tous' | 'non_commence' | 'commande_passee' | 'commande_recue' | 'chantier_planifie' | 'realises';

const ChantiersPage: React.FC = () => {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtreActif, setFiltreActif] = useState<FilterType>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editFormData, setEditFormData] = useState({
    titre: '',
    description: '',
    consignes: '',
  });
  const [editingDate, setEditingDate] = useState<{chantierId: string, etape: string} | null>(null);
  const [dateValue, setDateValue] = useState<string>('');
  const [planificationModalChantier, setPlanificationModalChantier] = useState<Chantier | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    loadChantiers();
  }, []);

  const loadChantiers = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Chargement des chantiers...');
      const opportunitesDevisGagnes = await supabaseApi.getOpportunitesDevisGagnes();
      console.log('📊 Opportunités "devis gagné":', opportunitesDevisGagnes.length);

      // Récupérer TOUS les chantiers (réalisés ou non) pour vérifier l'existence
      const tousLesChantiers = await supabaseApi.getAllChantiers();
      console.log('🏗️ Tous les chantiers (réalisés et non réalisés):', tousLesChantiers.length);

      const chantiersMap = new Map(tousLesChantiers.map(c => [c.opportunite_id, c]));

      const chantiersManquants = opportunitesDevisGagnes
        .filter(opp => !chantiersMap.has(opp.id))
        .map(opp => opp.id);

      console.log('⚠️ Chantiers manquants:', chantiersManquants.length);

      for (const opportuniteId of chantiersManquants) {
        await supabaseApi.createChantier({
          opportunite_id: opportuniteId,
          consignes: '',
          commande_passee: false,
          commande_recue: false,
          chantier_planifie: false,
          chantier_realise: false,
        });
      }

      // Récupérer TOUS les chantiers pour l'affichage après création des manquants
      const chantiersFinaux = await supabaseApi.getAllChantiers();
      console.log('🔨 Tous les chantiers:', chantiersFinaux.length);

      setChantiers(chantiersFinaux);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des chantiers:', error);
      alert('Erreur: ' + (error as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (chantier: Chantier) => {
    setEditingId(chantier.id);
    setEditFormData({
      titre: chantier.opportunite?.titre || '',
      description: chantier.opportunite?.description || '',
      consignes: chantier.consignes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ titre: '', description: '', consignes: '' });
  };

  const handleSaveEdit = async (chantierId: string, opportuniteId: string) => {
    try {
      await Promise.all([
        supabaseApi.updateOpportunite(opportuniteId, {
          titre: editFormData.titre,
          description: editFormData.description,
        }),
        supabaseApi.updateChantier(chantierId, {
          consignes: editFormData.consignes,
        }),
      ]);

      // Mise à jour de l'état local uniquement
      setChantiers(prevChantiers =>
        prevChantiers.map(c => {
          if (c.id === chantierId) {
            return {
              ...c,
              consignes: editFormData.consignes,
              opportunite: c.opportunite ? {
                ...c.opportunite,
                titre: editFormData.titre,
                description: editFormData.description,
              } : undefined,
            };
          }
          return c;
        })
      );
      setEditingId(null);
      setEditFormData({ titre: '', description: '', consignes: '' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleToggleEtape = async (chantier: Chantier, etape: string) => {
    if (etape === 'chantier_planifie') {
      setPlanificationModalChantier(chantier);
      return;
    }

    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      switch (etape) {
        case 'commande_passee':
          updates.commande_passee = !chantier.commande_passee;
          updates.date_commande_passee = !chantier.commande_passee ? new Date().toISOString() : null;
          break;
        case 'commande_recue':
          updates.commande_recue = !chantier.commande_recue;
          updates.date_commande_recue = !chantier.commande_recue ? new Date().toISOString() : null;
          break;
        case 'chantier_realise':
          updates.chantier_realise = !chantier.chantier_realise;
          updates.date_chantier_realise = !chantier.chantier_realise ? new Date().toISOString() : null;
          break;
      }

      await supabaseApi.updateChantier(chantier.id, updates);

      if (etape === 'chantier_realise' && !chantier.chantier_realise) {
        await supabaseApi.finalizeChantier(chantier.id);
        alert('✅ Chantier finalisé ! La checklist d\'actions commerciales a été générée dans "Optimisation de la valeur à vie".');
      }

      setChantiers(prevChantiers =>
        prevChantiers.map(c =>
          c.id === chantier.id ? { ...c, ...updates } : c
        ).filter(c => !c.chantier_realise)
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'étape:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleEditDate = (chantier: Chantier, etape: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let currentDate = '';
    switch (etape) {
      case 'commande_passee':
        currentDate = chantier.date_commande_passee || '';
        break;
      case 'commande_recue':
        currentDate = chantier.date_commande_recue || '';
        break;
      case 'chantier_planifie':
        currentDate = chantier.date_chantier_planifie || '';
        break;
      case 'chantier_realise':
        currentDate = chantier.date_chantier_realise || '';
        break;
    }

    // Convertir la date ISO en format YYYY-MM-DD pour l'input
    if (currentDate) {
      const date = new Date(currentDate);
      const formattedDate = date.toISOString().split('T')[0];
      setDateValue(formattedDate);
    } else {
      setDateValue('');
    }

    setEditingDate({ chantierId: chantier.id, etape });
  };

  const handleSaveDate = async () => {
    if (!editingDate || !dateValue) return;

    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      switch (editingDate.etape) {
        case 'commande_passee':
          updates.date_commande_passee = new Date(dateValue).toISOString();
          break;
        case 'commande_recue':
          updates.date_commande_recue = new Date(dateValue).toISOString();
          break;
        case 'chantier_planifie':
          updates.date_chantier_planifie = new Date(dateValue).toISOString();
          break;
        case 'chantier_realise':
          updates.date_chantier_realise = new Date(dateValue).toISOString();
          break;
      }

      await supabaseApi.updateChantier(editingDate.chantierId, updates);

      setChantiers(prevChantiers =>
        prevChantiers.map(c =>
          c.id === editingDate.chantierId ? { ...c, ...updates } : c
        )
      );

      setEditingDate(null);
      setDateValue('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la date:', error);
      alert('Erreur lors de la mise à jour de la date');
    }
  };

  const handleCancelDateEdit = () => {
    setEditingDate(null);
    setDateValue('');
  };


  const handleDeleteChantier = async (chantier: Chantier) => {
    const prospect = chantier.opportunite?.prospect;
    const clientName = prospect ? `${prospect.nom} ${prospect.prenom || ''}` : 'ce chantier';

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le chantier de ${clientName} ?\n\nATTENTION : Le statut de l'opportunité liée sera automatiquement changé en "En cours" pour éviter la recréation du chantier.\n\nContinuer ?`)) {
      return;
    }

    try {
      await supabaseApi.deleteChantier(chantier.id);

      // Changer le statut de l'opportunité pour éviter la recréation automatique
      if (chantier.opportunite_id) {
        await supabaseApi.updateOpportunite(chantier.opportunite_id, {
          statut_final: 'standby'
        });
      }

      setChantiers(prevChantiers => prevChantiers.filter(c => c.id !== chantier.id));
      alert('✅ Chantier supprimé avec succès et statut de l\'opportunité mis à jour');
    } catch (error) {
      console.error('Erreur lors de la suppression du chantier:', error);
      alert('❌ Erreur lors de la suppression du chantier : ' + (error as any).message);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getProgressPercentage = (chantier: Chantier) => {
    let completed = 0;
    if (chantier.commande_passee) completed++;
    if (chantier.commande_recue) completed++;
    if (chantier.chantier_planifie) completed++;
    if (chantier.chantier_realise) completed++;
    return (completed / 4) * 100;
  };

  const filtrerChantiers = (chantiers: Chantier[]): Chantier[] => {
    let filtered = chantiers;

    // Appliquer le filtre de statut
    switch (filtreActif) {
      case 'non_commence':
        filtered = filtered.filter(c => c.statut === 'en_cours' && !c.commande_passee && !c.commande_recue && !c.chantier_planifie);
        break;
      case 'commande_passee':
        filtered = filtered.filter(c => c.statut === 'en_cours' && c.commande_passee);
        break;
      case 'commande_recue':
        filtered = filtered.filter(c => c.statut === 'en_cours' && c.commande_recue);
        break;
      case 'chantier_planifie':
        filtered = filtered.filter(c => c.statut === 'en_cours' && c.chantier_planifie);
        break;
      case 'realises':
        filtered = filtered.filter(c => c.statut === 'finalise');
        break;
      case 'tous':
      default:
        filtered = filtered.filter(c => c.statut !== 'finalise');
        break;
    }

    // Appliquer la recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const prospect = c.opportunite?.prospect;
        const nom = prospect?.nom?.toLowerCase() || '';
        const prenom = prospect?.prenom?.toLowerCase() || '';
        const description = c.opportunite?.description?.toLowerCase() || '';
        const consignes = c.consignes?.toLowerCase() || '';

        return nom.includes(query) || prenom.includes(query) || description.includes(query) || consignes.includes(query);
      });
    }

    return filtered;
  };

  const chantiersFiltres = filtrerChantiers(chantiers);

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
              <Hammer className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Suivi des Chantiers</h1>
            </div>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Ajouter un chantier
            </button>
          </div>
          <p className="text-gray-600">
            Gérez l'avancement de vos chantiers en cours
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFiltreActif('tous')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtreActif === 'tous'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({chantiers.length})
            </button>
            <button
              onClick={() => setFiltreActif('non_commence')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtreActif === 'non_commence'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non commencés ({chantiers.filter(c => c.statut === 'en_cours' && !c.commande_passee && !c.commande_recue && !c.chantier_planifie).length})
            </button>
            <button
              onClick={() => setFiltreActif('commande_passee')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filtreActif === 'commande_passee'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              Commande passée ({chantiers.filter(c => c.statut === 'en_cours' && c.commande_passee).length})
            </button>
            <button
              onClick={() => setFiltreActif('commande_recue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filtreActif === 'commande_recue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              Commande reçue ({chantiers.filter(c => c.statut === 'en_cours' && c.commande_recue).length})
            </button>
            <button
              onClick={() => setFiltreActif('chantier_planifie')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filtreActif === 'chantier_planifie'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Chantier planifié ({chantiers.filter(c => c.statut === 'en_cours' && c.chantier_planifie).length})
            </button>
            <button
              onClick={() => setFiltreActif('realises')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filtreActif === 'realises'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Chantiers réalisés ({chantiers.filter(c => c.statut === 'finalise').length})
            </button>
          </div>
        </div>

        {chantiersFiltres.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Hammer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filtreActif === 'tous' ? 'Aucun chantier en cours' : 'Aucun chantier trouvé'}
            </h3>
            <p className="text-gray-600">
              {filtreActif === 'tous'
                ? 'Les chantiers apparaîtront ici une fois créés depuis les opportunités avec statut "Devis gagné"'
                : 'Aucun chantier ne correspond à ce filtre'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chantiersFiltres.map((chantier) => {
              const isEditing = editingId === chantier.id;
              const progress = getProgressPercentage(chantier);
              const prospect = chantier.opportunite?.prospect;

              return (
                <div
                  key={chantier.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Client
                              </label>
                              <input
                                type="text"
                                value={editFormData.titre}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, titre: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={editFormData.description}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, description: e.target.value })
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Consignes chantier
                              </label>
                              <textarea
                                value={editFormData.consignes}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, consignes: e.target.value })
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Instructions et consignes pour la réalisation du chantier..."
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">
                              {prospect?.nom} {prospect?.prenom || ''}
                            </h2>
                            <p className="text-sm text-gray-600 mb-2">
                              {chantier.opportunite?.description || 'Aucune description'}
                            </p>
                            {chantier.consignes && (
                              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-semibold text-sm text-blue-900 mb-0.5">
                                      Consignes chantier
                                    </h4>
                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                      {chantier.consignes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(chantier.id, chantier.opportunite_id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Enregistrer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditClick(chantier)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteChantier(chantier)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          chantier.commande_passee
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleToggleEtape(chantier, 'commande_passee')}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          {chantier.commande_passee ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Commande passée</h4>
                            {editingDate?.chantierId === chantier.id && editingDate?.etape === 'commande_passee' ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  value={dateValue}
                                  onChange={(e) => setDateValue(e.target.value)}
                                  className="text-xs px-1 py-0.5 border border-gray-300 rounded"
                                />
                                <button
                                  onClick={handleSaveDate}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Enregistrer"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelDateEdit}
                                  className="p-0.5 text-gray-600 hover:bg-gray-100 rounded"
                                  title="Annuler"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : chantier.date_commande_passee ? (
                              <p
                                className="text-xs text-gray-600 mt-0.5 hover:text-blue-600 cursor-pointer"
                                onClick={(e) => handleEditDate(chantier, 'commande_passee', e)}
                                title="Cliquer pour modifier"
                              >
                                {formatDate(chantier.date_commande_passee)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          chantier.commande_recue
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleToggleEtape(chantier, 'commande_recue')}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          {chantier.commande_recue ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Truck className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Commande reçue</h4>
                            {editingDate?.chantierId === chantier.id && editingDate?.etape === 'commande_recue' ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  value={dateValue}
                                  onChange={(e) => setDateValue(e.target.value)}
                                  className="text-xs px-1 py-0.5 border border-gray-300 rounded"
                                />
                                <button
                                  onClick={handleSaveDate}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Enregistrer"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelDateEdit}
                                  className="p-0.5 text-gray-600 hover:bg-gray-100 rounded"
                                  title="Annuler"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : chantier.date_commande_recue ? (
                              <p
                                className="text-xs text-gray-600 mt-0.5 hover:text-blue-600 cursor-pointer"
                                onClick={(e) => handleEditDate(chantier, 'commande_recue', e)}
                                title="Cliquer pour modifier"
                              >
                                {formatDate(chantier.date_commande_recue)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          chantier.chantier_planifie
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleToggleEtape(chantier, 'chantier_planifie')}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          {chantier.chantier_planifie ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Calendar className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Chantier planifié</h4>
                            {editingDate?.chantierId === chantier.id && editingDate?.etape === 'chantier_planifie' ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  value={dateValue}
                                  onChange={(e) => setDateValue(e.target.value)}
                                  className="text-xs px-1 py-0.5 border border-gray-300 rounded"
                                />
                                <button
                                  onClick={handleSaveDate}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Enregistrer"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelDateEdit}
                                  className="p-0.5 text-gray-600 hover:bg-gray-100 rounded"
                                  title="Annuler"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : chantier.date_chantier_planifie ? (
                              <p
                                className="text-xs text-gray-600 mt-0.5 hover:text-blue-600 cursor-pointer"
                                onClick={(e) => handleEditDate(chantier, 'chantier_planifie', e)}
                                title="Cliquer pour modifier"
                              >
                                {formatDate(chantier.date_chantier_planifie)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          chantier.chantier_realise
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleToggleEtape(chantier, 'chantier_realise')}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          {chantier.chantier_realise ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Chantier réalisé</h4>
                            {editingDate?.chantierId === chantier.id && editingDate?.etape === 'chantier_realise' ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  value={dateValue}
                                  onChange={(e) => setDateValue(e.target.value)}
                                  className="text-xs px-1 py-0.5 border border-gray-300 rounded"
                                />
                                <button
                                  onClick={handleSaveDate}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Enregistrer"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelDateEdit}
                                  className="p-0.5 text-gray-600 hover:bg-gray-100 rounded"
                                  title="Annuler"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : chantier.date_chantier_realise ? (
                              <p
                                className="text-xs text-gray-600 mt-0.5 hover:text-blue-600 cursor-pointer"
                                onClick={(e) => handleEditDate(chantier, 'chantier_realise', e)}
                                title="Cliquer pour modifier"
                              >
                                {formatDate(chantier.date_chantier_realise)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {planificationModalChantier && (
        <ChantierPlanificationModal
          chantier={planificationModalChantier}
          onClose={() => setPlanificationModalChantier(null)}
          onSuccess={() => {
            loadChantiers();
          }}
        />
      )}

      {showManualModal && (
        <ChantierManualModal
          onClose={() => setShowManualModal(false)}
          onChantierCreated={() => {
            setShowManualModal(false);
            loadChantiers();
          }}
        />
      )}
    </div>
  );
};

export default ChantiersPage;

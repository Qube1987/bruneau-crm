import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, DollarSign, MessageSquare, UserPlus, Save, RefreshCw, AlertTriangle, FileText, ChevronDown, Star, Zap, PhoneCall } from 'lucide-react';
import { StatutOpportunite, TypeInteraction } from '../types';
import { supabaseApi, Opportunite, Prospect } from '../services/supabaseApi';
import { STATUTS_OPPORTUNITE, TYPES_INTERACTION, STATUTS_CLOTURE, STATUTS_FINAUX } from '../constants';
import { extrabatApi } from '../services/extrabatApi';
import { extrabatParametersService } from '../services/extrabatParametersService';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OpportunityModal from './OpportunityModal';
import InteractionModal from './InteractionModal';
import OpportunityEditModal from './OpportunityEditModal';
import InteractionEditModal from './InteractionEditModal';
import OpportunityQuickModal from './OpportunityQuickModal';
import OpportunityCompletionModal from './OpportunityCompletionModal';

interface OpportunitiesListProps {
  onNavigateToRelances?: () => void;
}

const OpportunitiesList: React.FC<OpportunitiesListProps> = ({ onNavigateToRelances }) => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunite[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunite[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuts, setSelectedStatuts] = useState<Set<string>>(() => {
    return new Set(['a-contacter', 'contacte', 'recueil-besoin', 'redaction-devis']);
  });
  const [filterResponsable, setFilterResponsable] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunite | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunite | null>(null);
  const [showInteractionEditModal, setShowInteractionEditModal] = useState(false);
  const [interactionToEdit, setInteractionToEdit] = useState<any>(null);
  const [isSearchingExtrabat, setIsSearchingExtrabat] = useState(false);
  const [extrabatSearchResults, setExtrabatSearchResults] = useState<Client[]>([]);
  const [showExtrabatResults, setShowExtrabatResults] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [opportunityToComplete, setOpportunityToComplete] = useState<Opportunite | null>(null);

  // États pour les paramètres Extrabat
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [civilites, setCivilites] = useState<any[]>([]);
  const [originesContact, setOriginesContact] = useState<any[]>([]);
  const [typesAdresse, setTypesAdresse] = useState<any[]>([]);
  const [typesTelephone, setTypesTelephone] = useState<any[]>([]);
  const [isLoadingParams, setIsLoadingParams] = useState(true);

  const [formData, setFormData] = useState({
    civilite: '',
    nom: '',
    prenom: '',
    email: '',
    telephone1: '',
    telephone2: '',
    typeTelephone: '',
    adresse: '',
    codePostal: '',
    commune: '',
    typeAdresse: '',
    origineContact: '',
    suiviPar: 'Quentin BRUNEAU',
  });

  useEffect(() => {
    loadOpportunities();
    checkSyncStatus();
    loadExtrabatParams();
  }, []);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, searchTerm, selectedStatuts, filterResponsable, showArchived]);

  // Mettre à jour showArchived quand filterStatus change
  useEffect(() => {
    setShowArchived(selectedStatuts.has('archived'));
  }, [selectedStatuts]);

  const handleStatutToggle = (statutValue: string) => {
    setSelectedStatuts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(statutValue)) {
        newSet.delete(statutValue);
      } else {
        newSet.add(statutValue);
      }
      return newSet;
    });
  };

  const handleSelectAllStatuts = () => {
    const allStatuts = [
      ...STATUTS_OPPORTUNITE.map(s => s.value),
      ...STATUTS_FINAUX.map(s => s.value)
    ];
    setSelectedStatuts(new Set(allStatuts));
  };

  const handleDeselectAllStatuts = () => {
    setSelectedStatuts(new Set());
  };

  const loadOpportunities = async () => {
    setIsLoading(true);
    try {
      const data = await supabaseApi.getOpportunites();
      setOpportunities(data);
    } catch (error) {
      console.error('Erreur lors du chargement des opportunités:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];

    // Si on affiche les résultats Extrabat, ne pas filtrer les opportunités
    if (showExtrabatResults) {
      setFilteredOpportunities([]);
      return;
    }

    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.prospect?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.prospect?.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par statut et archivage
    if (selectedStatuts.has('archived')) {
      // Afficher seulement les opportunités archivées
      filtered = filtered.filter(opp => opp.archive === true);
    } else {
      // Afficher les opportunités non archivées avec les statuts sélectionnés
      filtered = filtered.filter(opp => {
        if (opp.archive) return false;
        // Si l'opportunité a un statut final, vérifier si celui-ci est sélectionné
        if (opp.statut_final) {
          return selectedStatuts.has(opp.statut_final);
        }
        // Sinon, vérifier le statut normal
        return selectedStatuts.has(opp.statut);
      });
    }

    if (filterResponsable !== 'all') {
      filtered = filtered.filter(opp => opp.suivi_par.includes(filterResponsable));
    }

    // Trier : prioritaires en premier, puis opportunités gagnées en bas, puis par date de création
    filtered.sort((a, b) => {
      // Les opportunités prioritaires en premier
      if (a.prioritaire && !b.prioritaire) return -1;
      if (b.prioritaire && !a.prioritaire) return 1;

      // Puis les opportunités gagnées en bas
      if (a.statut_final === 'gagne' && b.statut_final !== 'gagne') return 1;
      if (b.statut_final === 'gagne' && a.statut_final !== 'gagne') return -1;

      // Enfin par date de création
      return new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime();
    });

    setFilteredOpportunities(filtered);
  };

  const handleSearchExtrabat = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearchingExtrabat(true);
    try {
      const results = await extrabatApi.searchClients(searchTerm);
      setExtrabatSearchResults(Array.isArray(results) ? results : [results]);
      setShowExtrabatResults(true);
    } catch (error) {
      console.error('Erreur lors de la recherche Extrabat:', error);
      setExtrabatSearchResults([]);
    } finally {
      setIsSearchingExtrabat(false);
    }
  };

  const handleSelectExtrabatClient = async (client: Client) => {
    try {
      // Récupérer les détails complets du client depuis Extrabat
      console.log('🔍 Récupération des détails pour le client ID:', client.id);
      const clientDetails = await extrabatApi.getClientDetails(client.id!);
      console.log('📋 Détails client récupérés:', clientDetails);
      
      // Mapper les informations détaillées avec la structure correcte de l'API v1
      const telephones = clientDetails.telephones || [];
      const adresses = clientDetails.adresses || [];
      const email = clientDetails.client?.client_email || client.email || '';
      const civilite = clientDetails.civilite?.civilite_lib || '';

      // Logs pour debug
      console.log('📞 Structure telephones:', JSON.stringify(telephones, null, 2));
      console.log('🏠 Structure adresses:', JSON.stringify(adresses, null, 2));

      // Extraire le premier téléphone non vide
      const telephone = telephones.find((t: any) => t.tel_number && t.tel_number.trim())?.tel_number || '';
      console.log('📞 Téléphone extrait:', telephone);

      // Extraire la première adresse (format: [[{type}, {adresse}]])
      let adresse = '';
      let codePostal = '';
      let ville = '';

      if (adresses.length > 0 && Array.isArray(adresses[0]) && adresses[0].length > 1) {
        const adresseData = adresses[0][1];
        adresse = adresseData.adresse_desc || '';
        codePostal = adresseData.adresse_cp || '';
        ville = adresseData.adresse_ville || '';
      }
      console.log('🏠 Adresse extraite:', { adresse, codePostal, ville });

      // Vérifier si le client existe déjà dans Supabase
      let prospect = await supabaseApi.getProspectByExtrabatId(client.id!);

      if (!prospect) {
        // Créer le prospect dans Supabase
        const prospectData = {
          extrabat_id: client.id!,
          nom: client.nom,
          prenom: client.prenom || '',
          email: email,
          telephone: telephone,
          adresse: adresse,
          code_postal: codePostal,
          ville: ville,
          civilite: civilite,
          origine_contact: '',
          suivi_par: 'Quentin',
        };

        prospect = await supabaseApi.createProspect(prospectData);
      } else {
        // Mettre à jour le prospect existant avec les nouvelles données
        console.log('📝 Prospect existant trouvé, mise à jour avec les nouvelles données...');
        prospect = await supabaseApi.updateProspect(prospect.id, {
          actif: true,
          email: email || prospect.email,
          telephone: telephone || prospect.telephone,
          adresse: adresse || prospect.adresse,
          code_postal: codePostal || prospect.code_postal,
          ville: ville || prospect.ville,
          civilite: civilite || prospect.civilite,
        });
      }

      // Créer l'opportunité directement
      const opportunityTitle = `${client.nom} ${client.prenom || ''}`.trim();
      const shouldSendSms = user?.email !== 'quentin@bruneau27.com';
      const newOpportunity = await supabaseApi.createOpportunite({
        client_id: prospect.id,
        titre: opportunityTitle,
        description: '',
        statut: 'a-contacter',
        suivi_par: 'Quentin',
        montant_estime: undefined,
        date_travaux_estimee: undefined,
      }, shouldSendSms);

      if (shouldSendSms) {
        console.log('[LIST] SMS envoyé pour:', opportunityTitle);
      } else {
        console.log('[LIST] SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      // Réinitialiser la recherche et recharger les opportunités
      setSearchTerm('');
      setShowExtrabatResults(false);
      setExtrabatSearchResults([]);
      await loadOpportunities();

      // Ouvrir le modal d'édition avec la nouvelle opportunité
      setOpportunityToEdit({ ...newOpportunity, interactions: [] });
      setShowEditModal(true);
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'opportunité:', error);
    }
  };

  const loadExtrabatParams = async () => {
    setIsLoadingParams(true);
    try {
      const [utilisateursData, civilitesData, originesData, typesAdresseData, typesTelephoneData] = await Promise.all([
        extrabatParametersService.getUtilisateurs(),
        extrabatParametersService.getCivilites(),
        extrabatParametersService.getOriginesContact(),
        extrabatParametersService.getTypeAdresse(),
        extrabatParametersService.getTypeTelephone()
      ]);
      
      setUtilisateurs(utilisateursData);
      setCivilites(civilitesData);
      setOriginesContact(originesData);
      setTypesAdresse(typesAdresseData);
      setTypesTelephone(typesTelephoneData);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setIsLoadingParams(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const needsSync = await extrabatParametersService.needsSync();
      if (needsSync) {
        setSyncStatus('Synchronisation des paramètres Extrabat recommandée');
      } else {
        setSyncStatus('Paramètres Extrabat à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut de sync:', error);
      setSyncStatus('Erreur lors de la vérification des paramètres');
    }
  };

  const handleSyncParameters = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronisation en cours...');
    
    try {
      const results = await extrabatParametersService.syncAllParameters();
      
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      
      if (successCount === totalCount) {
        setSyncStatus(`Synchronisation réussie (${successCount}/${totalCount} tables)`);
      } else {
        setSyncStatus(`Synchronisation partielle (${successCount}/${totalCount} tables)`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setSyncStatus('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
      // Recharger les paramètres après synchronisation
      loadExtrabatParams();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = async () => {
    console.log('🔵 handleCreateClient appelé - Début de la création prospect + opportunité');

    // Validation des données avant création
    const validation = await extrabatParametersService.validateClientData(formData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    setIsCreating(true);
    
    try {
      // Récupérer les IDs Extrabat
      const extrabatIds = await extrabatParametersService.getExtrabatIds(formData);
      console.log('IDs Extrabat récupérés:', extrabatIds);

      // Préparer les téléphones
      const telephones = [];
      if (formData.telephone1) {
        telephones.push({
          number: formData.telephone1,
          typeId: extrabatIds.typeTelephoneId,
          ordre: 1
        });
      }
      if (formData.telephone2) {
        telephones.push({
          number: formData.telephone2,
          typeId: extrabatIds.typeTelephoneId,
          ordre: 2
        });
      }

      // Préparer les adresses
      const adresses = [];
      if (formData.adresse) {
        adresses.push({
          description: formData.adresse,
          codePostal: formData.codePostal,
          ville: formData.commune,
          pays: 'FR',
          typeId: extrabatIds.typeAdresseId
        });
      }

      const extrabatClientData = {
        civilite: extrabatIds.civiliteId,
        suiviPar: extrabatIds.suiviParId,
        status: extrabatIds.statusId,
        origine: extrabatIds.origineId,
        regroupementId: extrabatIds.regroupementId,
        couleurId: 0,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        observation: "",
        espaceClientEnabled: false,
        emailing: false,
        sms: false,
        telephones: telephones,
        adresses: adresses
      };

      console.log('Données client à envoyer à Extrabat:', extrabatClientData);

      const extrabatClient = await extrabatApi.createClient(extrabatClientData);
      console.log('Réponse Extrabat:', extrabatClient);
      
      // Ensuite créer le prospect dans Supabase avec l'ID Extrabat
      const prospectData = {
        extrabat_id: extrabatClient.id,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone1,
        adresse: formData.adresse,
        code_postal: formData.codePostal,
        ville: formData.commune,
        civilite: formData.civilite,
        origine_contact: formData.origineContact,
        suivi_par: formData.suiviPar,
        source: 'devis',
      };

      const createdProspect = await supabaseApi.createProspect(prospectData);

      // Créer l'opportunité directement avec l'ID Extrabat
      const opportunityTitle = `${formData.nom} ${formData.prenom || ''}`.trim();
      const shouldSendSms = user?.email !== 'quentin@bruneau27.com';
      const newOpportunity = await supabaseApi.createOpportunite({
        client_id: createdProspect.id,
        titre: opportunityTitle,
        description: '',
        statut: 'a-contacter',
        suivi_par: formData.suiviPar,
        montant_estime: undefined,
        date_travaux_estimee: undefined,
        extrabat_id: extrabatClient.id,
      }, shouldSendSms);

      if (shouldSendSms) {
        console.log('[LIST] SMS envoyé pour:', opportunityTitle);
      } else {
        console.log('[LIST] SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      // Réinitialiser le formulaire
      setFormData({
        civilite: '',
        nom: '',
        prenom: '',
        email: '',
        telephone1: '',
        telephone2: '',
        typeTelephone: '',
        adresse: '',
        codePostal: '',
        commune: '',
        typeAdresse: '',
        origineContact: '',
        suiviPar: 'Quentin BRUNEAU',
      });

      setShowCreateForm(false);
      await loadOpportunities();

      console.log('✅ Client et opportunité créés avec succès');
      console.log('📋 Données de l\'opportunité avant ouverture du modal:', {
        id: newOpportunity.id,
        titre: newOpportunity.titre,
        extrabat_id: newOpportunity.extrabat_id,
        client_id: newOpportunity.client_id,
        prospect: newOpportunity.prospect
      });

      // Ouvrir le modal d'édition avec la nouvelle opportunité
      setOpportunityToEdit({ ...newOpportunity, interactions: [] });
      setShowEditModal(true);
      console.log('🔵 Modal d\'édition ouvert');
      
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowExtrabatResults(false);
    setExtrabatSearchResults([]);
  };

  const getStatusConfig = (statut: StatutOpportunite) => {
    return STATUTS_OPPORTUNITE.find(s => s.value === statut) || STATUTS_OPPORTUNITE[0];
  };

  const handleStatusChange = async (opportunityId: string, newStatus: StatutOpportunite) => {
    const scrollPosition = window.scrollY;
    try {
      if (newStatus === 'standby') {
        // Passer en standby archive l'opportunité
        await supabaseApi.updateOpportunite(opportunityId, {
          statut: newStatus,
          statut_final: 'standby',
          archive: true,
          date_cloture: new Date().toISOString()
        });
      } else {
        // Changer d'étape réactive l'opportunité si elle était archivée
        const opportunity = opportunities.find(opp => opp.id === opportunityId);
        const updates: any = { statut: newStatus };

        if (opportunity?.archive && (opportunity?.statut_final === 'standby' || opportunity?.statut_final === 'perdu')) {
          // Réactiver l'opportunité
          updates.archive = false;
          updates.statut_final = null;
          updates.date_cloture = null;
        }

        await supabaseApi.updateOpportunite(opportunityId, updates);
      }
      await loadOpportunities();
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleFinalStatusChange = async (opportunityId: string, finalStatus: 'gagne' | 'perdu' | 'standby') => {
    const scrollPosition = window.scrollY;
    try {
      const opportunity = opportunities.find(o => o.id === opportunityId);

      if (finalStatus === 'gagne') {
        if (opportunity?.saisie_rapide && !opportunity?.extrabat_id) {
          setOpportunityToComplete(opportunity);
          setShowCompletionModal(true);
          return;
        }

        await supabaseApi.updateOpportunite(opportunityId, {
          statut_final: finalStatus,
          date_cloture: new Date().toISOString()
        });

        if (opportunity?.extrabat_id) {
          await supabaseApi.createChantier({
            opportunite_id: opportunityId,
            extrabat_id: opportunity.extrabat_id,
            statut: 'en_cours',
            suivi_par: opportunity.suivi_par,
          });
        }
      } else {
        await supabaseApi.updateOpportunite(opportunityId, {
          statut_final: finalStatus
        });
      }
      await loadOpportunities();
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut final:', error);
    }
  };

  const handleArchiveOpportunity = async (opportunityId: string) => {
    const scrollPosition = window.scrollY;
    try {
      await supabaseApi.updateOpportunite(opportunityId, {
        archive: true,
        date_cloture: new Date().toISOString()
      });
      await loadOpportunities();
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
    }
  };

  const handleReactivateOpportunity = async (opportunityId: string) => {
    const scrollPosition = window.scrollY;
    try {
      await supabaseApi.updateOpportunite(opportunityId, {
        archive: false,
        statut_final: null,
        date_cloture: null
      });
      await loadOpportunities();
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error);
    }
  };

  const handleTogglePrioritaire = async (opportunityId: string, currentPrioritaire: boolean) => {
    const scrollPosition = window.scrollY;
    try {
      await supabaseApi.toggleOpportunitePrioritaire(opportunityId, !currentPrioritaire);
      await loadOpportunities();
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la priorité:', error);
    }
  };

  const handleOpportunityCreated = () => {
    setShowOpportunityModal(false);
    loadOpportunities();
  };

  const handleQuickOpportunityCreated = () => {
    setShowQuickModal(false);
    loadOpportunities();
  };

  const handleInteractionAdded = () => {
    setShowInteractionModal(false);
    setSelectedOpportunity(null);
    loadOpportunities();
  };

  const handleAddInteraction = (opportunity: Opportunite) => {
    setSelectedOpportunity(opportunity);
    setShowInteractionModal(true);
  };

  const handleEditOpportunity = (opportunity: Opportunite) => {
    setOpportunityToEdit(opportunity);
    setShowEditModal(true);
  };

  const handleOpportunityUpdated = () => {
    setShowEditModal(false);
    setOpportunityToEdit(null);
    loadOpportunities();
  };

  const handleOpportunityDeleted = () => {
    setShowEditModal(false);
    setOpportunityToEdit(null);
    loadOpportunities();
  };

  const handleEditInteraction = (interaction: any) => {
    setInteractionToEdit(interaction);
    setShowInteractionEditModal(true);
  };

  const handleInteractionUpdated = () => {
    setShowInteractionEditModal(false);
    setInteractionToEdit(null);
    loadOpportunities();
  };

  const handleInteractionDeleted = () => {
    setShowInteractionEditModal(false);
    setInteractionToEdit(null);
    loadOpportunities();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Opportunités</h2>
            {onNavigateToRelances && (
              <button
                onClick={onNavigateToRelances}
                className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                <PhoneCall className="h-5 w-5" />
                Relances devis
              </button>
            )}
          </div>


          {/* Filtres et recherche */}
          <div className="space-y-4 mb-4">
            {/* Ligne de recherche et boutons */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une opportunité ou un client Extrabat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchExtrabat();
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {showExtrabatResults && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={handleSearchExtrabat}
                disabled={isSearchingExtrabat || !searchTerm.trim()}
                className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                {isSearchingExtrabat ? 'Recherche...' : 'Rechercher Extrabat'}
              </button>

              <button
                onClick={() => setShowQuickModal(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Zap className="h-5 w-5" />
                Saisie Rapide
              </button>

              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <UserPlus className="h-5 w-5" />
                {showCreateForm ? 'Annuler' : 'Nouveau prospect'}
              </button>

            </div>

            {/* Ligne des filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropdown des statuts avec checkboxes */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white flex items-center justify-between"
                >
                  <span>Statuts ({selectedStatuts.size}/{STATUTS_OPPORTUNITE.length + STATUTS_FINAUX.length})</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[250px]">
                    <div className="p-2 border-b border-gray-200 flex gap-2">
                      <button
                        onClick={handleSelectAllStatuts}
                        className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded hover:bg-primary-200 transition-colors"
                      >
                        Tout sélectionner
                      </button>
                      <button
                        onClick={handleDeselectAllStatuts}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {STATUTS_OPPORTUNITE.map((statut) => (
                        <label
                          key={statut.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatuts.has(statut.value)}
                            onChange={() => handleStatutToggle(statut.value)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statut.color}`}>
                            {statut.label}
                          </span>
                        </label>
                      ))}
                      <div className="border-t border-gray-200 my-1"></div>
                      {STATUTS_FINAUX.map((statut) => (
                        <label
                          key={statut.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatuts.has(statut.value)}
                            onChange={() => handleStatutToggle(statut.value)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statut.color}`}>
                            {statut.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={filterResponsable}
                  onChange={(e) => setFilterResponsable(e.target.value)}
                  disabled={showExtrabatResults}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Tous les responsables</option>
                  {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                    <option key={utilisateur.id} value={utilisateur.nom}>
                      {utilisateur.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nouveau Prospect + Opportunité</h3>
              
              {/* Erreurs de validation */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Erreurs de validation</h4>
                  </div>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Civilité</label>
                  <select
                    value={formData.civilite}
                    onChange={(e) => handleInputChange('civilite', e.target.value)}
                    disabled={isLoadingParams}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une civilité</option>
                    {civilites.map((civilite) => (
                      <option key={civilite.id} value={civilite.libelle}>
                        {civilite.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom / Raison sociale *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => handleInputChange('prenom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone 1 *</label>
                  <input
                    type="tel"
                    value={formData.telephone1}
                    onChange={(e) => handleInputChange('telephone1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone 2</label>
                  <input
                    type="tel"
                    value={formData.telephone2}
                    onChange={(e) => handleInputChange('telephone2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de téléphone *</label>
                  <select
                    value={formData.typeTelephone}
                    onChange={(e) => handleInputChange('typeTelephone', e.target.value)}
                    disabled={isLoadingParams}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    {typesTelephone.map((type) => (
                      <option key={type.id} value={type.libelle}>
                        {type.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (n° et rue) *</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                  <input
                    type="text"
                    value={formData.codePostal}
                    onChange={(e) => handleInputChange('codePostal', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commune *</label>
                  <input
                    type="text"
                    value={formData.commune}
                    onChange={(e) => handleInputChange('commune', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'adresse *</label>
                  <select
                    value={formData.typeAdresse}
                    onChange={(e) => handleInputChange('typeAdresse', e.target.value)}
                    disabled={isLoadingParams}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    {typesAdresse.map((type) => (
                      <option key={type.id} value={type.libelle}>
                        {type.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origine de contact *</label>
                  <select
                    value={formData.origineContact}
                    onChange={(e) => handleInputChange('origineContact', e.target.value)}
                    disabled={isLoadingParams}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une origine</option>
                    {originesContact.map((origine) => (
                      <option key={origine.id} value={origine.libelle}>
                        {origine.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suivi par *</label>
                  <select
                    value={formData.suiviPar}
                    onChange={(e) => handleInputChange('suiviPar', e.target.value)}
                    disabled={isLoadingParams}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                      <option key={utilisateur.id} value={utilisateur.nom}>
                        {utilisateur.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCreateClient}
                  disabled={isCreating || !formData.nom || !formData.email || !formData.telephone1 || !formData.typeTelephone || !formData.typeAdresse}
                  className="px-6 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {isCreating ? 'Création...' : 'Créer prospect + opportunité'}
                </button>
                
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Résultats de recherche Extrabat */}
          {showExtrabatResults && (
            <div className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-blue-900">
                  Résultats de recherche Extrabat ({extrabatSearchResults.length})
                </h3>
                <button
                  onClick={handleClearSearch}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Retour aux opportunités
                </button>
              </div>
              
              {extrabatSearchResults.length === 0 ? (
                <p className="text-blue-700">Aucun client trouvé sur Extrabat</p>
              ) : (
                <div className="space-y-3">
                  {extrabatSearchResults.map((client) => (
                    <div key={client.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {client.civilite?.libelle} {client.nom} {client.prenom}
                        </h4>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        {client.telephones?.[0] && (
                          <p className="text-sm text-gray-600">{client.telephones[0].number}</p>
                        )}
                        {client.adresses?.[0] && (
                          <p className="text-sm text-gray-500">
                            {client.adresses[0].description}, {client.adresses[0].codePostal} {client.adresses[0].ville}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectExtrabatClient(client)}
                        className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        Créer opportunité
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des opportunités...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{showExtrabatResults ? 'Utilisez la recherche Extrabat ci-dessus' : 'Aucune opportunité trouvée'}</p>
              {searchTerm && <p className="text-sm">Essayez avec d'autres mots-clés</p>}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOpportunities.map((opportunity) => {
                const statusConfig = getStatusConfig(opportunity.statut);
                const isWon = opportunity.statut_final === 'gagne';
                const isArchived = opportunity.archive;
                
                console.log('Opportunity:', opportunity.titre, {
                  archive: opportunity.archive,
                  statut_final: opportunity.statut_final,
                  isArchived: isArchived
                });
                
                return (
                  <div
                    key={opportunity.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      opportunity.prioritaire
                        ? 'bg-amber-50 border-amber-300 hover:border-amber-400 shadow-sm'
                        : isWon
                        ? 'bg-green-50 border-green-200 hover:border-green-300'
                        : isArchived
                        ? 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    onClick={() => handleEditOpportunity(opportunity)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-medium text-gray-900 break-words">
                            {opportunity.titre}
                          </h3>
                          {opportunity.saisie_rapide && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                              À compléter
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2 break-words">{opportunity.description}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1 min-w-0">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{opportunity.prospect?.nom} {opportunity.prospect?.prenom}</span>
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{new Date(opportunity.date_creation).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {opportunity.date_travaux_estimee && (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>Travaux: {new Date(opportunity.date_travaux_estimee).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          {opportunity.montant_estime && (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <DollarSign className="h-4 w-4 flex-shrink-0" />
                              <span>{opportunity.montant_estime.toLocaleString('fr-FR')} €</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePrioritaire(opportunity.id, opportunity.prioritaire || false);
                            }}
                            className={`p-1 rounded transition-colors flex-shrink-0 ${
                              opportunity.prioritaire
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-gray-300 hover:text-amber-400'
                            }`}
                            title={opportunity.prioritaire ? 'Retirer de la priorité' : 'Marquer comme prioritaire'}
                          >
                            <Star
                              className={`h-5 w-5 ${opportunity.prioritaire ? 'fill-amber-500' : ''}`}
                            />
                          </button>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        {opportunity.statut_final && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            STATUTS_FINAUX.find(s => s.value === opportunity.statut_final)?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {STATUTS_FINAUX.find(s => s.value === opportunity.statut_final)?.label}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Suivi par {opportunity.suivi_par}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      <select
                        value={opportunity.statut}
                        onChange={(e) => handleStatusChange(opportunity.id, e.target.value as StatutOpportunite)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-shrink-0"
                      >
                        {STATUTS_OPPORTUNITE.map((statut) => (
                          <option key={statut.value} value={statut.value}>
                            {statut.label}
                          </option>
                        ))}
                      </select>
                      {!isArchived && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinalStatusChange(opportunity.id, 'gagne');
                            }}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            🎉 Gagné!
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinalStatusChange(opportunity.id, 'perdu');
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Perdu
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinalStatusChange(opportunity.id, 'standby');
                            }}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Standby
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveOpportunity(opportunity.id);
                            }}
                            className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Archiver
                          </button>
                        </>
                      )}
                      {isArchived && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivateOpportunity(opportunity.id);
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                          Réactiver
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddInteraction(opportunity);
                        }}
                        className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-1 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0 ml-auto"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Interaction
                      </button>
                    </div>

                    {/* Interactions récentes */}
                    {opportunity.interactions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Interactions récentes</h4>
                        <div className="space-y-2">
                          {opportunity.interactions.slice(-2).map((interaction) => {
                            const typeConfig = TYPES_INTERACTION.find(t => t.value === interaction.type);
                            
                            return (
                              <div 
                                key={interaction.id} 
                                className="text-xs bg-gray-50 rounded p-2 hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditInteraction(interaction);
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span>{typeConfig?.icon}</span>
                                  <span className="font-medium">
                                    {typeConfig?.label} avec {interaction.utilisateur} le {new Date(interaction.date).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                                <p className="text-gray-600">{interaction.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section de synchronisation des paramètres */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-primary-50 rounded-lg border border-primary-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-primary-900 mb-2">Paramètres Extrabat</h3>
              <p className="text-sm text-primary-700">{syncStatus}</p>
              {isLoadingParams && (
                <p className="text-sm text-primary-600">Chargement des paramètres...</p>
              )}
            </div>
            <button
              onClick={handleSyncParameters}
              disabled={isSyncing}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showQuickModal && (
        <OpportunityQuickModal
          onClose={() => setShowQuickModal(false)}
          onOpportunityCreated={handleQuickOpportunityCreated}
        />
      )}

      {showCompletionModal && opportunityToComplete && (
        <OpportunityCompletionModal
          opportunity={opportunityToComplete}
          onClose={() => {
            setShowCompletionModal(false);
            setOpportunityToComplete(null);
          }}
          onCompleted={async () => {
            setShowCompletionModal(false);
            setOpportunityToComplete(null);
            await loadOpportunities();
          }}
        />
      )}

      {showOpportunityModal && (
        <OpportunityModal
          onClose={() => setShowOpportunityModal(false)}
          onOpportunityCreated={handleOpportunityCreated}
        />
      )}

      {showInteractionModal && selectedOpportunity && (
        <InteractionModal
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowInteractionModal(false);
            setSelectedOpportunity(null);
          }}
          onInteractionAdded={handleInteractionAdded}
        />
      )}

      {showEditModal && opportunityToEdit && (
        <OpportunityEditModal
          opportunite={opportunityToEdit}
          onClose={() => {
            setShowEditModal(false);
            setOpportunityToEdit(null);
          }}
          onOpportunityUpdated={handleOpportunityUpdated}
          onOpportunityDeleted={handleOpportunityDeleted}
        />
      )}

      {showInteractionEditModal && interactionToEdit && (
        <InteractionEditModal
          interaction={interactionToEdit}
          onClose={() => {
            setShowInteractionEditModal(false);
            setInteractionToEdit(null);
          }}
          onInteractionUpdated={handleInteractionUpdated}
          onInteractionDeleted={handleInteractionDeleted}
        />
      )}
    </div>
  );
};

export default OpportunitiesList;
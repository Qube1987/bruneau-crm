import React, { useState, useEffect } from 'react';
import { Save, Search, UserPlus, RefreshCw, AlertTriangle, User, Mail, Phone, MapPin } from 'lucide-react';
import { Client } from '../types';
import { extrabatApi } from '../services/extrabatApi';
import { supabaseApi, supabase } from '../services/supabaseApi';
import { extrabatParametersService } from '../services/extrabatParametersService';
import ProspectDetailsModal from './ProspectDetailsModal';
import { CIVILITES_OPTIONS } from '../constants';

interface ProspectFormProps {
  onClientCreated: (client: Client) => void;
  refreshTrigger: number;
}

const ProspectForm: React.FC<ProspectFormProps> = ({ onClientCreated, refreshTrigger }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [prospectsWithActions, setProspectsWithActions] = useState<any[]>([]);
  const [filterSuiviPar, setFilterSuiviPar] = useState<string>('all');
  
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
    // Vérifier si une synchronisation est nécessaire
    checkSyncStatus();
    loadExtrabatParams();
    loadProspects();
  }, []);

  useEffect(() => {
    loadProspects();
  }, [refreshTrigger]);

  const loadProspects = async () => {
    setIsLoadingProspects(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('source', 'fidelisation')
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const results = data || [];

      const prospectsWithActionsData = await Promise.all(
        results.map(async (prospect) => {
          try {
            const actions = await supabaseApi.getProspectActionsCommerciales(prospect.id);
            return {
              ...prospect,
              actions: actions || {
                contrat_maintenance: 'a_proposer',
                telesurveillance: 'a_proposer',
                parrainage: 'a_proposer',
                avis_google: 'solliciter'
              }
            };
          } catch (error) {
            console.error(`Erreur lors du chargement des actions pour le prospect ${prospect.id}:`, error);
            return {
              ...prospect,
              actions: {
                contrat_maintenance: 'a_proposer',
                telesurveillance: 'a_proposer',
                parrainage: 'a_proposer',
                avis_google: 'solliciter'
              }
            };
          }
        })
      );

      setProspects(results);
      setProspectsWithActions(prospectsWithActionsData);
    } catch (error) {
      console.error('Erreur lors du chargement des prospects:', error);
      setProspects([]);
      setProspectsWithActions([]);
    } finally {
      setIsLoadingProspects(false);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await extrabatApi.searchClients(searchQuery);
      setSearchResults(Array.isArray(results) ? results : [results]);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectClient = async (client: Client) => {
    try {
      // Récupérer les détails complets du client depuis Extrabat
      console.log('🔍 Récupération des détails pour le client ID:', client.id);
      const clientDetails = await extrabatApi.getClientDetails(client.id!);
      console.log('📋 Détails client récupérés:', clientDetails);
      console.log('📞 Téléphones:', clientDetails.telephones);
      console.log('📍 Adresses:', clientDetails.adresses);
      console.log('📧 Email:', clientDetails.email);

      // Mapper les informations détaillées
      const enrichedClient = {
        ...client,
        telephones: clientDetails.telephones || client.telephones || [],
        adresses: clientDetails.adresses || client.adresses || [],
        email: clientDetails.email || client.email || '',
      };

      console.log('✨ Client enrichi:', enrichedClient);

      // Vérifier si le client existe déjà dans Supabase
      const existingProspect = await supabaseApi.getProspectByExtrabatId(enrichedClient.id!);

      if (existingProspect) {
        // Le prospect existe déjà - mettre à jour ses données
        console.log('📝 Prospect existant, mise à jour des données...');
        await supabaseApi.updateProspect(existingProspect.id, {
          actif: true,
          source: 'fidelisation',
          email: enrichedClient.email || existingProspect.email,
          telephone: enrichedClient.telephones?.[0]?.number || existingProspect.telephone,
          adresse: enrichedClient.adresses?.[0]?.description || existingProspect.adresse,
          code_postal: enrichedClient.adresses?.[0]?.codePostal || existingProspect.code_postal,
          ville: enrichedClient.adresses?.[0]?.ville || existingProspect.ville,
          civilite: enrichedClient.civilite?.libelle || existingProspect.civilite,
        });
        onClientCreated(enrichedClient);
        return;
      }

      // LOGS DÉTAILLÉS pour debugger
      console.log('🔍 DEBUG enrichedClient.telephones:', enrichedClient.telephones);
      console.log('🔍 DEBUG enrichedClient.telephones[0]:', enrichedClient.telephones?.[0]);
      console.log('🔍 DEBUG enrichedClient.telephones[0]?.number:', enrichedClient.telephones?.[0]?.number);
      console.log('🔍 DEBUG enrichedClient.adresses:', enrichedClient.adresses);
      console.log('🔍 DEBUG enrichedClient.adresses[0]:', enrichedClient.adresses?.[0]);
      console.log('🔍 DEBUG enrichedClient.adresses[0]?.description:', enrichedClient.adresses?.[0]?.description);

      // Créer le prospect dans Supabase
      const prospectData = {
        extrabat_id: enrichedClient.id!,
        nom: enrichedClient.nom,
        prenom: enrichedClient.prenom || '',
        email: enrichedClient.email || '',
        telephone: enrichedClient.telephones?.[0]?.number || '',
        adresse: enrichedClient.adresses?.[0]?.description || '',
        code_postal: enrichedClient.adresses?.[0]?.codePostal || '',
        ville: enrichedClient.adresses?.[0]?.ville || '',
        civilite: enrichedClient.civilite?.libelle || '',
        origine_contact: '',
        suivi_par: 'Quentin',
        source: 'fidelisation',
      };

      console.log('💾 Données à enregistrer dans Supabase:', prospectData);
      await supabaseApi.createProspect(prospectData);
      onClientCreated(enrichedClient);
    } catch (error) {
      console.error('Erreur lors de la sélection du client:', error);
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = async () => {
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
        source: 'fidelisation',
      };

      const createdProspect = await supabaseApi.createProspect(prospectData);
      
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
      onClientCreated({
        id: extrabatClient.id,
        nom: createdProspect.nom,
        prenom: createdProspect.prenom || '',
        email: createdProspect.email || '',
        telephones: formData.telephone1 ? [{ number: formData.telephone1, ordre: 1 }] : [],
        adresses: formData.adresse ? [{
          description: formData.adresse,
          codePostal: formData.codePostal,
          ville: formData.commune
        }] : [],
        civilite: { 
          id: extrabatIds.civiliteId,
          libelle: extrabatIds.civiliteLibelle,
          professionnel: extrabatIds.isProfessional
        },
      });
      
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleProspectClick = (prospect: any) => {
    setSelectedProspect(prospect);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedProspect(null);
  };

  const handleProspectUpdate = () => {
    loadProspects();
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

  const filteredProspects = prospectsWithActions.filter(prospect =>
    (prospect.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prospect.prenom && prospect.prenom.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (prospect.email && prospect.email.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (filterSuiviPar === 'all' || prospect.suivi_par === filterSuiviPar) &&
    (searchTerm.trim() !== '' || prospect.actif !== false)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Prospects</h2>
        
        {/* Section de recherche */}
        <div className="mb-8">
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher un client sur Extrabat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Résultats de recherche</h3>
              <div className="space-y-3">
                {searchResults.map((client) => (
                  <div key={client.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {client.civilite?.libelle} {client.nom} {client.prenom}
                      </h4>
                      <p className="text-sm text-gray-600">{client.email}</p>
                      {client.telephones?.[0] && (
                        <p className="text-sm text-gray-600">{client.telephones[0].number}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectClient(client)}
                      className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                    >
                      Sélectionner
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bouton pour créer un nouveau client */}
        <div className="mb-6 flex">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            {showCreateForm ? 'Annuler la création' : 'Créer un nouveau prospect'}
          </button>
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nouveau Prospect</h3>
            
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
                {isCreating ? 'Création...' : 'Créer le prospect'}
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

        {/* Liste des prospects existants */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Liste des Prospects</h3>
            <div className="flex items-center gap-4">
              <select
                value={filterSuiviPar}
                onChange={(e) => setFilterSuiviPar(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Tous les responsables</option>
                {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                  <option key={utilisateur.id} value={utilisateur.nom}>
                    {utilisateur.nom}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrer les prospects ou rechercher un prospect inactif"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {isLoadingProspects ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des prospects...</p>
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun prospect trouvé</p>
              {searchTerm && <p className="text-sm">Essayez avec d'autres mots-clés</p>}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary-300"
                  onClick={() => handleProspectClick(prospect)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="text-lg font-medium text-gray-900 break-words">
                          {prospect.civilite} {prospect.nom} {prospect.prenom}
                        </h4>
                        {prospect.actif === false && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full whitespace-nowrap">
                            Inactif
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full whitespace-nowrap">
                          {prospect.suivi_par}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        {prospect.email && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{prospect.email}</span>
                          </div>
                        )}

                        {prospect.telephone && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{prospect.telephone}</span>
                          </div>
                        )}

                        {prospect.adresse && (
                          <div className="flex items-center gap-2 md:col-span-2 min-w-0">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="break-words">
                              {prospect.adresse}, {prospect.code_postal} {prospect.ville}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-sm text-gray-500">
                        <p>Suivi par: {prospect.suivi_par}</p>
                        <p>Créé le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
                      <div className="text-xs text-gray-500 mb-1 font-bold">Actions commerciales :</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 min-w-0 flex-1">Contrat maintenance</span>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(prospect.actions?.contrat_maintenance || 'a_proposer')}`}
                            title={getStatusTitle('contrat_maintenance', prospect.actions?.contrat_maintenance || 'a_proposer')}
                          ></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 min-w-0 flex-1">Télésurveillance</span>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(prospect.actions?.telesurveillance || 'a_proposer')}`}
                            title={getStatusTitle('telesurveillance', prospect.actions?.telesurveillance || 'a_proposer')}
                          ></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 min-w-0 flex-1">Parrainage</span>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(prospect.actions?.parrainage || 'a_proposer')}`}
                            title={getStatusTitle('parrainage', prospect.actions?.parrainage || 'a_proposer')}
                          ></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 min-w-0 flex-1">Avis Google</span>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(prospect.actions?.avis_google || 'solliciter')}`}
                            title={getStatusTitle('avis_google', prospect.actions?.avis_google || 'solliciter')}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section de synchronisation des paramètres - déplacée en bas */}
        <div className="mt-8 p-4 bg-primary-50 rounded-lg border border-primary-200">
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

      {showDetailsModal && selectedProspect && (
        <ProspectDetailsModal
          prospect={selectedProspect}
          onClose={handleCloseDetailsModal}
          onUpdate={handleProspectUpdate}
        />
      )}
    </div>
  );
};

export default ProspectForm;
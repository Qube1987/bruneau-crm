import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Save, AlertTriangle } from 'lucide-react';
import { extrabatApi } from '../services/extrabatApi';
import { supabaseApi } from '../services/supabaseApi';
import { extrabatParametersService } from '../services/extrabatParametersService';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SendToDevisModalProps {
  salarie: {
    id: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
  };
  sourceInfo?: {
    type: 'action_commerciale' | 'prospection';
    clientName?: string;
    actionName?: string;
    actionType?: string;
    description?: string;
    commentaires?: string;
  };
  onClose: () => void;
  onOpportunityCreated: () => void;
}

const SendToDevisModal: React.FC<SendToDevisModalProps> = ({
  salarie,
  sourceInfo,
  onClose,
  onOpportunityCreated
}) => {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // États pour les paramètres Extrabat
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [civilites, setCivilites] = useState<any[]>([]);
  const [originesContact, setOriginesContact] = useState<any[]>([]);
  const [typesAdresse, setTypesAdresse] = useState<any[]>([]);
  const [typesTelephone, setTypesTelephone] = useState<any[]>([]);
  const [isLoadingParams, setIsLoadingParams] = useState(true);

  const [formData, setFormData] = useState({
    civilite: '',
    nom: salarie.nom,
    prenom: salarie.prenom || '',
    email: salarie.email || '',
    telephone1: salarie.telephone || '',
    telephone2: '',
    typeTelephone: '',
    adresse: salarie.adresse || '',
    codePostal: salarie.code_postal || '',
    commune: salarie.ville || '',
    typeAdresse: '',
    origineContact: '',
    suiviPar: 'Quentin BRUNEAU',
  });

  useEffect(() => {
    loadExtrabatParams();
    // Recherche automatique au chargement
    if (salarie.nom) {
      setSearchQuery(salarie.nom);
      handleSearch();
    }
  }, []);

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
      const clientDetails = await extrabatApi.getClientDetails(client.id!);

      // Mapper les informations détaillées
      const enrichedClient = {
        ...client,
        telephones: clientDetails.telephones || client.telephones || [],
        adresses: clientDetails.adresses || client.adresses || [],
        email: clientDetails.email || client.email || '',
      };

      // Vérifier si le client existe déjà dans Supabase
      let prospect = await supabaseApi.getProspectByExtrabatId(enrichedClient.id!);

      if (!prospect) {
        // Créer le prospect dans Supabase uniquement
        // NE PAS créer dans Extrabat car le client existe déjà (on vient de le rechercher)
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
          source: 'devis',
        };

        prospect = await supabaseApi.createProspect(prospectData);
      } else {
        // Mettre à jour le prospect existant avec les nouvelles données
        prospect = await supabaseApi.updateProspect(prospect.id, {
          actif: true,
          source: 'devis',
          email: enrichedClient.email || prospect.email,
          telephone: enrichedClient.telephones?.[0]?.number || prospect.telephone,
          adresse: enrichedClient.adresses?.[0]?.description || prospect.adresse,
          code_postal: enrichedClient.adresses?.[0]?.codePostal || prospect.code_postal,
          ville: enrichedClient.adresses?.[0]?.ville || prospect.ville,
          civilite: enrichedClient.civilite?.libelle || prospect.civilite,
        });
      }

      // Générer la description avec l'origine
      let opportunityDescription = `Devis pour ${salarie.nom} ${salarie.prenom || ''}`;
     let opportunityComments = '';
     
      if (sourceInfo) {
        if (sourceInfo.type === 'action_commerciale') {
          const actionTypeLabel = sourceInfo.actionType === 'clients_pros_remise_salaries' ? 'Clients pros, remise aux salariés' : sourceInfo.actionType || 'Action commerciale';
          opportunityDescription = `Prospect provenant de l'action commerciale ${sourceInfo.clientName || 'Client inconnu'} - ${actionTypeLabel}`;
         
         // Ajouter la description et les commentaires du salarié
         if (salarie.commentaires) {
           const salarieInfo = [];
           if (salarie.commentaires) salarieInfo.push(`Commentaires: ${salarie.commentaires}`);
           opportunityComments = salarieInfo.join('\n\n');
         }
        } else if (sourceInfo.type === 'prospection') {
          opportunityDescription = `Prospect provenant de l'action de prospection : ${sourceInfo.description}`;
         opportunityComments = sourceInfo.commentaires || '';
        }
      }

      // Créer l'opportunité
      const opportunityTitle = `${salarie.nom} ${salarie.prenom || ''} - Devis`.trim();
      await supabaseApi.createOpportunite({
        client_id: prospect.id,
        titre: opportunityTitle,
        description: opportunityDescription,
       commentaires: opportunityComments,
        statut: 'recueil-besoin',
        suivi_par: 'Quentin',
        montant_estime: undefined,
        date_travaux_estimee: undefined,
      }, false);

      if (user?.email !== 'quentin@bruneau27.com') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
          console.log('Envoi du SMS pour l\'opportunité:', opportunityTitle);
          console.log('URL:', `${supabaseUrl}/functions/v1/send-sms-notification`);

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

          console.log('Statut de la réponse SMS:', smsResponse.status);
          const responseText = await smsResponse.text();
          console.log('Réponse SMS complète:', responseText);

          if (!smsResponse.ok) {
            console.error('Erreur lors de l\'envoi du SMS:', responseText);
          } else {
            console.log('SMS envoyé avec succès');
          }
        } catch (smsError) {
          console.error('Erreur lors de l\'appel de la fonction SMS:', smsError);
        }
      } else {
        console.log('SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      onOpportunityCreated();
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

      const extrabatClient = await extrabatApi.createClient(extrabatClientData);
      
      // Créer le prospect dans Supabase avec l'ID Extrabat
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
      
      // Générer la description avec l'origine
      let opportunityDescription = `Devis pour ${salarie.nom} ${salarie.prenom || ''}`;
     let opportunityComments = '';
     
      if (sourceInfo) {
        if (sourceInfo.type === 'action_commerciale') {
          const actionTypeLabel = sourceInfo.actionType === 'clients_pros_remise_salaries' ? 'Clients pros, remise aux salariés' : sourceInfo.actionType || 'Action commerciale';
          opportunityDescription = `Prospect provenant de l'action commerciale ${sourceInfo.clientName || 'Client inconnu'} - ${actionTypeLabel}`;
         
         // Ajouter la description et les commentaires du salarié
         if (salarie.commentaires) {
           const salarieInfo = [];
           if (salarie.commentaires) salarieInfo.push(`Commentaires: ${salarie.commentaires}`);
           opportunityComments = salarieInfo.join('\n\n');
         }
        } else if (sourceInfo.type === 'prospection') {
          opportunityDescription = `Prospect provenant de l'action de prospection : ${sourceInfo.description}`;
         opportunityComments = sourceInfo.commentaires || '';
        }
      }

      // Créer l'opportunité
      const opportunityTitle = `${formData.nom} ${formData.prenom || ''} - Devis`.trim();
      await supabaseApi.createOpportunite({
        client_id: createdProspect.id,
        titre: opportunityTitle,
        description: opportunityDescription,
       commentaires: opportunityComments,
        statut: 'recueil-besoin',
        suivi_par: formData.suiviPar,
        montant_estime: undefined,
        date_travaux_estimee: undefined,
      }, false);

      if (user?.email !== 'quentin@bruneau27.com') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
          console.log('Envoi du SMS pour l\'opportunité:', opportunityTitle);
          console.log('URL:', `${supabaseUrl}/functions/v1/send-sms-notification`);

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

          console.log('Statut de la réponse SMS:', smsResponse.status);
          const responseText = await smsResponse.text();
          console.log('Réponse SMS complète:', responseText);

          if (!smsResponse.ok) {
            console.error('Erreur lors de l\'envoi du SMS:', responseText);
          } else {
            console.log('SMS envoyé avec succès');
          }
        } catch (smsError) {
          console.error('Erreur lors de l\'appel de la fonction SMS:', smsError);
        }
      } else {
        console.log('SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      onOpportunityCreated();
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Envoyer vers Devis</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Informations du salarié */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Salarié: {salarie.nom} {salarie.prenom}
            </h4>
            <div className="text-sm text-gray-600">
              {salarie.email && <p>Email: {salarie.email}</p>}
              {salarie.telephone && <p>Téléphone: {salarie.telephone}</p>}
              {salarie.adresse && (
                <p>Adresse: {salarie.adresse}, {salarie.code_postal} {salarie.ville}</p>
              )}
            </div>
          </div>

          {/* Section de recherche */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Rechercher le client sur Extrabat</h4>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher un client sur Extrabat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
                <h5 className="font-medium text-gray-900 mb-3">Résultats de recherche</h5>
                <div className="space-y-3">
                  {searchResults.map((client) => (
                    <div key={client.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <h6 className="font-medium text-gray-900">
                          {client.civilite?.libelle} {client.nom} {client.prenom}
                        </h6>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        {client.telephones?.[0] && (
                          <p className="text-sm text-gray-600">{client.telephones[0].number}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectClient(client)}
                        className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 transition-colors"
                      >
                        Créer devis
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message si aucun résultat */}
            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className="text-center py-4 text-gray-500">
                <p>Aucun client trouvé pour "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Bouton pour créer un nouveau prospect */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              {showCreateForm ? 'Annuler la création' : 'Créer le prospect sur Extrabat'}
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h5 className="text-lg font-medium text-gray-900 mb-4">Nouveau Prospect</h5>
              
              {/* Erreurs de validation */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h6 className="font-medium text-red-800">Erreurs de validation</h6>
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
                  {isCreating ? 'Création...' : 'Créer et envoyer vers devis'}
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
        </div>
      </div>
    </div>
  );
};

export default SendToDevisModal;
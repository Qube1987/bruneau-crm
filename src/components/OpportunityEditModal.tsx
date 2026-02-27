import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, FileText, MessageSquare, Trash2, Plus, Phone, Mail, MapPin, Video, CheckCircle, AlertTriangle, User, Image, Search } from 'lucide-react';
import { StatutOpportunite, TypeInteraction } from '../types';
import { supabaseApi, Opportunite, Interaction } from '../services/supabaseApi';
import { STATUTS_OPPORTUNITE, TYPES_INTERACTION } from '../constants';
import { extrabatApi } from '../services/extrabatApi';
import { extrabatParametersService } from '../services/extrabatParametersService';
import { useAuth } from '../contexts/AuthContext';
import { TimeSelector } from './TimeSelector';
import { PhotoUpload } from './PhotoUpload';
import { PhotoGallery } from './PhotoGallery';
import { usePhotos } from '../hooks/usePhotos';

interface OpportunityEditModalProps {
  opportunite: Opportunite;
  onClose: () => void;
  onOpportunityUpdated?: () => void;
  onOpportunityDeleted?: () => void;
}

const OpportunityEditModal: React.FC<OpportunityEditModalProps> = ({
  opportunite,
  onClose,
  onOpportunityUpdated,
  onOpportunityDeleted
}) => {
  const { user } = useAuth();
  const { photos, loading: loadingPhotos, reload: reloadPhotos } = usePhotos(opportunite.id);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [finalizationErrors, setFinalizationErrors] = useState<string[]>([]);
  const [showProspectEdit, setShowProspectEdit] = useState(false);
  const [isSavingProspect, setIsSavingProspect] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showExtrabatSearch, setShowExtrabatSearch] = useState(false);

  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [civilites, setCivilites] = useState<any[]>([]);
  const [originesContact, setOriginesContact] = useState<any[]>([]);
  const [typesAdresse, setTypesAdresse] = useState<any[]>([]);
  const [typesTelephone, setTypesTelephone] = useState<any[]>([]);
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [defaultUser, setDefaultUser] = useState<string>(opportunite.suivi_par);

  const [formData, setFormData] = useState({
    titre: opportunite.titre,
    description: opportunite.description,
    statut: opportunite.statut as StatutOpportunite,
    suivi_par: opportunite.suivi_par,
    montant_estime: opportunite.montant_estime?.toString() || '',
    date_travaux_estimee: opportunite.date_travaux_estimee || '',
  });

  const [prospectFormData, setProspectFormData] = useState({
    civilite: opportunite.prospect?.civilite || '',
    nom: opportunite.prospect?.nom || '',
    prenom: opportunite.prospect?.prenom || '',
    email: opportunite.prospect?.email || '',
    telephone1: opportunite.prospect?.telephone || '',
    telephone2: '',
    typeTelephone: 'Mobile',
    adresse: opportunite.prospect?.adresse || '',
    codePostal: opportunite.prospect?.code_postal || '',
    commune: opportunite.prospect?.ville || '',
    typeAdresse: 'Principale',
    origineContact: opportunite.prospect?.origine_contact || '',
    suiviPar: opportunite.prospect?.suivi_par || 'Quentin BRUNEAU',
  });

  const generateBaseDescription = (type: TypeInteraction) => {
    const typeConfig = TYPES_INTERACTION.find(t => t.value === type);
    const today = new Date().toLocaleDateString('fr-FR');
    return `Conversation ${typeConfig?.label} le ${today} : `;
  };

  const roundToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const formatDateTimeForInput = (date: Date) => {
    const roundedDate = roundToNearest15Minutes(date);
    const year = roundedDate.getFullYear();
    const month = String(roundedDate.getMonth() + 1).padStart(2, '0');
    const day = String(roundedDate.getDate()).padStart(2, '0');
    const hours = String(roundedDate.getHours()).padStart(2, '0');
    const minutes = String(roundedDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [interactionFormData, setInteractionFormData] = useState({
    type: 'telephonique' as TypeInteraction,
    description: generateBaseDescription('telephonique'),
    utilisateur: defaultUser,
    dateRdvDebut: formatDateTimeForInput(new Date()),
    dateRdvFin: formatDateTimeForInput(new Date(Date.now() + 30 * 60 * 1000)),
  });

  useEffect(() => {
    console.log('📋 OpportunityEditModal opened with opportunity:', {
      id: opportunite.id,
      titre: opportunite.titre,
      saisie_rapide: opportunite.saisie_rapide,
      extrabat_id: opportunite.extrabat_id,
      client_id: opportunite.client_id,
      prospect_extrabat_id: opportunite.prospect?.extrabat_id,
      prospect_nom: opportunite.prospect?.nom
    });
    loadInteractions();
    loadUtilisateurs();
    loadDefaultUser();
    if (opportunite.saisie_rapide) {
      loadExtrabatParams();
    }
  }, [opportunite.id]);

  const loadDefaultUser = async () => {
    if (user?.email) {
      try {
        const utilisateurs = await extrabatParametersService.getUtilisateurs();
        const currentUser = utilisateurs.find(u => u.email === user.email);
        if (currentUser) {
          setDefaultUser(currentUser.nom);
          setInteractionFormData(prev => ({ ...prev, utilisateur: currentUser.nom }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur par défaut:', error);
      }
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const utilisateursData = await extrabatParametersService.getUtilisateurs();
      setUtilisateurs(utilisateursData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  useEffect(() => {
    if (interactionFormData.dateRdvDebut && interactionFormData.type === 'physique') {
      const startDate = new Date(interactionFormData.dateRdvDebut);
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        const formattedEndDate = formatDateTimeForInput(endDate);
        if (interactionFormData.dateRdvFin !== formattedEndDate) {
          setInteractionFormData(prev => ({ ...prev, dateRdvFin: formattedEndDate }));
        }
      }
    }
  }, [interactionFormData.dateRdvDebut]);

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

  const loadInteractions = async () => {
    setIsLoadingInteractions(true);
    try {
      const data = await supabaseApi.getInteractionsByOpportunite(opportunite.id);
      setInteractions(data);
    } catch (error) {
      console.error('Erreur lors du chargement des interactions:', error);
    } finally {
      setIsLoadingInteractions(false);
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

  const handleProspectInputChange = (field: string, value: string) => {
    setProspectFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProspect = async () => {
    if (!opportunite.prospect) return;

    const errors: string[] = [];
    if (!prospectFormData.nom || prospectFormData.nom.trim() === '') errors.push('Le nom du client est requis');
    if (!prospectFormData.email || prospectFormData.email.trim() === '') errors.push('L\'email est requis');
    if (!prospectFormData.telephone1 || prospectFormData.telephone1.trim() === '') errors.push('Le téléphone est requis');
    if (!prospectFormData.adresse || prospectFormData.adresse.trim() === '') errors.push('L\'adresse est requise');
    if (!prospectFormData.codePostal || prospectFormData.codePostal.trim() === '') errors.push('Le code postal est requis');
    if (!prospectFormData.commune || prospectFormData.commune.trim() === '') errors.push('La ville est requise');
    if (!prospectFormData.typeTelephone) errors.push('Le type de téléphone est requis');
    if (!prospectFormData.typeAdresse) errors.push('Le type d\'adresse est requis');

    if (errors.length > 0) {
      alert('Informations manquantes :\n' + errors.join('\n'));
      return;
    }

    setIsSavingProspect(true);
    try {
      // Vérifier si le prospect a déjà un extrabat_id
      if (opportunite.prospect?.extrabat_id) {
        // Le client existe déjà dans Extrabat, ne pas créer de nouveau
        console.log('⚠️ Client déjà présent dans Extrabat (ID:', opportunite.prospect.extrabat_id, '). Pas de création.');

        // Mettre à jour uniquement dans Supabase
        await supabaseApi.updateProspect(opportunite.prospect.id, {
          nom: prospectFormData.nom,
          prenom: prospectFormData.prenom,
          email: prospectFormData.email,
          telephone: prospectFormData.telephone1,
          adresse: prospectFormData.adresse,
          code_postal: prospectFormData.codePostal,
          ville: prospectFormData.commune,
          civilite: prospectFormData.civilite,
          origine_contact: prospectFormData.origineContact,
          suivi_par: prospectFormData.suiviPar,
        });

        await supabaseApi.updateOpportunite(opportunite.id, {
          saisie_rapide: false,
          extrabat_id: opportunite.prospect.extrabat_id
        });

        setShowProspectEdit(false);
        alert('Informations du prospect mises à jour avec succès !');
        onOpportunityUpdated();
      } else {
        // Le client n'existe pas dans Extrabat, créer le client
        const extrabatIds = await extrabatParametersService.getExtrabatIds(prospectFormData);

        const telephones = [];
        if (prospectFormData.telephone1) {
          telephones.push({
            number: prospectFormData.telephone1,
            typeId: extrabatIds.typeTelephoneId,
            ordre: 1
          });
        }
        if (prospectFormData.telephone2) {
          telephones.push({
            number: prospectFormData.telephone2,
            typeId: extrabatIds.typeTelephoneId,
            ordre: 2
          });
        }

        const adresses = [];
        if (prospectFormData.adresse) {
          adresses.push({
            description: prospectFormData.adresse,
            codePostal: prospectFormData.codePostal,
            ville: prospectFormData.commune,
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
          nom: prospectFormData.nom,
          prenom: prospectFormData.prenom,
          email: prospectFormData.email,
          observation: "",
          espaceClientEnabled: false,
          emailing: false,
          sms: false,
          telephones: telephones,
          adresses: adresses
        };

        console.log('✅ Création du client dans Extrabat:', extrabatClientData);

        const extrabatClient = await extrabatApi.createClient(extrabatClientData);

        console.log('Client créé dans Extrabat avec l\'ID:', extrabatClient.id);

        await supabaseApi.updateProspect(opportunite.prospect.id, {
          extrabat_id: extrabatClient.id,
          nom: prospectFormData.nom,
          prenom: prospectFormData.prenom,
          email: prospectFormData.email,
          telephone: prospectFormData.telephone1,
          adresse: prospectFormData.adresse,
          code_postal: prospectFormData.codePostal,
          ville: prospectFormData.commune,
          civilite: prospectFormData.civilite,
          origine_contact: prospectFormData.origineContact,
          suivi_par: prospectFormData.suiviPar,
        });

        await supabaseApi.updateOpportunite(opportunite.id, {
          saisie_rapide: false,
          extrabat_id: extrabatClient.id
        });

        setShowProspectEdit(false);
        alert('Client créé avec succès dans Extrabat !');
        onOpportunityUpdated();
      }
    } catch (error) {
      console.error('Erreur lors de la création du client dans Extrabat:', error);
      alert(`Erreur lors de la création dans Extrabat: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingProspect(false);
    }
  };

  const handleSearchExtrabat = async () => {
    if (!searchQuery.trim()) {
      alert('Veuillez saisir un terme de recherche');
      return;
    }

    setIsSearching(true);
    try {
      const clients = await extrabatApi.searchClients(searchQuery);
      setSearchResults(clients || []);

      if (!clients || clients.length === 0) {
        alert('Aucun client trouvé dans Extrabat');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Extrabat:', error);
      alert('Erreur lors de la recherche Extrabat');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExtrabatClient = async (client: any) => {
    if (!opportunite.prospect) return;

    try {
      const details = await extrabatApi.getClientDetails(client.id);

      const telephone = details.telephones?.[0]?.tel_number || '';
      const email = details.client?.email || '';

      const adresseData = details.adresses?.[0];
      let adresse = '';
      let codePostal = '';
      let ville = '';

      if (Array.isArray(adresseData) && adresseData.length > 1) {
        const adresseDetails = adresseData[1];
        adresse = adresseDetails?.adresse_desc || '';
        codePostal = adresseDetails?.adresse_cp || '';
        ville = adresseDetails?.adresse_ville || '';
      }

      await supabaseApi.updateProspect(opportunite.prospect.id, {
        extrabat_id: client.id,
        nom: client.nom || '',
        prenom: client.prenom || '',
        email: email,
        telephone: telephone,
        adresse: adresse,
        code_postal: codePostal,
        ville: ville,
        civilite: details.civilite?.libelle || '',
      });

      await supabaseApi.updateOpportunite(opportunite.id, {
        extrabat_id: client.id,
        saisie_rapide: false
      });

      setShowExtrabatSearch(false);
      setSearchResults([]);
      setSearchQuery('');
      alert('Client Extrabat lié avec succès !');
      onOpportunityUpdated();
    } catch (error) {
      console.error('Erreur lors de la liaison avec le client Extrabat:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddInteraction = async () => {
    if (!interactionFormData.description.trim()) return;

    // Si c'est un RDV physique, vérifier que les dates sont renseignées
    if (interactionFormData.type === 'physique' && (!interactionFormData.dateRdvDebut || !interactionFormData.dateRdvFin)) {
      alert('Veuillez renseigner les dates de début et de fin du rendez-vous');
      return;
    }

    setIsAddingInteraction(true);
    try {
      await supabaseApi.createInteraction({
        opportunite_id: opportunite.id,
        type: interactionFormData.type,
        description: interactionFormData.description,
        utilisateur: interactionFormData.utilisateur,
        ...(interactionFormData.type === 'physique' && interactionFormData.dateRdvDebut && interactionFormData.dateRdvFin && {
          date_rdv_debut: new Date(interactionFormData.dateRdvDebut).toISOString(),
          date_rdv_fin: new Date(interactionFormData.dateRdvFin).toISOString(),
          rdv_user_id: interactionFormData.utilisateur,
        }),
      });

      await loadInteractions();

      const newType = 'telephonique' as TypeInteraction;
      setInteractionFormData({
        type: newType,
        description: generateBaseDescription(newType),
        utilisateur: opportunite.suivi_par,
        dateRdvDebut: formatDateTimeForInput(new Date()),
        dateRdvFin: formatDateTimeForInput(new Date(Date.now() + 30 * 60 * 1000)),
      });

      setShowInteractionForm(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'interaction:', error);
      alert('Erreur lors de l\'ajout de l\'interaction');
    } finally {
      setIsAddingInteraction(false);
    }
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
    if (!formData.titre.trim()) return;

    setIsLoading(true);
    try {
      const isNewOpportunity = !opportunite.description || opportunite.description.trim() === '';

      await supabaseApi.updateOpportunite(opportunite.id, {
        titre: formData.titre,
        description: formData.description,
        statut: formData.statut,
        suivi_par: formData.suivi_par,
        montant_estime: formData.montant_estime ? parseFloat(formData.montant_estime) : undefined,
        date_travaux_estimee: formData.date_travaux_estimee || undefined,
      });

      if (formData.statut === 'devis-gagne') {
        const existingChantier = await supabaseApi.getChantierByOpportuniteId(opportunite.id);
        if (!existingChantier) {
          await supabaseApi.createChantier({
            opportunite_id: opportunite.id,
            consignes: '',
            commande_passee: false,
            commande_recue: false,
            chantier_planifie: false,
            chantier_realise: false,
          });
          console.log('Chantier créé automatiquement pour l\'opportunité:', opportunite.id);
        }
      }

      if (isNewOpportunity && user?.email !== 'quentin@bruneau27.com') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
          console.log('[EDIT] Envoi du SMS pour nouvelle opportunité:', formData.titre);
          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientName: formData.titre,
              description: formData.description,
            }),
          });

          console.log('[EDIT] Réponse SMS:', smsResponse.status);
          const responseData = await smsResponse.text();
          console.log('[EDIT] Données réponse:', responseData);

          if (!smsResponse.ok) {
            console.error('[EDIT] Erreur lors de l\'envoi du SMS:', responseData);
          } else {
            console.log('[EDIT] SMS envoyé avec succès:', responseData);
          }
        } catch (smsError) {
          console.error('[EDIT] Erreur lors de l\'appel de la fonction SMS:', smsError);
        }
      } else if (isNewOpportunity) {
        console.log('[EDIT] SMS non envoyé (utilisateur quentin@bruneau27.com)');
      }

      onOpportunityUpdated();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'opportunité:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opportunité ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await supabaseApi.deleteOpportunite(opportunite.id);
      onOpportunityDeleted?.();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'opportunité:', error);
      alert('Erreur lors de la suppression de l\'opportunité');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizationErrors([]);

    const prospect = opportunite.prospect;
    if (!prospect) {
      setFinalizationErrors(['Prospect introuvable']);
      return;
    }

    const errors: string[] = [];
    if (!prospect.nom || prospect.nom.trim() === '') errors.push('Le nom du client est requis');
    if (!prospect.email || prospect.email.trim() === '') errors.push('L\'email est requis');
    if (!prospect.telephone || prospect.telephone.trim() === '') errors.push('Le téléphone est requis');
    if (!prospect.adresse || prospect.adresse.trim() === '') errors.push('L\'adresse est requise');
    if (!prospect.code_postal || prospect.code_postal.trim() === '') errors.push('Le code postal est requis');
    if (!prospect.ville || prospect.ville.trim() === '') errors.push('La ville est requise');

    if (errors.length > 0) {
      setFinalizationErrors(errors);
      return;
    }

    // Vérifier si le prospect a déjà un extrabat_id
    if (prospect.extrabat_id) {
      console.log('⚠️ Client déjà présent dans Extrabat (ID:', prospect.extrabat_id, '). Pas de création.');

      // Mettre à jour uniquement le statut saisie_rapide
      await supabaseApi.updateOpportunite(opportunite.id, {
        saisie_rapide: false,
        extrabat_id: prospect.extrabat_id
      });

      alert('Opportunité validée ! Le client existe déjà dans Extrabat.');
      onOpportunityUpdated?.();
      return;
    }

    if (!confirm('Créer ce client dans Extrabat ? Cette action est irréversible.')) {
      return;
    }

    setIsFinalizing(true);
    try {
      const formData = {
        civilite: prospect.civilite || 'M.',
        nom: prospect.nom,
        prenom: prospect.prenom || '',
        email: prospect.email,
        telephone1: prospect.telephone,
        telephone2: '',
        typeTelephone: 'Mobile',
        adresse: prospect.adresse,
        codePostal: prospect.code_postal,
        commune: prospect.ville,
        typeAdresse: 'Principale',
        origineContact: prospect.origine_contact || 'Autre',
        suiviPar: prospect.suivi_par || 'Quentin BRUNEAU',
      };

      const extrabatIds = await extrabatParametersService.getExtrabatIds(formData);

      const telephones = [];
      if (formData.telephone1) {
        telephones.push({
          number: formData.telephone1,
          typeId: extrabatIds.typeTelephoneId,
          ordre: 1
        });
      }

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

      console.log('✅ Création du client dans Extrabat...');
      const extrabatClient = await extrabatApi.createClient(extrabatClientData);

      await supabaseApi.updateProspect(prospect.id, {
        extrabat_id: extrabatClient.id
      });

      await supabaseApi.updateOpportunite(opportunite.id, {
        saisie_rapide: false
      });

      alert('Client créé avec succès dans Extrabat !');
      onOpportunityUpdated();
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      alert(`Erreur lors de la création dans Extrabat: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Modifier l'opportunité</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {opportunite.saisie_rapide && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-1">Opportunité en saisie rapide</h4>
                  <p className="text-sm text-amber-800">
                    Cliquez sur "Modifier" pour compléter les informations du prospect et créer la fiche client dans Extrabat.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-gray-900">Informations du prospect</h4>
              {opportunite.saisie_rapide && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExtrabatSearch(!showExtrabatSearch);
                      setShowProspectEdit(false);
                    }}
                    className="text-sm text-green-600 hover:text-green-800 transition-colors flex items-center gap-1"
                  >
                    <Search className="h-4 w-4" />
                    {showExtrabatSearch ? 'Annuler recherche' : 'Chercher dans Extrabat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProspectEdit(!showProspectEdit);
                      setShowExtrabatSearch(false);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    {showProspectEdit ? 'Annuler' : 'Modifier'}
                  </button>
                </div>
              )}
            </div>

            {showExtrabatSearch && opportunite.saisie_rapide && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 space-y-3">
                <p className="text-sm text-green-800 mb-3">
                  Recherchez le client qui aurait été créé dans Extrabat pour remplacer les infos saisies rapidement.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchExtrabat())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nom du client..."
                  />
                  <button
                    type="button"
                    onClick={handleSearchExtrabat}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    {isSearching ? 'Recherche...' : 'Chercher'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto border border-green-300 rounded-lg bg-white">
                    {searchResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectExtrabatClient(client)}
                        className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {client.nom} {client.prenom}
                        </div>
                        {(client.telephone || client.email) && (
                          <div className="text-sm text-gray-600 mt-1">
                            {client.telephone && <span>{client.telephone}</span>}
                            {client.telephone && client.email && <span> • </span>}
                            {client.email && <span>{client.email}</span>}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showProspectEdit && !showExtrabatSearch ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-900">
                  {opportunite.prospect?.civilite} {opportunite.prospect?.nom} {opportunite.prospect?.prenom}
                </p>
                <p className="text-sm text-gray-600">{opportunite.prospect?.email || 'Email non renseigné'}</p>
                <p className="text-sm text-gray-600">{opportunite.prospect?.telephone || 'Téléphone non renseigné'}</p>
                {opportunite.prospect?.adresse && (
                  <p className="text-sm text-gray-600">
                    {opportunite.prospect.adresse}, {opportunite.prospect.code_postal} {opportunite.prospect.ville}
                  </p>
                )}
                {!opportunite.prospect?.adresse && (
                  <p className="text-sm text-gray-600">Adresse non renseignée</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isLoadingParams ? (
                  <div className="text-center py-4 text-gray-500">Chargement des paramètres...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Civilité *</label>
                        <select
                          value={prospectFormData.civilite}
                          onChange={(e) => handleProspectInputChange('civilite', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner</option>
                          {civilites.map((civilite) => (
                            <option key={civilite.id} value={civilite.libelle}>
                              {civilite.libelle}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nom / Raison sociale *</label>
                        <input
                          type="text"
                          value={prospectFormData.nom}
                          onChange={(e) => handleProspectInputChange('nom', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                        <input
                          type="text"
                          value={prospectFormData.prenom}
                          onChange={(e) => handleProspectInputChange('prenom', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={prospectFormData.email}
                          onChange={(e) => handleProspectInputChange('email', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone 1 *</label>
                        <input
                          type="tel"
                          value={prospectFormData.telephone1}
                          onChange={(e) => handleProspectInputChange('telephone1', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone 2</label>
                        <input
                          type="tel"
                          value={prospectFormData.telephone2}
                          onChange={(e) => handleProspectInputChange('telephone2', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type de téléphone *</label>
                      <select
                        value={prospectFormData.typeTelephone}
                        onChange={(e) => handleProspectInputChange('typeTelephone', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {typesTelephone.map((type) => (
                          <option key={type.id} value={type.libelle}>
                            {type.libelle}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Adresse (n° et rue) *</label>
                      <input
                        type="text"
                        value={prospectFormData.adresse}
                        onChange={(e) => handleProspectInputChange('adresse', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Code postal *</label>
                        <input
                          type="text"
                          value={prospectFormData.codePostal}
                          onChange={(e) => handleProspectInputChange('codePostal', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Commune *</label>
                        <input
                          type="text"
                          value={prospectFormData.commune}
                          onChange={(e) => handleProspectInputChange('commune', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type d'adresse *</label>
                      <select
                        value={prospectFormData.typeAdresse}
                        onChange={(e) => handleProspectInputChange('typeAdresse', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {typesAdresse.map((type) => (
                          <option key={type.id} value={type.libelle}>
                            {type.libelle}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Origine de contact *</label>
                      <select
                        value={prospectFormData.origineContact}
                        onChange={(e) => handleProspectInputChange('origineContact', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {originesContact.map((origine) => (
                          <option key={origine.id} value={origine.libelle}>
                            {origine.libelle}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Suivi par *</label>
                      <select
                        value={prospectFormData.suiviPar}
                        onChange={(e) => handleProspectInputChange('suiviPar', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                          <option key={utilisateur.id} value={utilisateur.nom}>
                            {utilisateur.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowProspectEdit(false)}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProspect}
                        disabled={isSavingProspect}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {isSavingProspect ? 'Création dans Extrabat...' : 'Enregistrer et créer dans Extrabat'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline h-4 w-4 mr-1" />
              Client *
            </label>
            <input
              type="text"
              value={formData.titre}
              onChange={(e) => handleInputChange('titre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MessageSquare className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Décrivez l'opportunité..."
            />
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interactions ({interactions.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowInteractionForm(!showInteractionForm)}
                className="px-3 py-1.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                {showInteractionForm ? 'Masquer' : 'Ajouter une interaction'}
              </button>
            </div>

            {showInteractionForm && (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="h-4 w-4 inline mr-2" />
                    Utilisateur de l'interaction *
                  </label>
                  <select
                    value={interactionFormData.utilisateur}
                    onChange={(e) => handleInteractionInputChange('utilisateur', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {utilisateurs.filter(u => u.actif).map((user) => (
                      <option key={user.id} value={user.nom}>
                        {user.nom}
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

                {interactionFormData.type === 'physique' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Informations du rendez-vous</h4>

                    <div className="mb-3">
                      <TimeSelector
                        label="Date et heure de début"
                        value={interactionFormData.dateRdvDebut}
                        onChange={(value) => handleInteractionInputChange('dateRdvDebut', value)}
                        required
                        icon={<Calendar className="h-3 w-3 inline mr-1" />}
                      />
                    </div>

                    <div className="mb-2">
                      <TimeSelector
                        label="Date et heure de fin"
                        value={interactionFormData.dateRdvFin}
                        onChange={(value) => handleInteractionInputChange('dateRdvFin', value)}
                        required
                        icon={<Calendar className="h-3 w-3 inline mr-1" />}
                      />
                    </div>

                    <p className="text-xs text-gray-700 mt-1.5">Le RDV sera ajouté automatiquement à votre agenda Extrabat</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInteractionForm(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAddInteraction}
                    disabled={isAddingInteraction || !interactionFormData.description.trim()}
                    className="px-3 py-1.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
                  >
                    <Save className="h-4 w-4" />
                    {isAddingInteraction ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoadingInteractions ? (
                <div className="text-center py-4 text-gray-500">Chargement des interactions...</div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Aucune interaction pour le moment</div>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 text-primary-900">
                        {getInteractionIcon(interaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {TYPES_INTERACTION.find(t => t.value === interaction.type)?.label} avec {interaction.utilisateur} le {new Date(interaction.date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })} à {new Date(interaction.date).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{interaction.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <Image className="h-5 w-5" />
                Photos ({photos.length})
              </h4>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <PhotoUpload
                opportuniteId={opportunite.id}
                onPhotoUploaded={reloadPhotos}
              />
            </div>

            {loadingPhotos ? (
              <div className="text-center py-8 text-gray-500">Chargement des photos...</div>
            ) : (
              <PhotoGallery
                photos={photos}
                onPhotoDeleted={reloadPhotos}
              />
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
                value={formData.suivi_par}
                onChange={(e) => handleInputChange('suivi_par', e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date de travaux estimée
            </label>
            <input
              type="date"
              value={formData.date_travaux_estimee}
              onChange={(e) => handleInputChange('date_travaux_estimee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé (€ HT)</label>
            <input
              type="number"
              value={formData.montant_estime}
              onChange={(e) => handleInputChange('montant_estime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.titre.trim()}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunityEditModal;

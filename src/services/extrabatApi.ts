const EXTRABAT_API_BASE = '/extrabat-api';
const API_KEY = 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3';
const SECURITY_KEY = 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-EXTRABAT-API-KEY': API_KEY,
    'X-EXTRABAT-SECURITY': SECURITY_KEY,
  };
};

export const extrabatApi = {
  // Rechercher des clients
  async searchClients(query: string = '') {
    let url = `${EXTRABAT_API_BASE}/v2/clients`;
    const params = new URLSearchParams();

    if (query) {
      params.append('q', query);
    }

    // IMPORTANT: Inclure les téléphones et adresses dans la recherche
    params.append('include', 'telephone,adresse');

    url += `?${params.toString()}`;

    console.log('🔍 Recherche clients:', {
      url: url,
      query,
      headers: getHeaders()
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse recherche:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la recherche: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur recherche clients:', error);
      throw error;
    }
  },

  // Récupérer les pièces commerciales d'un client (devis, commandes, factures, avoirs)
  async getClientPieces(clientId: number) {
    const url = `${EXTRABAT_API_BASE}/v3/client/${clientId}?include=piece`;
    console.log('🔍 Récupération pièces commerciales client:', {
      url: url,
      clientId,
      headers: getHeaders()
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse pièces commerciales:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des pièces: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Pièces commerciales récupérées:', data);
      console.log('📄 Nombre de pièces:', data.pieces?.length || 0);

      // Statistiques par type de pièce
      const stats = {
        devis: data.pieces?.filter((p: any) => p.type === 1).length || 0,
        commandes: data.pieces?.filter((p: any) => p.type === 2).length || 0,
        factures: data.pieces?.filter((p: any) => p.type === 4).length || 0,
        avoirs: data.pieces?.filter((p: any) => p.type === 6).length || 0,
        devisNonTransformes: data.pieces?.filter((p: any) => p.type === 1 && p.transformationState === 0).length || 0,
        facturesNonReglees: data.pieces?.filter((p: any) => p.type === 4 && p.etatLettrage !== 2).length || 0,
      };
      console.log('📊 Statistiques pièces:', stats);

      return data;
    } catch (error) {
      console.error('❌ Erreur récupération pièces commerciales:', error);
      throw error;
    }
  },

  // Récupérer les détails complets d'un client avec ses ouvrages et SAV
  async getClientDetails(clientId: number) {
    const url = `${EXTRABAT_API_BASE}/v3/client/${clientId}?include=ouvrage,ouvrage.ouvrage_metier,ouvrage.ouvrage_metier.article,ouvrage.sav,ouvrage.sav.rdv`;
    console.log('🔍 Récupération détails client (v3 avec ouvrages enrichis + SAV + RDV):', {
      url: url,
      clientId,
      headers: getHeaders()
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse détails client:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des détails: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Détails client récupérés (v3):', data);
      console.log('📞 Structure COMPLETE des téléphones:', JSON.stringify(data.telephone, null, 2));
      console.log('🏠 Structure COMPLETE des adresses:', JSON.stringify(data.adresse, null, 2));
      console.log('📦 Structure COMPLETE des ouvrages:', JSON.stringify(data.ouvrage, null, 2));
      console.log('🔢 Nombre d\'ouvrages trouvés:', data.ouvrage?.length || 0);

      // Compter les SAV
      const totalSav = (data.ouvrage || []).reduce((acc: number, ouvrage: any) =>
        acc + (ouvrage.sav?.length || 0), 0
      );
      console.log('🛠️ Total SAV Extrabat trouvés:', totalSav);

      // Compter les interventions (rdvs) dans les SAV
      let totalInterventions = 0;
      let interventionsAvecRapport = 0;
      (data.ouvrage || []).forEach((ouvrage: any) => {
        (ouvrage.sav || []).forEach((sav: any) => {
          const rdvs = sav.rdvs || [];
          totalInterventions += rdvs.length;
          rdvs.forEach((rdvWrapper: any) => {
            const rdv = rdvWrapper.rdv || rdvWrapper;
            if (rdv.notes && rdv.notes.trim()) {
              interventionsAvecRapport++;
            }
          });
        });
      });
      console.log('📅 Total interventions (RDV) trouvées:', totalInterventions);
      console.log('📝 Interventions avec rapport (notes):', interventionsAvecRapport);

      // Normaliser le format pour le reste du code (certaines parties attendent "ouvrages")
      const normalizedData = {
        ...data,
        ouvrages: data.ouvrage || [],
        telephones: data.telephone || [],
        adresses: data.adresse || []
      };

      return normalizedData;
    } catch (error) {
      console.error('❌ Erreur récupération détails client:', error);
      throw error;
    }
  },

  // Créer un nouveau client
  async createClient(clientData: any) {
    console.log('🚀 Création client - Données:', JSON.stringify(clientData, null, 2));
    console.log('📍 STACK TRACE:', new Error().stack);
    const url = `${EXTRABAT_API_BASE}/v1/client`;
    console.log('🌐 URL création:', url);
    console.log('📋 Headers:', getHeaders());
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(clientData),
      });
      
      console.log('📡 Réponse création:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseText = await response.text();
      console.log('📄 Réponse brute:', responseText);
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la création: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Client créé:', data);
        return data;
      } catch (e) {
        console.error('❌ Erreur parsing JSON:', e);
        return responseText;
      }
    } catch (error) {
      console.error('❌ Erreur création client:', error);
      throw error;
    }
  },

  // Récupérer les paramètres (civilités, origines, etc.)
  async getCivilites() {
    console.log('🔄 Récupération civilités...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/civilites`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des civilités: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Civilités récupérées:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération civilités:', error);
      throw error;
    }
  },

  async getOriginesContact() {
    console.log('🔄 Récupération origines contact...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/origines-contact`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des origines: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Origines contact récupérées:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération origines:', error);
      throw error;
    }
  },

  async getUtilisateurs() {
    console.log('🔄 Récupération utilisateurs...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/utilisateurs`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des utilisateurs: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Utilisateurs récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération utilisateurs:', error);
      throw error;
    }
  },

  async getTypesAdresse() {
    console.log('🔄 Récupération types adresse...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/type-adresse`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des types d'adresse: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Types adresse récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération types adresse:', error);
      throw error;
    }
  },

  async getTypesTelephone() {
    console.log('🔄 Récupération types téléphone...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/type-telephone`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des types de téléphone: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Types téléphone récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération types téléphone:', error);
      throw error;
    }
  },

  async getQuestionsComplementaires() {
    console.log('🔄 Récupération questions complémentaires...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/questions-complementaires`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des questions complémentaires: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Questions complémentaires récupérées:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération questions complémentaires:', error);
      throw error;
    }
  },

  async getRegroupements() {
    console.log('🔄 Récupération regroupements...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/regroupements`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des regroupements: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Regroupements récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération regroupements:', error);
      throw error;
    }
  },

  async getClientStatuts() {
    console.log('🔄 Récupération statuts client...');
    try {
      const response = await fetch(`${EXTRABAT_API_BASE}/v1/parametres/client-statuts`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des statuts client: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Statuts client récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération statuts client:', error);
      throw error;
    }
  },

  async createRendezVous(rdvData: {
    objet: string;
    observation?: string;
    debut: string;
    fin: string;
    clientId?: number;
    userId: number;
    adresse?: {
      rue?: string;
      cp?: string;
      ville?: string;
    };
  }) {
    console.log('📅 Création rendez-vous - Données:', JSON.stringify(rdvData, null, 2));
    const url = `${EXTRABAT_API_BASE}/v1/agenda/rendez-vous`;

    const payload = {
      objet: rdvData.objet,
      observation: rdvData.observation || '',
      debut: rdvData.debut,
      fin: rdvData.fin,
      journee: false,
      isPrivate: false,
      couleur: 23060,
      ...(rdvData.clientId && {
        rdvClients: [
          {
            client: rdvData.clientId
          }
        ]
      }),
      users: [
        {
          user: rdvData.userId
        }
      ],
      ...(rdvData.adresse && {
        rue: rdvData.adresse.rue || '',
        cp: rdvData.adresse.cp || '',
        ville: rdvData.adresse.ville || ''
      })
    };

    console.log('📋 Payload RDV:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      console.log('📡 Réponse création RDV:', {
        status: response.status,
        statusText: response.statusText,
      });

      const responseText = await response.text();
      console.log('📄 Réponse brute RDV:', responseText);

      if (!response.ok) {
        throw new Error(`Erreur lors de la création du RDV: ${response.status} ${response.statusText} - ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        console.log('✅ Rendez-vous créé:', data);
        return data;
      } catch (e) {
        console.log('✅ Rendez-vous créé (pas de JSON)');
        return responseText;
      }
    } catch (error) {
      console.error('❌ Erreur création rendez-vous:', error);
      throw error;
    }
  },

  async fetchExtrabatDevis(extrabatId: number) {
    console.log('📋 Récupération devis Extrabat pour client:', extrabatId);

    try {
      // Appel 1 : récupérer les dossiers du porte-document
      const dossiersUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/dossiers`;
      console.log('🔍 URL dossiers:', dossiersUrl);

      const dossiersResponse = await fetch(dossiersUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse dossiers:', {
        status: dossiersResponse.status,
        statusText: dossiersResponse.statusText,
      });

      if (!dossiersResponse.ok) {
        throw new Error(`Erreur récupération dossiers: ${dossiersResponse.status} ${dossiersResponse.statusText}`);
      }

      const dossiersData = await dossiersResponse.json();
      console.log('📁 Dossiers récupérés:', dossiersData);

      // L'API retourne un objet avec dossiersListe
      const dossiers = dossiersData.dossiersListe || dossiersData || [];

      // Trouver le dossier "Devis" (recherche insensible à la casse)
      const dossierDevis = Array.isArray(dossiers) ? dossiers.find((d: any) =>
        (d.nom || d.name || d.libelle || '').toLowerCase().includes('devis')
      ) : null;

      if (!dossierDevis) {
        console.warn('⚠️ Dossier "Devis" non trouvé dans le porte-document Extrabat');
        return { success: false, error: 'no_folder', data: [] };
      }

      const dossierId = dossierDevis.id;
      console.log('✅ Dossier Devis trouvé, ID:', dossierId);

      // Appel 2 : récupérer les documents du dossier Devis
      const documentsUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/documents/${dossierId}/last`;
      console.log('🔍 URL documents:', documentsUrl);

      const documentsResponse = await fetch(documentsUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse documents:', {
        status: documentsResponse.status,
        statusText: documentsResponse.statusText,
      });

      if (!documentsResponse.ok) {
        throw new Error(`Erreur récupération documents: ${documentsResponse.status} ${documentsResponse.statusText}`);
      }

      const documents = await documentsResponse.json();
      console.log('📄 Documents récupérés:', documents);

      // Normaliser les données
      const normalizedDevis = (Array.isArray(documents) ? documents : []).map((doc: any) => {
        // Essayer plusieurs champs possibles pour la date, en priorité createdAt
        const dateValue = doc.createdAt || doc.created_at || doc.dateCreation ||
                         doc.date || doc.dateDocument || doc.date_creation ||
                         doc.dateEmission || doc.date_emission || doc.dateEdition ||
                         doc.date_edition || new Date().toISOString();

        return {
          id: doc.id,
          source: 'extrabat',
          type: 'devis',
          titre: doc.titre || doc.name || doc.libelle || doc.nom || 'Devis Extrabat',
          montant_ttc: doc.montant_ttc || doc.montantTTC || doc.montant || doc.montantTotal || null,
          montant_ht: doc.montant_ht || doc.montantHT || null,
          date: dateValue,
          statut: doc.statut || doc.status || doc.etat || null,
          numero: doc.numero || doc.reference || doc.ref || doc.numeroDocument || null,
          url_pdf: doc.url || doc.pdf_url || doc.lien || doc.urlDocument || doc.link || null,
          raw: doc
        };
      });

      console.log('✅ Devis Extrabat normalisés:', normalizedDevis);
      return { success: true, data: normalizedDevis };

    } catch (error) {
      console.error('❌ Erreur récupération devis Extrabat:', error);
      return { success: false, error: 'api_error', data: [] };
    }
  },

  async fetchExtrabatCommandes(extrabatId: number) {
    console.log('📦 Récupération commandes Extrabat pour client:', extrabatId);

    try {
      // Appel 1 : récupérer les dossiers du porte-document
      const dossiersUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/dossiers`;
      console.log('🔍 URL dossiers:', dossiersUrl);

      const dossiersResponse = await fetch(dossiersUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse dossiers:', {
        status: dossiersResponse.status,
        statusText: dossiersResponse.statusText,
      });

      if (!dossiersResponse.ok) {
        throw new Error(`Erreur récupération dossiers: ${dossiersResponse.status} ${dossiersResponse.statusText}`);
      }

      const dossiersData = await dossiersResponse.json();
      console.log('📁 Dossiers récupérés:', dossiersData);

      const dossiers = dossiersData.dossiersListe || dossiersData || [];

      // Trouver le dossier "Commandes"
      const dossierCommandes = Array.isArray(dossiers) ? dossiers.find((d: any) =>
        (d.nom || d.name || d.libelle || '').toLowerCase().includes('commande')
      ) : null;

      if (!dossierCommandes) {
        console.warn('⚠️ Dossier "Commandes" non trouvé dans le porte-document Extrabat');
        return { success: false, error: 'no_folder', data: [] };
      }

      const dossierId = dossierCommandes.id;
      console.log('✅ Dossier Commandes trouvé, ID:', dossierId);

      // Appel 2 : récupérer les documents du dossier Commandes
      const documentsUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/documents/${dossierId}/last`;
      console.log('🔍 URL documents:', documentsUrl);

      const documentsResponse = await fetch(documentsUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse documents:', {
        status: documentsResponse.status,
        statusText: documentsResponse.statusText,
      });

      if (!documentsResponse.ok) {
        throw new Error(`Erreur récupération documents: ${documentsResponse.status} ${documentsResponse.statusText}`);
      }

      const documents = await documentsResponse.json();
      console.log('📄 Documents récupérés:', documents);

      // Normaliser les données
      const normalizedCommandes = (Array.isArray(documents) ? documents : []).map((doc: any) => {
        const dateValue = doc.createdAt || doc.created_at || doc.dateCreation ||
                         doc.date || doc.dateDocument || doc.date_creation ||
                         doc.dateEmission || doc.date_emission || doc.dateEdition ||
                         doc.date_edition || doc.dateCommande || new Date().toISOString();

        return {
          id: doc.id,
          source: 'extrabat',
          type: 'commande',
          titre: doc.titre || doc.name || doc.libelle || doc.nom || 'Commande Extrabat',
          montant_ttc: doc.montant_ttc || doc.montantTTC || doc.montant || doc.montantTotal || null,
          montant_ht: doc.montant_ht || doc.montantHT || null,
          date: dateValue,
          statut: doc.statut || doc.status || doc.etat || null,
          numero: doc.numero || doc.reference || doc.ref || doc.numeroDocument || null,
          url_pdf: doc.url || doc.pdf_url || doc.lien || doc.urlDocument || doc.link || null,
          raw: doc
        };
      });

      console.log('✅ Commandes Extrabat normalisées:', normalizedCommandes);
      return { success: true, data: normalizedCommandes };

    } catch (error) {
      console.error('❌ Erreur récupération commandes Extrabat:', error);
      return { success: false, error: 'api_error', data: [] };
    }
  },

  async fetchExtrabatFactures(extrabatId: number) {
    console.log('📋 Récupération factures Extrabat pour client:', extrabatId);

    try {
      // Appel 1 : récupérer les dossiers du porte-document
      const dossiersUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/dossiers`;
      console.log('🔍 URL dossiers:', dossiersUrl);

      const dossiersResponse = await fetch(dossiersUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse dossiers:', {
        status: dossiersResponse.status,
        statusText: dossiersResponse.statusText,
      });

      if (!dossiersResponse.ok) {
        throw new Error(`Erreur récupération dossiers: ${dossiersResponse.status} ${dossiersResponse.statusText}`);
      }

      const dossiersData = await dossiersResponse.json();
      console.log('📁 Dossiers récupérés:', dossiersData);

      // L'API retourne un objet avec dossiersListe
      const dossiers = dossiersData.dossiersListe || dossiersData || [];

      // Trouver le dossier "Factures" (recherche insensible à la casse)
      const dossierFactures = Array.isArray(dossiers) ? dossiers.find((d: any) =>
        (d.nom || d.name || d.libelle || '').toLowerCase().includes('facture')
      ) : null;

      if (!dossierFactures) {
        console.warn('⚠️ Dossier "Factures" non trouvé dans le porte-document Extrabat');
        return { success: false, error: 'no_folder', data: [] };
      }

      const dossierId = dossierFactures.id;
      console.log('✅ Dossier Factures trouvé, ID:', dossierId);

      // Appel 2 : récupérer les documents du dossier Factures
      const documentsUrl = `${EXTRABAT_API_BASE}/v1/client/${extrabatId}/portedoc/documents/${dossierId}/last`;
      console.log('🔍 URL documents:', documentsUrl);

      const documentsResponse = await fetch(documentsUrl, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log('📡 Réponse documents:', {
        status: documentsResponse.status,
        statusText: documentsResponse.statusText,
      });

      if (!documentsResponse.ok) {
        throw new Error(`Erreur récupération documents: ${documentsResponse.status} ${documentsResponse.statusText}`);
      }

      const documents = await documentsResponse.json();
      console.log('📄 Documents récupérés:', documents);

      // Normaliser les données
      const normalizedFactures = (Array.isArray(documents) ? documents : []).map((doc: any) => {
        // Essayer plusieurs champs possibles pour la date, en priorité createdAt
        const dateValue = doc.createdAt || doc.created_at || doc.dateCreation ||
                         doc.date || doc.dateDocument || doc.date_creation ||
                         doc.dateEmission || doc.date_emission || doc.dateEdition ||
                         doc.date_edition || doc.dateFacture || new Date().toISOString();

        return {
          id: doc.id,
          source: 'extrabat',
          type: 'facture',
          titre: doc.titre || doc.name || doc.libelle || doc.nom || 'Facture Extrabat',
          montant_ttc: doc.montant_ttc || doc.montantTTC || doc.montant || doc.montantTotal || null,
          montant_ht: doc.montant_ht || doc.montantHT || null,
          date: dateValue,
          statut: doc.statut || doc.status || doc.etat || null,
          numero: doc.numero || doc.reference || doc.ref || doc.numeroDocument || null,
          url_pdf: doc.url || doc.pdf_url || doc.lien || doc.urlDocument || doc.link || null,
          raw: doc
        };
      });

      console.log('✅ Factures Extrabat normalisées:', normalizedFactures);
      return { success: true, data: normalizedFactures };

    } catch (error) {
      console.error('❌ Erreur récupération factures Extrabat:', error);
      return { success: false, error: 'api_error', data: [] };
    }
  }
};
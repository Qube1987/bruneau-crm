import { supabaseCRM, supabaseSAV, supabaseDEVIS } from '../lib/supabaseClients';
import { extrabatApi } from './extrabatApi';

export interface DashboardData {
  prospect: any;
  contacts: any[];
  ouvrages: any[];
  opportunites: any[];
  chantiers: any[];
  ltvActions: any[];
  campagnes: any[];
  actionsCommerciales: any[];
  prospectInteractions: any[];
  savRequests: any[];
  maintenance: any[];
  callNotes: any[];
  devis: any[];
  devisExtrabat: any[];
  commandesExtrabat: any[];
  facturesExtrabat: any[];
  pieces: any[];
  interventionPhotos: any[];
  errors: {
    crm?: string;
    sav?: string;
    devis?: string;
    extrabatDevis?: string;
    extrabatCommandes?: string;
    extrabatFactures?: string;
    extrabatPieces?: string;
  };
  extrabatDevisError?: 'api_error' | 'no_folder' | null;
  extrabatCommandesError?: 'api_error' | 'no_folder' | null;
  extrabatFacturesError?: 'api_error' | 'no_folder' | null;
}

function extractResult(result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') return result.value.data || [];
  console.error('Erreur chargement:', result.reason);
  return [];
}

export async function loadClientDashboard(extrabatId: number): Promise<DashboardData | null> {
  const errors: DashboardData['errors'] = {};

  try {
    let { data: prospect, error: prospectError } = await supabaseCRM
      .from('clients')
      .select('*')
      .eq('extrabat_id', extrabatId)
      .maybeSingle();

    if (prospectError) {
      errors.crm = 'Impossible de charger les données CRM';
      throw prospectError;
    }

    let ouvragesList: any[] = [];

    if (!prospect) {
      try {
        const clientDetails = await extrabatApi.getClientDetails(extrabatId);

        console.log('🔍 [Dashboard] Ouvrages reçus pour nouveau prospect:', {
          hasOuvrages: !!clientDetails.ouvrages,
          isArray: Array.isArray(clientDetails.ouvrages),
          count: clientDetails.ouvrages?.length || 0,
          sample: clientDetails.ouvrages?.[0]
        });

        if (clientDetails.ouvrages && Array.isArray(clientDetails.ouvrages)) {
          ouvragesList = clientDetails.ouvrages;
          console.log('✅ [Dashboard] Ouvrages assignés:', ouvragesList.length);
        }

        let telephone = '';
        if (clientDetails.telephones && Array.isArray(clientDetails.telephones) && clientDetails.telephones.length > 0) {
          const phoneData = clientDetails.telephones[0];
          telephone = phoneData.tel_number || phoneData.numero || phoneData.telephone || '';
        }

        let email = '';
        if (clientDetails.client?.email) {
          email = clientDetails.client.email;
        } else if (clientDetails.emails && Array.isArray(clientDetails.emails) && clientDetails.emails.length > 0) {
          const emailData = clientDetails.emails[0];
          email = emailData.email || emailData.adresse || '';
        }

        let ville = '';
        let adresse = '';
        let codePostal = '';
        if (clientDetails.adresses && Array.isArray(clientDetails.adresses) && clientDetails.adresses.length > 0) {
          const addressArray = clientDetails.adresses[0];
          if (Array.isArray(addressArray) && addressArray.length > 1) {
            const addressDetails = addressArray[1];
            ville = addressDetails.adresse_ville || '';
            adresse = addressDetails.adresse_desc || '';
            codePostal = addressDetails.adresse_cp || '';
          } else {
            ville = addressArray.ville || addressArray.city || addressArray.adresse_ville || '';
            adresse = addressArray.adresse || addressArray.rue || addressArray.street || addressArray.adresse_desc || '';
            codePostal = addressArray.codePostal || addressArray.cp || addressArray.postalCode || addressArray.adresse_cp || '';
          }
        }

        const nom = clientDetails.client?.nom || clientDetails.nom || clientDetails.name || clientDetails.raisonSociale || '';
        const prenom = clientDetails.client?.prenom || clientDetails.prenom || clientDetails.firstName || '';

        let civiliteData = '';
        if (clientDetails.civilite) {
          if (typeof clientDetails.civilite === 'string') {
            civiliteData = clientDetails.civilite;
          } else if (typeof clientDetails.civilite === 'object') {
            civiliteData = clientDetails.civilite.civilite_lib || clientDetails.civilite.civilite || '';
          }
        }
        if (!civiliteData) {
          civiliteData = clientDetails.title || '';
        }

        const activiteData = clientDetails.client?.activite || clientDetails.activite || clientDetails.activity || '';

        const { data: newProspect, error: insertError } = await supabaseCRM
          .from('clients')
          .insert({
            extrabat_id: extrabatId,
            nom,
            prenom,
            telephone,
            email,
            ville,
            adresse,
            code_postal: codePostal,
            civilite: civiliteData,
            activite: activiteData,
            source: 'fidelisation',
            suivi_par: 'Non assigné',
            actif: true
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            const { data: existingProspect, error: updateError } = await supabaseCRM
              .from('clients')
              .update({
                nom,
                prenom,
                telephone,
                email,
                ville,
                adresse,
                code_postal: codePostal,
                civilite: civiliteData,
                activite: activiteData
              })
              .eq('extrabat_id', extrabatId)
              .select()
              .maybeSingle();

            if (updateError || !existingProspect) {
              const { data: fallbackProspect } = await supabaseCRM
                .from('clients')
                .select('*')
                .eq('extrabat_id', extrabatId)
                .maybeSingle();

              if (fallbackProspect) {
                prospect = fallbackProspect;
              } else {
                console.error('Erreur mise à jour prospect:', updateError);
                return null;
              }
            } else {
              prospect = existingProspect;
            }
          } else {
            console.error('Erreur création prospect:', insertError);
            return null;
          }
        } else {
          prospect = newProspect;
        }
      } catch (extrabatError) {
        console.error('Erreur récupération client Extrabat:', extrabatError);
        return null;
      }
    } else {
      try {
        const clientDetails = await extrabatApi.getClientDetails(extrabatId);

        console.log('🔍 [Dashboard] Ouvrages reçus pour prospect existant:', {
          hasOuvrages: !!clientDetails.ouvrages,
          isArray: Array.isArray(clientDetails.ouvrages),
          count: clientDetails.ouvrages?.length || 0,
          sample: clientDetails.ouvrages?.[0]
        });

        if (clientDetails.ouvrages && Array.isArray(clientDetails.ouvrages)) {
          ouvragesList = clientDetails.ouvrages;
          console.log('✅ [Dashboard] Ouvrages assignés:', ouvragesList.length);
        }
      } catch (extrabatError) {
        console.error('Erreur récupération ouvrages client Extrabat:', extrabatError);
      }
    }

    const clientId = prospect.id;

    const [
      contacts,
      opportunites,
      chantiers,
      ltvActions,
      campagnes,
      actionsCommerciales,
      prospectInteractions,
      savRequests,
      maintenance,
      clientDevisResult,
      extrabatDevisResult,
      extrabatCommandesResult,
      extrabatFacturesResult
    ] = await Promise.allSettled([
      supabaseCRM.from('client_contacts').select('*')
        .eq('client_id', clientId)
        .order('principal', { ascending: false }),

      supabaseCRM.from('opportunites').select('*, interactions(*), opportunite_photos(url, file_name)')
        .eq('client_id', clientId)
        .order('date_creation', { ascending: false }),

      supabaseCRM.from('chantiers').select('*, chantier_interventions(*)')
        .eq('extrabat_id', extrabatId)
        .order('created_at', { ascending: false }),

      supabaseCRM.from('ltv_actions').select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true }),

      supabaseCRM.from('campagne_prospects').select('*, campagnes_commerciales(titre, description, objectif_montant)')
        .eq('extrabat_id', extrabatId),

      supabaseCRM.from('prospect_actions_commerciales').select('*')
        .eq('client_id', clientId)
        .maybeSingle(),

      supabaseCRM.from('prospect_interactions').select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false }),

      supabaseSAV.from('sav_requests').select('*, sav_interventions(*, sav_intervention_technicians(technician_id))')
        .eq('extrabat_id', extrabatId)
        .order('created_at', { ascending: false }),

      supabaseSAV.from('maintenance_contracts').select('*, maintenance_interventions(*)')
        .eq('extrabat_id', extrabatId)
        .order('created_at', { ascending: false }),

      supabaseDEVIS.from('clients').select('id, name, email, phone, address, city, postal_code, company, siret')
        .eq('extrabat_id', extrabatId)
        .maybeSingle(),

      extrabatApi.fetchExtrabatDevis(extrabatId),

      extrabatApi.fetchExtrabatCommandes(extrabatId),

      extrabatApi.fetchExtrabatFactures(extrabatId)
    ]);

    const savRequestsData = extractResult(savRequests);
    const maintenanceData = extractResult(maintenance);

    const savIds = savRequestsData.map((s: any) => s.id);
    const maintenanceIds = maintenanceData.map((m: any) => m.id);

    let callNotes: any[] = [];
    if (savIds.length > 0 || maintenanceIds.length > 0) {
      try {
        const filters = [];
        if (savIds.length > 0) filters.push(`sav_request_id.in.(${savIds.join(',')})`);
        if (maintenanceIds.length > 0) filters.push(`maintenance_contract_id.in.(${maintenanceIds.join(',')})`);

        const { data } = await supabaseSAV.from('call_notes').select('*')
          .or(filters.join(','))
          .order('created_at', { ascending: false });
        callNotes = data || [];
      } catch (error) {
        console.error('Erreur chargement call_notes:', error);
        errors.sav = 'Erreur partielle sur les données SAV';
      }
    }

    let devisList: any[] = [];
    if (clientDevisResult.status === 'fulfilled' && clientDevisResult.value.data) {
      const clientDevis = clientDevisResult.value.data;
      try {
        const { data } = await supabaseDEVIS
          .from('devis')
          .select('id, titre_affaire, client, totaux, status, created_at, accepted_at, accepted_status, payment_status, taux_tva, payments(amount, status, payment_method, created_at)')
          .eq('client_id', clientDevis.id)
          .order('created_at', { ascending: false });
        devisList = data || [];
      } catch (error) {
        console.error('Erreur chargement devis:', error);
        errors.devis = 'Impossible de charger les devis';
      }
    }

    const interventionIds = savRequestsData.flatMap((s: any) =>
      (s.sav_interventions || []).map((i: any) => i.id)
    );

    let interventionPhotos: any[] = [];
    if (interventionIds.length > 0) {
      try {
        const { data } = await supabaseSAV.from('intervention_photos').select('*')
          .in('intervention_id', interventionIds);
        interventionPhotos = data || [];
      } catch (error) {
        console.error('Erreur chargement intervention_photos:', error);
      }
    }

    if (savRequests.status === 'rejected') {
      errors.sav = 'Impossible de charger les données SAV';
    }

    let devisExtrabatList: any[] = [];
    let extrabatDevisErrorType: 'api_error' | 'no_folder' | null = null;

    if (extrabatDevisResult.status === 'fulfilled') {
      const result = extrabatDevisResult.value;
      if (result.success) {
        devisExtrabatList = result.data;
      } else {
        extrabatDevisErrorType = result.error;
        if (result.error === 'api_error') {
          errors.extrabatDevis = 'Les devis Extrabat n\'ont pas pu être chargés';
        } else if (result.error === 'no_folder') {
          errors.extrabatDevis = 'Aucun dossier Devis trouvé dans le porte-document Extrabat';
        }
      }
    } else {
      errors.extrabatDevis = 'Erreur lors de la récupération des devis Extrabat';
      extrabatDevisErrorType = 'api_error';
    }

    let commandesExtrabatList: any[] = [];
    let extrabatCommandesErrorType: 'api_error' | 'no_folder' | null = null;

    if (extrabatCommandesResult.status === 'fulfilled') {
      const result = extrabatCommandesResult.value;
      if (result.success) {
        commandesExtrabatList = result.data;
      } else {
        extrabatCommandesErrorType = result.error;
        if (result.error === 'api_error') {
          errors.extrabatCommandes = 'Les commandes Extrabat n\'ont pas pu être chargées';
        } else if (result.error === 'no_folder') {
          errors.extrabatCommandes = 'Aucun dossier Commandes trouvé dans le porte-document Extrabat';
        }
      }
    } else {
      errors.extrabatCommandes = 'Erreur lors de la récupération des commandes Extrabat';
      extrabatCommandesErrorType = 'api_error';
    }

    let facturesExtrabatList: any[] = [];
    let extrabatFacturesErrorType: 'api_error' | 'no_folder' | null = null;

    if (extrabatFacturesResult.status === 'fulfilled') {
      const result = extrabatFacturesResult.value;
      if (result.success) {
        facturesExtrabatList = result.data;
      } else {
        extrabatFacturesErrorType = result.error;
        if (result.error === 'api_error') {
          errors.extrabatFactures = 'Les factures Extrabat n\'ont pas pu être chargées';
        } else if (result.error === 'no_folder') {
          errors.extrabatFactures = 'Aucun dossier Factures trouvé dans le porte-document Extrabat';
        }
      }
    } else {
      errors.extrabatFactures = 'Erreur lors de la récupération des factures Extrabat';
      extrabatFacturesErrorType = 'api_error';
    }

    console.log('📦 [Dashboard] Retour final - Ouvrages:', ouvragesList.length);
    console.log('🛠️ [Dashboard] SAV Supabase récupérés:', savRequestsData.length);
    console.log('🔍 [Dashboard] SAV Supabase - IDs ouvrages:', savRequestsData.map((s: any) => s.extrabat_ouvrage_id).filter(Boolean));

    const ouvragesWithSupabaseSav = ouvragesList.map((ouvrage: any) => {
      const extrabatSav = ouvrage.sav || [];

      const supabaseSav = savRequestsData
        .filter((savReq: any) => {
          return savReq.extrabat_ouvrage_id && savReq.extrabat_ouvrage_id === ouvrage.id;
        })
        .map((savReq: any) => ({
          id: `supabase_${savReq.id}`,
          dateCreation: savReq.requested_at,
          observation: savReq.problem_desc,
          commentaireStatut: savReq.prediagnostic,
          commentaireQualite: null,
          appelQualite: null,
          dureeIntervention: null,
          instructions: {},
          rubrique: {
            id: null,
            libelle: savReq.system_type || 'SAV',
            ordre: null,
            actif: true,
            duree: null,
            printInfoClient: false
          },
          etat: {
            id: null,
            libelle: savReq.archived_at
              ? 'Intervention archivée'
              : savReq.status === 'resolved'
                ? 'Intervention terminée'
                : savReq.status === 'in_progress'
                  ? 'En cours'
                  : 'En attente'
          },
          ouvrage: ouvrage.id,
          _source: 'supabase',
          _urgent: savReq.urgent,
          _site: savReq.site,
          _brand: savReq.system_brand,
          _model: savReq.system_model
        }));

      const allSav = [...extrabatSav, ...supabaseSav].sort((a: any, b: any) =>
        new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      );

      console.log(`📍 [Dashboard] Ouvrage ID ${ouvrage.id} "${ouvrage.libelle}": ${extrabatSav.length} SAV Extrabat + ${supabaseSav.length} SAV Supabase`);

      return {
        ...ouvrage,
        sav: allSav
      };
    });

    let piecesList: any[] = [];
    try {
      console.log('📄 [Dashboard] Chargement des pièces commerciales Extrabat');
      const piecesData = await extrabatApi.getClientPieces(extrabatId);
      piecesList = piecesData.pieces || [];
      console.log('✅ [Dashboard] Pièces commerciales chargées:', piecesList.length);
    } catch (error: any) {
      console.error('❌ [Dashboard] Erreur chargement pièces commerciales:', error);
      errors.extrabatPieces = error.message || 'Erreur lors du chargement des pièces commerciales';
    }

    return {
      prospect,
      contacts: extractResult(contacts),
      ouvrages: ouvragesWithSupabaseSav,
      opportunites: extractResult(opportunites),
      chantiers: extractResult(chantiers),
      ltvActions: extractResult(ltvActions),
      campagnes: extractResult(campagnes),
      actionsCommerciales: actionsCommerciales.status === 'fulfilled' && actionsCommerciales.value.data
        ? [actionsCommerciales.value.data]
        : [],
      prospectInteractions: extractResult(prospectInteractions),
      savRequests: savRequestsData,
      maintenance: maintenanceData,
      callNotes,
      devis: devisList,
      devisExtrabat: devisExtrabatList,
      commandesExtrabat: commandesExtrabatList,
      facturesExtrabat: facturesExtrabatList,
      pieces: piecesList,
      interventionPhotos,
      errors,
      extrabatDevisError: extrabatDevisErrorType,
      extrabatCommandesError: extrabatCommandesErrorType,
      extrabatFacturesError: extrabatFacturesErrorType,
    };
  } catch (error) {
    console.error('Erreur chargement dashboard:', error);
    throw error;
  }
}

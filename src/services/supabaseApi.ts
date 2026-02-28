import { supabase, supabaseUrl, supabaseKey } from '../lib/supabaseClients';

export { supabase };

export interface Prospect {
  id: string;
  extrabat_id?: number;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  civilite?: string;
  origine_contact?: string;
  suivi_par: string;
  source?: 'fidelisation' | 'devis' | 'prospection' | 'actions_commerciales';
  actif?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProspectTypeOuvrage {
  id: string;
  client_id: string;
  type_ouvrage: string;
  statut: string;
  created_at: string;
  updated_at: string;
}

export interface ProspectActionCommerciale {
  id: string;
  client_id: string;
  contrat_maintenance: string;
  telesurveillance: string;
  parrainage: string;
  avis_google: string;
  commentaires: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunite {
  id: string;
  client_id: string;
  prospect?: Prospect;
  titre: string;
  description: string;
  commentaires?: string;
  statut: string;
  suivi_par: string;
  montant_estime?: number;
  date_travaux_estimee?: string;
  created_at: string;
  updated_at: string;
  date_cloture?: string;
  statut_final?: string;
  archive?: boolean;
  prioritaire?: boolean;
  saisie_rapide?: boolean;
  extrabat_id?: number;
  interactions?: Interaction[];
}

export interface Interaction {
  id: string;
  opportunite_id: string;
  type: string;
  description: string;
  date: string;
  utilisateur: string;
}

export interface ProspectionAction {
  id: string;
  client_id: string;
  prospect?: Prospect;
  description: string;
  responsable: string;
  statut: 'a_contacter' | 'contacte';
  commentaires?: string;
  created_at: string;
  updated_at: string;
}

export interface Chantier {
  id: string;
  opportunite_id: string;
  opportunite?: Opportunite;
  consignes: string;
  commande_passee: boolean;
  commande_recue: boolean;
  chantier_planifie: boolean;
  chantier_realise: boolean;
  date_commande_passee?: string;
  date_commande_recue?: string;
  date_chantier_planifie?: string;
  date_chantier_realise?: string;
  statut: 'en_cours' | 'finalise';
  date_finalisation?: string;
  ltv_score: number;
  created_at: string;
  updated_at: string;
}

export interface ChantierIntervention {
  id: string;
  chantier_id: string;
  started_at: string;
  ended_at?: string;
  technician_ids: string[];
  notes?: string;
  extrabat_appointment_id?: string;
  created_at: string;
  updated_at: string;
}

export type LtvCategorie = 'reputation' | 'parrainage' | 'contrat_recurrent' | 'upsell';
export type LtvStatut = 'a_faire' | 'en_cours' | 'fait' | 'refus';

export interface LtvAction {
  id: string;
  chantier_id: string;
  categorie: LtvCategorie;
  action: string;
  statut: LtvStatut;
  date_action?: string;
  date_proposition?: string;
  date_echeance?: string;
  commentaires: string;
  parrainages_obtenus: number;
  created_at: string;
  updated_at: string;
}

export interface SalarieUser {
  id: string;
  display_name: string;
  email: string;
  extrabat_id?: number;
}

export const supabaseApi = {
  // Prospects
  async getProspects(): Promise<Prospect[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createProspect(prospectData: Omit<Prospect, 'id' | 'created_at' | 'updated_at'>): Promise<Prospect> {
    const { data, error } = await supabase
      .from('clients')
      .insert([prospectData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProspectById(id: string): Promise<Prospect | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProspectByExtrabatId(extrabatId: number): Promise<Prospect | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('extrabat_id', extrabatId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Opportunités
  async getOpportunites(): Promise<Opportunite[]> {
    const { data, error } = await supabase
      .from('opportunites')
      .select(`
        *,
        prospect:clients(*),
        interactions(*)
      `)
      .order('date_creation', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createOpportunite(
    opportuniteData: Omit<Opportunite, 'id' | 'date_creation' | 'date_modification' | 'prospect' | 'interactions'>,
    shouldSendSms: boolean = false
  ): Promise<Opportunite> {
    const { data, error } = await supabase
      .from('opportunites')
      .insert([opportuniteData])
      .select(`
        *,
        prospect:clients(*)
      `)
      .single();

    if (error) throw error;

    if (shouldSendSms) {
      const sendSmsNotification = async () => {
        try {
          const smsUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;
          await fetch(smsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              clientName: data.titre,
              description: data.description || '',
            }),
          });
        } catch (error) {
          console.error('Erreur envoi SMS:', error);
        }
      };

      sendSmsNotification();
    }

    return data;
  },

  async updateOpportunite(id: string, updates: Partial<Opportunite>): Promise<Opportunite> {
    const { data, error } = await supabase
      .from('opportunites')
      .update({
        ...updates,
        date_modification: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        prospect:clients(*),
        interactions(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteOpportunite(id: string): Promise<void> {
    const { error } = await supabase
      .from('opportunites')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleOpportunitePrioritaire(id: string, prioritaire: boolean): Promise<Opportunite> {
    const { data, error } = await supabase
      .from('opportunites')
      .update({
        prioritaire,
        date_modification: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        prospect:clients(*),
        interactions(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProspect(id: string, updates: Partial<Prospect>): Promise<Prospect> {
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  // Interactions
  async createInteraction(interactionData: Omit<Interaction, 'id' | 'date'>): Promise<Interaction> {
    const { data, error } = await supabase
      .from('interactions')
      .insert([{
        ...interactionData,
        date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour la date de modification de l'opportunité
    await supabase
      .from('opportunites')
      .update({ date_modification: new Date().toISOString() })
      .eq('id', interactionData.opportunite_id);

    // Si c'est une interaction physique avec des dates de RDV, créer le RDV dans Extrabat
    if (data.type === 'physique' && data.date_rdv_debut && data.date_rdv_fin) {
      this.syncRendezVousToExtrabat(data, interactionData.opportunite_id).catch(err => {
        console.error('Erreur synchronisation RDV Extrabat:', err);
      });
    }

    return data;
  },

  async syncRendezVousToExtrabat(interaction: any, opportuniteId: string): Promise<void> {
    try {
      // Récupérer l'opportunité avec les informations du client
      const { data: opportunite, error: oppError } = await supabase
        .from('opportunites')
        .select('*, prospect:clients(extrabat_id, nom, prenom, adresse)')
        .eq('id', opportuniteId)
        .single();

      if (oppError || !opportunite) {
        console.error('Erreur récupération opportunité:', oppError);
        return;
      }

      const prospect = opportunite.prospect || opportunite.clients;

      if (!prospect) {
        console.error('Erreur: Prospect non trouvé pour cette opportunité');
        return;
      }

      // Récupérer l'ID Extrabat de l'utilisateur à partir de son nom
      let extrabatUserId = 46516; // ID par défaut

      if (interaction.rdv_user_id) {
        const { extrabatParametersService } = await import('./extrabatParametersService');
        const utilisateurs = await extrabatParametersService.getUtilisateurs();
        const utilisateur = utilisateurs.find(u => u.nom === interaction.rdv_user_id);

        if (utilisateur?.extrabat_id) {
          extrabatUserId = utilisateur.extrabat_id;
          console.log(`📅 Utilisateur trouvé: ${utilisateur.nom} (ID Extrabat: ${extrabatUserId})`);
        } else {
          console.warn(`⚠️ Utilisateur "${interaction.rdv_user_id}" non trouvé, utilisation de l'ID par défaut (46516)`);
        }
      } else {
        console.warn('⚠️ Aucun rdv_user_id fourni, utilisation de l\'ID par défaut (46516)');
      }

      // Importer dynamiquement l'API Extrabat pour éviter les dépendances circulaires
      const { extrabatApi } = await import('./extrabatApi');

      // Formater les dates pour Extrabat (format: "YYYY-MM-DD HH:mm:ss" en heure locale française)
      const formatDateForExtrabat = (isoDate: string) => {
        const date = new Date(isoDate);

        // Convertir en heure locale française (Europe/Paris)
        const frenchTime = date.toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        // Format: "DD/MM/YYYY HH:mm:ss" -> "YYYY-MM-DD HH:mm:ss"
        const [datePart, timePart] = frenchTime.split(' ');
        const [day, month, year] = datePart.split('/');

        return `${year}-${month}-${day} ${timePart}`;
      };

      // Préparer le nom du client pour l'objet du RDV
      const clientName = `${prospect.nom} ${prospect.prenom || ''}`.trim();

      // Créer le RDV dans Extrabat
      // Si pas d'ID Extrabat, le RDV est créé sans lien client, avec le nom dans l'objet
      const rdvObjet = prospect?.extrabat_id
        ? `RDV - ${clientName}`
        : `RDV - ${clientName} (Non synchronisé)`;

      console.log(`📅 Création RDV pour l'utilisateur Extrabat ID: ${extrabatUserId}${!prospect?.extrabat_id ? ' (sans lien client)' : ''}`);

      await extrabatApi.createRendezVous({
        objet: rdvObjet,
        observation: interaction.description,
        debut: formatDateForExtrabat(interaction.date_rdv_debut),
        fin: formatDateForExtrabat(interaction.date_rdv_fin),
        ...(prospect?.extrabat_id && { clientId: prospect.extrabat_id }),
        userId: extrabatUserId,
        adresse: prospect.adresse ? {
          rue: prospect.adresse.split(',')[0]?.trim(),
          cp: '',
          ville: prospect.adresse.split(',')[1]?.trim() || ''
        } : undefined
      });

      console.log('✅ RDV synchronisé avec Extrabat');
    } catch (error) {
      console.error('❌ Erreur synchronisation RDV:', error);
      throw error;
    }
  },

  async updateInteraction(id: string, updates: Partial<Interaction>): Promise<Interaction> {
    const { data, error } = await supabase
      .from('interactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteInteraction(id: string): Promise<void> {
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getInteractionsByOpportunite(opportuniteId: string): Promise<Interaction[]> {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('opportunite_id', opportuniteId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Types d'ouvrage
  async getProspectTypesOuvrage(clientId: string): Promise<ProspectTypeOuvrage[]> {
    const { data, error } = await supabase
      .from('prospect_types_ouvrage')
      .select('*')
      .eq('client_id', clientId)
      .order('type_ouvrage');

    if (error) throw error;
    return data || [];
  },

  async upsertProspectTypeOuvrage(clientId: string, typeOuvrage: string, statut: string): Promise<void> {
    const { error } = await supabase
      .from('prospect_types_ouvrage')
      .upsert({
        client_id: clientId,
        type_ouvrage: typeOuvrage,
        statut: statut,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,type_ouvrage' });

    if (error) throw error;
  },

  // Actions commerciales
  async getProspectActionsCommerciales(clientId: string): Promise<ProspectActionCommerciale | null> {
    const { data, error } = await supabase
      .from('prospect_actions_commerciales')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsertProspectActionsCommerciales(clientId: string, actions: Partial<ProspectActionCommerciale>): Promise<void> {
    const { error } = await supabase
      .from('prospect_actions_commerciales')
      .upsert({
        client_id: clientId,
        ...actions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' });

    if (error) throw error;
  },

  // Actions de prospection
  async getProspectionActions(): Promise<ProspectionAction[]> {
    const { data, error } = await supabase
      .from('prospection_actions')
      .select(`
        *,
        prospect:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createProspectionAction(actionData: Omit<ProspectionAction, 'id' | 'created_at' | 'updated_at' | 'prospect'>): Promise<ProspectionAction> {
    const { data, error } = await supabase
      .from('prospection_actions')
      .insert([actionData])
      .select(`
        *,
        prospect:clients(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProspectionAction(id: string, updates: Partial<ProspectionAction>): Promise<ProspectionAction> {
    const { data, error } = await supabase
      .from('prospection_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        prospect:clients(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProspectionAction(id: string): Promise<void> {
    const { error } = await supabase
      .from('prospection_actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Chantiers
  async getAllChantiers(): Promise<Chantier[]> {
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        opportunite:opportunites(
          *,
          prospect:clients(*)
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChantiers(): Promise<Chantier[]> {
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        opportunite:opportunites(
          *,
          prospect:clients(*)
        )
      `)
      .eq('chantier_realise', false)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOpportunitesDevisGagnes(): Promise<Opportunite[]> {
    const { data, error } = await supabase
      .from('opportunites')
      .select(`
        *,
        prospect:clients(*)
      `)
      .eq('statut_final', 'gagne')
      .order('date_creation', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChantierByOpportuniteId(opportuniteId: string): Promise<Chantier | null> {
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        opportunite:opportunites(
          *,
          prospect:clients(*)
        )
      `)
      .eq('opportunite_id', opportuniteId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createChantier(chantierData: Omit<Chantier, 'id' | 'created_at' | 'updated_at' | 'opportunite'>): Promise<Chantier> {
    const { data, error } = await supabase
      .from('chantiers')
      .upsert([chantierData], {
        onConflict: 'opportunite_id',
        ignoreDuplicates: false
      })
      .select(`
        *,
        opportunite:opportunites(
          *,
          prospect:clients(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateChantier(id: string, updates: Partial<Chantier>): Promise<Chantier> {
    const { data, error } = await supabase
      .from('chantiers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        opportunite:opportunites(
          *,
          prospect:clients(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChantier(id: string): Promise<void> {
    const { error } = await supabase
      .from('chantiers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Interventions de chantier
  async getChantierInterventions(chantierId: string): Promise<ChantierIntervention[]> {
    const { data, error } = await supabase
      .from('chantier_interventions')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('started_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createChantierIntervention(interventionData: Omit<ChantierIntervention, 'id' | 'created_at' | 'updated_at'>): Promise<ChantierIntervention> {
    const { data, error } = await supabase
      .from('chantier_interventions')
      .insert([interventionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateChantierIntervention(id: string, updates: Partial<ChantierIntervention>): Promise<ChantierIntervention> {
    const { data, error } = await supabase
      .from('chantier_interventions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChantierIntervention(id: string): Promise<void> {
    const { error } = await supabase
      .from('chantier_interventions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Optimisation de la valeur à vie (LTV)
  async getProspectsLtv(): Promise<any[]> {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        ltv_actions(*)
      `)
      .eq('ltv_actif', true)
      .order('ltv_date_inscription', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async finalizeChantier(chantierId: string): Promise<void> {
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .select('opportunite_id, opportunites(client_id)')
      .eq('id', chantierId)
      .single();

    if (chantierError) throw chantierError;

    const clientId = (chantier as any).opportunites.client_id;

    const { error: updateError } = await supabase
      .from('chantiers')
      .update({
        statut: 'finalise',
        date_finalisation: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chantierId);

    if (updateError) throw updateError;

    const { error: enrollError } = await supabase
      .from('clients')
      .update({
        ltv_actif: true,
        ltv_date_inscription: new Date().toISOString()
      })
      .eq('id', clientId);

    if (enrollError) throw enrollError;

    const { error: generateError } = await supabase
      .rpc('generate_ltv_checklist', {
        prospect_uuid: clientId,
        chantier_uuid: chantierId
      });

    if (generateError) throw generateError;
  },

  async getLtvActions(chantierId: string): Promise<LtvAction[]> {
    const { data, error } = await supabase
      .from('ltv_actions')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getLtvActionsByProspect(clientId: string): Promise<LtvAction[]> {
    const { data, error } = await supabase
      .from('ltv_actions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async enrollClientInLtv(clientId: string): Promise<void> {
    const { error } = await supabase
      .rpc('enroll_client_in_ltv', { prospect_uuid: clientId });

    if (error) throw error;
  },

  async updateLtvAction(id: string, updates: Partial<LtvAction>): Promise<LtvAction> {
    const { data, error } = await supabase
      .from('ltv_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLtvScore(clientId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_ltv_score', { prospect_uuid: clientId });

    if (error) throw error;

    const score = data as number;

    await supabase
      .from('clients')
      .update({ ltv_score: score })
      .eq('id', clientId);

    return score;
  },

  // Utilisateurs (salariés)
  async getSalaries(): Promise<SalarieUser[]> {
    const { data, error } = await supabase
      .from('extrabat_utilisateurs')
      .select('id, nom, email, extrabat_id, actif')
      .eq('actif', true)
      .order('nom');

    if (error) throw error;

    return (data || []).map(user => ({
      id: user.id,
      display_name: user.nom,
      email: user.email || '',
      extrabat_id: user.extrabat_id
    }));
  }
};
import { supabase } from './supabaseApi';
import { extrabatApi } from './extrabatApi';

export interface ExtrabatParameter {
  id: string;
  extrabat_id: number;
  libelle: string;
  ordre?: number;
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errorMessage?: string;
}

export const extrabatParametersService = {
  // Synchronisation des paramètres depuis l'API Extrabat
  async syncAllParameters(): Promise<{ [key: string]: SyncResult }> {
    const results: { [key: string]: SyncResult } = {};

    const syncTasks = [
      { name: 'utilisateurs', syncFn: () => this.syncUtilisateurs() },
      { name: 'civilites', syncFn: () => this.syncCivilites() },
      { name: 'origines_contact', syncFn: () => this.syncOriginesContact() },
      { name: 'questions_complementaires', syncFn: () => this.syncQuestionsComplementaires() },
      { name: 'regroupements', syncFn: () => this.syncRegroupements() },
      { name: 'client_statuts', syncFn: () => this.syncClientStatuts() },
      { name: 'type_adresse', syncFn: () => this.syncTypeAdresse() },
      { name: 'type_telephone', syncFn: () => this.syncTypeTelephone() },
    ];

    for (const task of syncTasks) {
      try {
        results[task.name] = await task.syncFn();
        await this.logSync(task.name, results[task.name]);
      } catch (error) {
        results[task.name] = {
          success: false,
          recordsSynced: 0,
          errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
        };
        await this.logSync(task.name, results[task.name]);
      }
    }

    return results;
  },

  // Synchronisation des utilisateurs
  async syncUtilisateurs(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getUtilisateurs();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_utilisateurs')
          .upsert({
            extrabat_id: record.id,
            nom: record.nom,
            email: record.email,
            actif: record.actif,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync utilisateurs: ${error}`);
    }
  },

  // Synchronisation des civilités
  async syncCivilites(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getCivilites();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_civilites')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            ordre: record.ordre || 0,
            professionnel: record.professionnel || false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync civilités: ${error}`);
    }
  },

  // Synchronisation des origines de contact
  async syncOriginesContact(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getOriginesContact();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_origines_contact')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            ordre: record.ordre || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync origines contact: ${error}`);
    }
  },

  // Synchronisation des questions complémentaires
  async syncQuestionsComplementaires(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getQuestionsComplementaires();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_questions_complementaires')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            type: record.type,
            ordre: record.ordre || 0,
            obligatoire: record.obligatoire || false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync questions complémentaires: ${error}`);
    }
  },

  // Synchronisation des regroupements
  async syncRegroupements(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getRegroupements();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_regroupements')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            ordre: record.ordre || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync regroupements: ${error}`);
    }
  },

  // Synchronisation des statuts clients
  async syncClientStatuts(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getClientStatuts();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_client_statuts')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            corbeille: record.corbeille || false,
            planning: record.planning || false,
            restreint: record.restreint || false,
            ordre: record.ordre || 0,
            prospect: record.prospect || false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync statuts clients: ${error}`);
    }
  },

  // Synchronisation des types d'adresse
  async syncTypeAdresse(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getTypesAdresse();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_type_adresse')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            ordre: record.ordre || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync types adresse: ${error}`);
    }
  },

  // Synchronisation des types de téléphone
  async syncTypeTelephone(): Promise<SyncResult> {
    try {
      const extrabatData = await extrabatApi.getTypesTelephone();
      const records = Array.isArray(extrabatData) ? extrabatData : [extrabatData];

      for (const record of records) {
        await supabase
          .from('extrabat_type_telephone')
          .upsert({
            extrabat_id: record.id,
            libelle: record.libelle,
            ordre: record.ordre || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'extrabat_id' });
      }

      return { success: true, recordsSynced: records.length };
    } catch (error) {
      throw new Error(`Erreur sync types téléphone: ${error}`);
    }
  },

  // Récupération des paramètres depuis la base locale
  async getUtilisateurs(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_utilisateurs')
      .select('*')
      .order('nom');
    
    if (error) throw error;
    return data || [];
  },

  async getCivilites(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_civilites')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  async getOriginesContact(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_origines_contact')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  async getRegroupements(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_regroupements')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  async getClientStatuts(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_client_statuts')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  async getTypeAdresse(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_type_adresse')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  async getTypeTelephone(): Promise<ExtrabatParameter[]> {
    const { data, error } = await supabase
      .from('extrabat_type_telephone')
      .select('*')
      .order('ordre');
    
    if (error) throw error;
    return data || [];
  },

  // Validation des paramètres avant création de client
  async validateClientData(formData: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Vérifier la civilité
      if (formData.civilite) {
        const civilites = await this.getCivilites();
        const civiliteFound = civilites.find(c => c.libelle === formData.civilite);
        if (!civiliteFound) {
          errors.push(`Civilité "${formData.civilite}" non trouvée dans les paramètres Extrabat`);
        }
      }

      // Vérifier l'origine de contact
      if (formData.origineContact) {
        const origines = await this.getOriginesContact();
        const origineFound = origines.find(o => o.libelle === formData.origineContact);
        if (!origineFound) {
          errors.push(`Origine de contact "${formData.origineContact}" non trouvée dans les paramètres Extrabat`);
        }
      }

      // Vérifier l'utilisateur suivi par
      if (formData.suiviPar) {
        const utilisateurs = await this.getUtilisateurs();
        const utilisateurFound = utilisateurs.find(u => u.nom === formData.suiviPar);
        if (!utilisateurFound) {
          errors.push(`Utilisateur "${formData.suiviPar}" non trouvé dans les paramètres Extrabat`);
        }
      }

      // Vérifier le type de téléphone
      if (formData.typeTelephone) {
        const typesTelephone = await this.getTypeTelephone();
        const typeFound = typesTelephone.find(t => t.libelle === formData.typeTelephone);
        if (!typeFound) {
          errors.push(`Type de téléphone "${formData.typeTelephone}" non trouvé dans les paramètres Extrabat`);
        }
      }

      // Vérifier le type d'adresse
      if (formData.typeAdresse) {
        const typesAdresse = await this.getTypeAdresse();
        const typeFound = typesAdresse.find(t => t.libelle === formData.typeAdresse);
        if (!typeFound) {
          errors.push(`Type d'adresse "${formData.typeAdresse}" non trouvé dans les paramètres Extrabat`);
        }
      }

      // Vérifier qu'il y a au moins un regroupement et un statut client
      const regroupements = await this.getRegroupements();
      if (regroupements.length === 0) {
        errors.push('Aucun regroupement disponible dans les paramètres Extrabat');
      }

      const statuts = await this.getClientStatuts();
      if (statuts.length === 0) {
        errors.push('Aucun statut client disponible dans les paramètres Extrabat');
      }

    } catch (error) {
      errors.push(`Erreur lors de la validation: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Récupérer les IDs Extrabat pour la création de client
  async getExtrabatIds(formData: any): Promise<any> {
    const civilites = await this.getCivilites();
    const origines = await this.getOriginesContact();
    const utilisateurs = await this.getUtilisateurs();
    const regroupements = await this.getRegroupements();
    const statuts = await this.getClientStatuts();
    const typesAdresse = await this.getTypeAdresse();
    const typesTelephone = await this.getTypeTelephone();

    console.log('Paramètres chargés:', {
      civilites: civilites.length,
      origines: origines.length,
      utilisateurs: utilisateurs.length,
      regroupements: regroupements.length,
      statuts: statuts.length,
      typesAdresse: typesAdresse.length,
      typesTelephone: typesTelephone.length
    });
    const civiliteObj = civilites.find(c => c.libelle === formData.civilite);
    const origineObj = origines.find(o => o.libelle === formData.origineContact);
    const utilisateurObj = utilisateurs.find(u => u.nom === formData.suiviPar);
    const regroupementObj = regroupements[0]; // Premier regroupement disponible
    const statutObj = statuts.find(s => s.prospect === true) || statuts[0];
    const typeAdresseObj = typesAdresse.find(t => t.libelle === formData.typeAdresse) || typesAdresse[0];
    const typeTelephoneObj = typesTelephone.find(t => t.libelle === formData.typeTelephone) || typesTelephone[0];

    console.log('Objets trouvés:', {
      civiliteObj,
      origineObj,
      utilisateurObj,
      regroupementObj,
      statutObj,
      typeAdresseObj,
      typeTelephoneObj
    });
    return {
      civiliteId: civiliteObj?.extrabat_id || 1,
      origineId: origineObj?.extrabat_id || 1,
      suiviParId: utilisateurObj?.extrabat_id || 1,
      regroupementId: regroupementObj?.extrabat_id || 0,
      statusId: statutObj?.extrabat_id || 1,
      typeAdresseId: typeAdresseObj?.extrabat_id || 1,
      typeTelephoneId: typeTelephoneObj?.extrabat_id || 1,
      isProfessional: civiliteObj?.professionnel || false,
      civiliteLibelle: civiliteObj?.libelle || ''
    };
  },

  // Log des synchronisations
  async logSync(tableName: string, result: SyncResult): Promise<void> {
    await supabase
      .from('extrabat_sync_log')
      .insert({
        table_name: tableName,
        sync_status: result.success ? 'success' : 'error',
        records_synced: result.recordsSynced,
        error_message: result.errorMessage
      });
  },

  // Vérifier si les paramètres sont à jour (dernière sync < 24h)
  async needsSync(): Promise<boolean> {
    const { data } = await supabase
      .from('extrabat_sync_log')
      .select('sync_date')
      .eq('sync_status', 'success')
      .order('sync_date', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return true;

    const lastSync = new Date(data[0].sync_date);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    return hoursDiff > 24; // Sync si plus de 24h
  }
};
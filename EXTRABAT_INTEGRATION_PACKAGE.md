# Package d'intégration Extrabat

Ce document contient toutes les informations nécessaires pour intégrer la fonctionnalité de recherche et gestion de clients Extrabat dans un autre projet.

## Vue d'ensemble

Cette intégration permet de :
- Rechercher des clients dans l'API Extrabat
- Récupérer les détails complets d'un client
- Créer de nouveaux clients dans Extrabat
- Synchroniser et gérer les paramètres Extrabat (civilités, origines, utilisateurs, etc.)
- Stocker localement les paramètres pour validation et performances

## Configuration requise

### 1. Variables d'environnement

Aucune variable d'environnement n'est nécessaire pour Extrabat car les clés API sont intégrées. Cependant, vous aurez besoin de :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### 2. Configuration Netlify (ou équivalent)

Créer un fichier `public/_redirects` pour proxifier les appels à l'API Extrabat :

```
/extrabat-api/* https://api.extrabat.com/:splat 200
/* /index.html 200
```

**Important** : Cette configuration est essentielle pour éviter les problèmes CORS avec l'API Extrabat.

### 3. Clés API Extrabat

Les clés sont déjà intégrées dans le service (voir code ci-dessous) :
- API_KEY: `MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3`
- SECURITY_KEY: `b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c`

## Structure de la base de données

### Migrations SQL à appliquer

#### Migration 1 : Tables de paramètres Extrabat

```sql
/*
  # Création des tables pour les paramètres Extrabat

  1. Nouvelles Tables
    - `extrabat_utilisateurs` - Stockage des utilisateurs Extrabat
    - `extrabat_civilites` - Stockage des civilités
    - `extrabat_origines_contact` - Stockage des origines de contact
    - `extrabat_questions_complementaires` - Stockage des questions complémentaires
    - `extrabat_regroupements` - Stockage des regroupements
    - `extrabat_client_statuts` - Stockage des statuts clients
    - `extrabat_type_adresse` - Stockage des types d'adresse
    - `extrabat_type_telephone` - Stockage des types de téléphone
    - `extrabat_sync_log` - Log des synchronisations

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politique d'accès libre pour toutes les tables (lecture/écriture)

  3. Index
    - Index sur les champs extrabat_id pour optimiser les recherches
*/

-- Table des utilisateurs Extrabat
CREATE TABLE IF NOT EXISTS extrabat_utilisateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  nom text NOT NULL,
  email text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des civilités
CREATE TABLE IF NOT EXISTS extrabat_civilites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  professionnel boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des origines de contact
CREATE TABLE IF NOT EXISTS extrabat_origines_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des questions complémentaires
CREATE TABLE IF NOT EXISTS extrabat_questions_complementaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  type text,
  ordre integer DEFAULT 0,
  obligatoire boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des regroupements
CREATE TABLE IF NOT EXISTS extrabat_regroupements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des statuts clients
CREATE TABLE IF NOT EXISTS extrabat_client_statuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  corbeille boolean DEFAULT false,
  planning boolean DEFAULT false,
  restreint boolean DEFAULT false,
  ordre integer DEFAULT 0,
  prospect boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des types d'adresse
CREATE TABLE IF NOT EXISTS extrabat_type_adresse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des types de téléphone
CREATE TABLE IF NOT EXISTS extrabat_type_telephone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  libelle text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de log des synchronisations
CREATE TABLE IF NOT EXISTS extrabat_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  sync_status text NOT NULL, -- 'success', 'error', 'partial'
  records_synced integer DEFAULT 0,
  error_message text,
  sync_date timestamptz DEFAULT now()
);

-- Enable RLS sur toutes les tables
ALTER TABLE extrabat_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_civilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_origines_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_questions_complementaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_regroupements ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_client_statuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_type_adresse ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_type_telephone ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrabat_sync_log ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès libre pour toutes les tables
CREATE POLICY "Accès libre extrabat_utilisateurs" ON extrabat_utilisateurs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_civilites" ON extrabat_civilites FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_origines_contact" ON extrabat_origines_contact FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_questions_complementaires" ON extrabat_questions_complementaires FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_regroupements" ON extrabat_regroupements FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_client_statuts" ON extrabat_client_statuts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_type_adresse" ON extrabat_type_adresse FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_type_telephone" ON extrabat_type_telephone FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Accès libre extrabat_sync_log" ON extrabat_sync_log FOR ALL TO public USING (true) WITH CHECK (true);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_extrabat_utilisateurs_extrabat_id ON extrabat_utilisateurs(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_civilites_extrabat_id ON extrabat_civilites(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_origines_contact_extrabat_id ON extrabat_origines_contact(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_questions_complementaires_extrabat_id ON extrabat_questions_complementaires(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_regroupements_extrabat_id ON extrabat_regroupements(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_client_statuts_extrabat_id ON extrabat_client_statuts(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_type_adresse_extrabat_id ON extrabat_type_adresse(extrabat_id);
CREATE INDEX IF NOT EXISTS idx_extrabat_type_telephone_extrabat_id ON extrabat_type_telephone(extrabat_id);
```

#### Migration 2 : Table prospects (optionnelle, si vous gérez des prospects)

```sql
/*
  # Table prospects pour lier les clients Extrabat au CRM local

  1. Nouvelle Table
    - `prospects`
      - `id` (uuid, clé primaire)
      - `extrabat_id` (integer, ID du client dans Extrabat)
      - Informations client...

  2. Sécurité
    - Activation RLS
    - Politique d'accès selon vos besoins
*/

CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id integer UNIQUE NOT NULL,
  nom text NOT NULL,
  prenom text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  civilite text,
  origine_contact text,
  suivi_par text NOT NULL DEFAULT 'Quentin',
  date_creation timestamptz DEFAULT now(),
  date_modification timestamptz DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès libre prospects"
  ON prospects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_prospects_extrabat_id ON prospects(extrabat_id);
```

## Code source

### 1. Types TypeScript (`src/types/extrabat.ts`)

```typescript
export interface Civilite {
  id: number;
  libelle: string;
  ordre: number;
  professionnel: boolean;
}

export interface User {
  id: number;
  nom: string;
  email: string;
  avatar?: string;
  actif: boolean;
}

export interface OrigineContact {
  id: number;
  libelle: string;
  ordre: number;
}

export interface Telephone {
  id?: number;
  number: string;
  ordre: number;
  type?: {
    id: number;
    libelle: string;
  };
}

export interface Adresse {
  id?: number;
  description: string;
  codePostal: string;
  ville: string;
  pays?: string;
  gpsLat?: string;
  gpsLon?: string;
  type?: {
    id: number;
    libelle: string;
  };
}

export interface Client {
  id?: number;
  civiliteId: number;
  suiviParId: number;
  origineId: number;
  nom: string;
  prenom: string;
  email: string;
  observation?: string;
  espaceClientEnabled?: boolean;
  emailing?: boolean;
  sms?: boolean;
  siret?: string;
  tvaIntra?: string;
  civilite?: Civilite;
  suiviPar?: User;
  creePar?: User;
  telephones?: Telephone[];
  adresses?: Adresse[];
  dateCreation?: string;
  dateModif?: string;
}

export interface CreateClientPayload {
  civiliteId: number;
  suiviParId: number;
  origineId: number;
  nom: string;
  prenom: string;
  email: string;
  observation?: string;
  espaceClientEnabled: boolean;
  emailing: boolean;
  sms: boolean;
  telephones: Array<{
    number: string;
    typeId: number;
  }>;
  adresses: Array<{
    description: string;
    codePostal: string;
    ville: string;
    typeId: number;
  }>;
}

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
```

### 2. Service API Extrabat (`src/services/extrabatApi.ts`)

```typescript
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
    if (query) {
      url += `?q=${encodeURIComponent(query)}`;
    }

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

  // Récupérer les détails complets d'un client
  async getClientDetails(clientId: number) {
    const url = `${EXTRABAT_API_BASE}/v3/client/${clientId}`;
    console.log('🔍 Récupération détails client:', {
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
      console.log('✅ Détails client récupérés:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération détails client:', error);
      throw error;
    }
  },

  // Créer un nouveau client
  async createClient(clientData: any) {
    console.log('🚀 Création client - Données:', JSON.stringify(clientData, null, 2));
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
  }
};
```

### 3. Service de synchronisation des paramètres (`src/services/extrabatParametersService.ts`)

```typescript
import { supabase } from './supabaseApi';
import { extrabatApi } from './extrabatApi';
import { ExtrabatParameter, SyncResult } from '../types/extrabat';

export const extrabatParametersService = {
  // Synchronisation de tous les paramètres depuis l'API Extrabat
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
    const regroupementObj = regroupements[0];
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

    return hoursDiff > 24;
  }
};
```

### 4. Client Supabase (`src/services/supabaseApi.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Utilisation

### 1. Initialisation

Avant d'utiliser l'API Extrabat, synchronisez les paramètres :

```typescript
import { extrabatParametersService } from './services/extrabatParametersService';

// Au démarrage de l'application ou dans un useEffect
const initializeExtrabatParams = async () => {
  const needsSync = await extrabatParametersService.needsSync();

  if (needsSync) {
    console.log('Synchronisation des paramètres Extrabat...');
    const results = await extrabatParametersService.syncAllParameters();
    console.log('Résultats de la synchronisation:', results);
  }
};
```

### 2. Rechercher des clients

```typescript
import { extrabatApi } from './services/extrabatApi';

// Rechercher des clients
const searchResults = await extrabatApi.searchClients('nom du client');

// Récupérer les détails complets d'un client
const clientDetails = await extrabatApi.getClientDetails(clientId);
```

### 3. Créer un nouveau client

```typescript
import { extrabatApi } from './services/extrabatApi';
import { extrabatParametersService } from './services/extrabatParametersService';

// Récupérer les IDs nécessaires depuis les paramètres locaux
const extrabatIds = await extrabatParametersService.getExtrabatIds({
  civilite: 'Monsieur',
  origineContact: 'Site internet',
  suiviPar: 'Jean Dupont',
  typeAdresse: 'Facturation',
  typeTelephone: 'Mobile'
});

// Créer le client
const newClient = await extrabatApi.createClient({
  civiliteId: extrabatIds.civiliteId,
  suiviParId: extrabatIds.suiviParId,
  origineId: extrabatIds.origineId,
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean.dupont@example.com',
  observation: 'Client potentiel',
  espaceClientEnabled: true,
  emailing: true,
  sms: true,
  telephones: [{
    number: '0612345678',
    typeId: extrabatIds.typeTelephoneId
  }],
  adresses: [{
    description: '123 rue de la Paix',
    codePostal: '75001',
    ville: 'Paris',
    typeId: extrabatIds.typeAdresseId
  }]
});
```

## Points importants

1. **Proxy Netlify obligatoire** : Les appels à l'API Extrabat doivent passer par un proxy pour éviter les problèmes CORS

2. **Synchronisation des paramètres** : Les paramètres doivent être synchronisés au moins une fois avant de créer des clients

3. **Validation** : Utilisez `extrabatParametersService.validateClientData()` pour valider les données avant création

4. **IDs Extrabat** : Les IDs utilisés pour créer un client doivent correspondre aux IDs réels dans Extrabat (récupérés via la synchronisation)

5. **Logs** : Tous les appels API incluent des logs détaillés dans la console pour faciliter le débogage

## Endpoints de l'API Extrabat

- `GET /v2/clients?q={query}` - Recherche de clients
- `GET /v3/client/{id}` - Détails d'un client
- `POST /v1/client` - Création d'un client
- `GET /v1/parametres/civilites` - Liste des civilités
- `GET /v1/parametres/origines-contact` - Liste des origines de contact
- `GET /v1/utilisateurs` - Liste des utilisateurs
- `GET /v1/parametres/type-adresse` - Liste des types d'adresse
- `GET /v1/parametres/type-telephone` - Liste des types de téléphone
- `GET /v1/parametres/questions-complementaires` - Liste des questions complémentaires
- `GET /v1/parametres/regroupements` - Liste des regroupements
- `GET /v1/parametres/client-statuts` - Liste des statuts clients

## Dépendances NPM

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.56.1"
  }
}
```

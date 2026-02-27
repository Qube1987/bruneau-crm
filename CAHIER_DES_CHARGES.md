# Cahier des Charges - CRM Bruneau Protection

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Modules fonctionnels](#modules-fonctionnels)
4. [Base de données](#base-de-données)
5. [Intégrations externes](#intégrations-externes)
6. [Guide de déploiement](#guide-de-déploiement)
7. [Personnalisation et adaptation](#personnalisation-et-adaptation)

---

## Vue d'ensemble

### Objectif
Application CRM complète pour gérer le cycle de vie client d'une entreprise de sécurité, de la prospection à la fidélisation, avec optimisation de la valeur à vie client (LTV).

### Technologie
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Supabase Auth (email/password)
- **Hosting**: Netlify
- **Icons**: Lucide React
- **ERP**: Intégration Extrabat (API)

### Utilisateurs cibles
Entreprises de services B2B/B2C nécessitant :
- Gestion de prospects et opportunités commerciales
- Suivi de chantiers/projets
- Campagnes commerciales ciblées
- Fidélisation client et upselling

---

## Architecture technique

### Structure du projet
```
project/
├── src/
│   ├── components/          # Composants React
│   ├── services/           # Services API
│   │   ├── supabaseApi.ts  # API Supabase
│   │   ├── extrabatApi.ts  # API Extrabat
│   │   └── localApi.ts     # API locale (fallback)
│   ├── contexts/           # Contextes React
│   ├── hooks/              # Hooks personnalisés
│   ├── types/              # Types TypeScript
│   └── constants/          # Constantes
├── supabase/
│   ├── migrations/         # Migrations SQL
│   └── functions/          # Edge Functions
└── public/                 # Assets statiques
```

### Stack technique détaillée

#### Frontend
- **React 18.3.1**: Library UI
- **TypeScript 5.5.3**: Typage statique
- **Vite 5.4.2**: Build tool et dev server
- **TailwindCSS 3.4.1**: Framework CSS
- **Lucide React 0.344.0**: Bibliothèque d'icônes
- **XLSX 0.18.5**: Import/export Excel

#### Backend
- **Supabase**: BaaS complet
  - PostgreSQL 15
  - Row Level Security (RLS)
  - Edge Functions (Deno)
  - Storage (photos)
  - Realtime subscriptions

#### Intégrations
- **Extrabat API**: ERP de gestion
- **Email**: Via Edge Functions
- **SMS**: Via Edge Functions

---

## Modules fonctionnels

### 1. Authentification et sécurité

#### Fonctionnalités
- Connexion email/password
- Gestion de session
- Déconnexion

#### Sécurité
- Row Level Security (RLS) sur toutes les tables
- Authentification requise pour toutes les opérations
- Les utilisateurs ne voient que leurs données ou celles de leur équipe

#### Implémentation
```typescript
// Contexte d'authentification
- AuthContext.tsx: Gestion de l'état d'authentification
- LoginForm.tsx: Formulaire de connexion
```

#### Base de données
```sql
-- Table salarie_users (gérée par Supabase Auth)
- id: UUID (primary key)
- email: text
- display_name: text
- extrabat_id: integer (lien avec ERP)
```

---

### 2. Gestion des prospects

#### Fonctionnalités
- Création manuelle de prospects
- Import massif depuis Excel
- Import depuis Extrabat (clients ERP)
- Recherche et filtrage
- Fiche détaillée avec historique
- Gestion des contacts multiples
- Actions commerciales (maintenance, télésurveillance, parrainage, avis Google)

#### Composants
- `ProspectionForm.tsx`: Liste et recherche
- `ProspectForm.tsx`: Création/édition
- `ProspectDetailsModal.tsx`: Vue détaillée
- `ProspectQuickModal.tsx`: Création rapide
- `ProspectImportModal.tsx`: Import Excel
- `ActionsCommercialesForm.tsx`: Gestion des actions commerciales

#### Base de données
```sql
-- Table prospects
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extrabat_id INTEGER UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  civilite TEXT,
  origine_contact TEXT,
  activite TEXT,
  suivi_par TEXT NOT NULL,
  source TEXT, -- 'fidelisation', 'devis', 'prospection', 'actions_commerciales', 'campagne'
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMPTZ DEFAULT now(),
  date_modification TIMESTAMPTZ DEFAULT now()
);

-- Table prospect_contacts (contacts multiples)
CREATE TABLE prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT,
  fonction TEXT,
  email TEXT,
  telephone TEXT,
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table prospect_interactions
CREATE TABLE prospect_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'appel', 'email', 'visite', 'autre'
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  utilisateur TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table prospect_types_ouvrages
CREATE TABLE prospect_types_ouvrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  type_ouvrage TEXT NOT NULL,
  statut TEXT NOT NULL, -- 'possede', 'interesse', 'pas_interesse'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table prospect_actions_commerciales
CREATE TABLE prospect_actions_commerciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  contrat_maintenance TEXT NOT NULL, -- 'a_proposer', 'propose', 'accepte', 'refuse', 'deja_sous_contrat'
  telesurveillance TEXT NOT NULL,
  parrainage TEXT NOT NULL,
  avis_google TEXT NOT NULL, -- 'solliciter', 'deja_fait'
  commentaires TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### RLS Policies
```sql
-- Les utilisateurs authentifiés peuvent lire tous les prospects
CREATE POLICY "Users can view prospects"
  ON prospects FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les utilisateurs authentifiés peuvent créer
CREATE POLICY "Users can create prospects"
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Les utilisateurs peuvent modifier les prospects qu'ils suivent
CREATE POLICY "Users can update own prospects"
  ON prospects FOR UPDATE
  TO authenticated
  USING (suivi_par = auth.jwt()->>'email' OR suivi_par = auth.jwt()->>'display_name');
```

---

### 3. Gestion des opportunités

#### Fonctionnalités
- Création à partir d'un prospect
- Saisie rapide pour opportunités simples
- Suivi du statut commercial (pipeline)
- Interactions (appels, emails, visites, RDV)
- Prise de rendez-vous avec assignation technicien
- Galerie photos
- Passage en chantier
- Export vers devis Extrabat
- Marquage prioritaire
- Archivage

#### Statuts de l'opportunité
1. À contacter
2. Contacté
3. Recueil besoin
4. Rédaction devis
5. Devis transmis
6. Relance 1, 2, 3
7. Standby
8. Gagné → Passage en chantier
9. Perdu → Clôture
10. Archive

#### Composants
- `OpportunitiesList.tsx`: Liste et pipeline
- `OpportunityModal.tsx`: Création complète
- `OpportunityQuickModal.tsx`: Saisie rapide
- `OpportunityEditModal.tsx`: Édition
- `InteractionModal.tsx`: Nouvelle interaction
- `InteractionEditModal.tsx`: Édition interaction
- `PhotoGallery.tsx`: Galerie photos
- `PhotoUpload.tsx`: Upload photos
- `SendToDevisModal.tsx`: Export Extrabat

#### Base de données
```sql
-- Table opportunites
CREATE TABLE opportunites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  extrabat_id INTEGER UNIQUE,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  commentaires TEXT,
  statut TEXT NOT NULL,
  suivi_par TEXT NOT NULL,
  montant_estime DECIMAL,
  date_travaux_estimee DATE,
  date_creation TIMESTAMPTZ DEFAULT now(),
  date_modification TIMESTAMPTZ DEFAULT now(),
  date_cloture TIMESTAMPTZ,
  statut_final TEXT, -- 'succes', 'abandon', 'echec'
  archive BOOLEAN DEFAULT false,
  prioritaire BOOLEAN DEFAULT false,
  saisie_rapide BOOLEAN DEFAULT false
);

-- Table interactions
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id UUID REFERENCES opportunites(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'telephonique', 'physique', 'mail'
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  date_rdv_debut TIMESTAMPTZ,
  date_rdv_fin TIMESTAMPTZ,
  rdv_user_id TEXT, -- Technicien assigné au RDV
  utilisateur TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table opportunite_photos
CREATE TABLE opportunite_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id UUID REFERENCES opportunites(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Storage Bucket
```sql
-- Bucket pour les photos d'opportunités
INSERT INTO storage.buckets (id, name, public)
VALUES ('opportunite-photos', 'opportunite-photos', false);

-- Politique d'accès
CREATE POLICY "Users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'opportunite-photos');

CREATE POLICY "Users can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'opportunite-photos');
```

---

### 4. Gestion des chantiers

#### Fonctionnalités
- Création automatique depuis opportunité gagnée
- Création manuelle
- Suivi des étapes :
  1. Commande passée
  2. Commande reçue
  3. Chantier planifié
  4. Chantier réalisé
- Gestion des interventions multiples
- Enregistrement temps techniciens
- Synchronisation avec Extrabat (rendez-vous)
- Finalisation → Passage en LTV
- Consignes techniques

#### Composants
- `ChantiersPage.tsx`: Liste et gestion
- `ChantierManualModal.tsx`: Création manuelle
- `ChantierPlanificationModal.tsx`: Planification

#### Base de données
```sql
-- Table chantiers
CREATE TABLE chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunite_id UUID REFERENCES opportunites(id) ON DELETE CASCADE,
  consignes TEXT,
  commande_passee BOOLEAN DEFAULT false,
  commande_recue BOOLEAN DEFAULT false,
  chantier_planifie BOOLEAN DEFAULT false,
  chantier_realise BOOLEAN DEFAULT false,
  date_commande_passee TIMESTAMPTZ,
  date_commande_recue TIMESTAMPTZ,
  date_chantier_planifie TIMESTAMPTZ,
  date_chantier_realise TIMESTAMPTZ,
  statut TEXT NOT NULL, -- 'en_cours', 'finalise'
  date_finalisation TIMESTAMPTZ,
  ltv_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table chantier_interventions
CREATE TABLE chantier_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  technician_ids TEXT[] NOT NULL,
  notes TEXT,
  extrabat_appointment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 5. Optimisation de la Valeur à Vie (LTV)

#### Concept
Maximiser la valeur d'un client après l'installation initiale via 4 leviers :
1. **Réputation** : Avis Google, appels satisfaction
2. **Parrainage** : Programme de recommandation
3. **Contrats récurrents** : Maintenance, télésurveillance
4. **Upsell technique** : Produits additionnels

#### Fonctionnalités
- Création automatique d'un plan d'actions à la finalisation
- Suivi des actions par catégorie
- Scoring automatique (0-13 points)
- Envoi d'emails personnalisés
- Tracking des dates de proposition
- Alertes de relance (30 jours)
- Filtres avancés
- Vue résumée sur cartes pliées

#### Score LTV
- **8-13 points** : Client optimisé (vert)
- **4-7 points** : Partiellement optimisé (jaune)
- **0-3 points** : Potentiel inexploité (rouge)

#### Actions et points

**Réputation (3 points max)**
- Demande avis Google envoyée (0.5 pt)
- Avis Google reçu (1 pt)
- Avis répondu publiquement (0.5 pt)
- Appel satisfaction fait (1 pt)

**Parrainage (3 points max)**
- Programme proposé (0.5 pt)
- Parrainages obtenus (0.5 pt par parrainage, max 2.5 pts)

**Contrats récurrents (4 points max)**
- Contrat maintenance proposé (0.5 pt)
- Contrat maintenance signé (1.5 pt)
- Télésurveillance proposée (0.5 pt)
- Télésurveillance active (1.5 pt)

**Upsell technique (3 points max)**
- Détecteurs extérieurs proposés (0.25 pt)
- Détecteurs extérieurs installés (0.25 pt)
- Détecteurs incendie proposés (0.25 pt)
- Détecteurs incendie installés (0.25 pt)
- Boules Block'Fire proposées (0.25 pt)
- Boules Block'Fire installées (0.25 pt)
- Détection inondation proposée (0.25 pt)
- Détection inondation installée (0.25 pt)
- Électrovanne proposée (0.25 pt)
- Électrovanne installée (0.75 pt)

#### Composants
- `ValeurAViePage.tsx`: Liste et gestion
- `LtvChantierCard.tsx`: Détail des actions
- `LtvManualModal.tsx`: Création manuelle
- `AvisGoogleEmailModal.tsx`: Email avis
- `ParrainageEmailModal.tsx`: Email parrainage
- `ContratMaintenanceEmailModal.tsx`: Email maintenance
- `TelesurveillanceEmailModal.tsx`: Email télésurveillance

#### Base de données
```sql
-- Table ltv_actions
CREATE TABLE ltv_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL, -- 'reputation', 'parrainage', 'contrat_recurrent', 'upsell'
  action TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_faire', -- 'a_faire', 'en_cours', 'fait', 'refus'
  date_action TIMESTAMPTZ,
  date_proposition TIMESTAMPTZ, -- Date où l'action a été proposée
  date_echeance TIMESTAMPTZ,
  commentaires TEXT DEFAULT '',
  parrainages_obtenus INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Edge Functions Email
```typescript
// send-avis-google-email
// send-parrainage-email
// send-contrat-maintenance-email
// send-telesurveillance-email

// Structure commune
{
  to: string,
  clientName: string,
  // ... données spécifiques
}
```

#### Logique de relance 30 jours
- Si une action "proposée" a été marquée comme faite il y a plus de 30 jours
- Badge orange "À relancer" sur la carte
- Filtre dédié "À relancer (+30j)"
- Contour orange sur la carte

---

### 6. Campagnes commerciales

#### Fonctionnalités
- Création de campagnes thématiques
- Import prospects depuis Excel
- Association clients Extrabat
- Suivi des montants ciblés
- Statuts : À contacter, Contacté, Transformé, Décliné
- Statistiques en temps réel
- Conversion automatique en opportunités

#### Composants
- `CampaignPage.tsx`: Gestion des campagnes
- `CampaignModal.tsx`: Création/édition
- `CampaignProspectModal.tsx`: Ajout prospect
- `CampaignProspectImportModal.tsx`: Import Excel

#### Base de données
```sql
-- Table campagnes_commerciales
CREATE TABLE campagnes_commerciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  objectif_montant DECIMAL NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table campagne_prospects
CREATE TABLE campagne_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id UUID REFERENCES campagnes_commerciales(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id),
  client_extrabat_id INTEGER,
  client_nom TEXT NOT NULL,
  montant DECIMAL NOT NULL,
  commentaires TEXT,
  statut TEXT NOT NULL DEFAULT 'a_contacter', -- 'a_contacter', 'contacte', 'transforme', 'decline'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. Actions de prospection

#### Fonctionnalités
- Liste de tâches de prospection
- Assignation à un responsable
- Statuts : À contacter, Contacté
- Commentaires et suivi
- Liaison avec prospects

#### Composants
- `ProspectionForm.tsx`: Section actions
- `ProspectionActionModal.tsx`: Création/édition

#### Base de données
```sql
-- Table prospection_actions
CREATE TABLE prospection_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsable TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_contacter', -- 'a_contacter', 'contacte'
  commentaires TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Base de données

### Vue d'ensemble de l'architecture

```
salarie_users (Auth)
    ↓ (suivi_par)
prospects
    ↓ (prospect_id)
    ├── prospect_contacts
    ├── prospect_interactions
    ├── prospect_types_ouvrages
    ├── prospect_actions_commerciales
    └── opportunites
            ↓ (opportunite_id)
            ├── interactions
            ├── opportunite_photos
            └── chantiers
                    ↓ (chantier_id)
                    ├── chantier_interventions
                    └── ltv_actions

campagnes_commerciales
    ↓ (campagne_id)
    └── campagne_prospects

prospection_actions
```

### Migrations importantes

#### Migration 1 : Tables de base
```sql
-- prospects, opportunites, interactions
-- Voir supabase/migrations/20250902075431_lively_poetry.sql
```

#### Migration 2 : Actions commerciales
```sql
-- prospect_types_ouvrages, prospect_actions_commerciales
-- Voir supabase/migrations/20250903*
```

#### Migration 3 : Chantiers
```sql
-- chantiers, chantier_interventions
-- Voir supabase/migrations/20260202104144_create_chantiers_table.sql
```

#### Migration 4 : LTV
```sql
-- ltv_actions, ltv_score
-- Voir supabase/migrations/20260216135430_create_ltv_optimization_module.sql
```

#### Migration 5 : Campagnes
```sql
-- campagnes_commerciales, campagne_prospects
-- Voir supabase/migrations/20260211131923_create_campagnes_commerciales_tables.sql
```

### Principes de sécurité RLS

**Règles générales** :
1. Toutes les tables ont RLS activé
2. Lecture : authentifié = accès
3. Écriture : authentifié + propriété/assignation
4. Utiliser `auth.jwt()->>'email'` ou `auth.jwt()->>'display_name'`
5. Jamais de `USING (true)` sans vérification

**Exemple type** :
```sql
-- Lecture
CREATE POLICY "Users can view"
  ON table_name FOR SELECT
  TO authenticated
  USING (true);

-- Création
CREATE POLICY "Users can create"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.jwt()->>'email');

-- Mise à jour
CREATE POLICY "Users can update own"
  ON table_name FOR UPDATE
  TO authenticated
  USING (owner = auth.jwt()->>'email')
  WITH CHECK (owner = auth.jwt()->>'email');
```

---

## Intégrations externes

### Intégration Extrabat

#### Qu'est-ce qu'Extrabat ?
ERP de gestion pour entreprises du bâtiment (clients, devis, factures, planning).

#### Endpoints utilisés

**1. Récupération des clients**
```
GET /clients
→ Liste tous les clients avec détails
```

**2. Récupération d'un client**
```
GET /clients/{id}
→ Détails complets d'un client
```

**3. Création d'un devis**
```
POST /devis
Body: {
  clientId: number,
  description: string,
  montant: number,
  ...
}
```

**4. Récupération des rendez-vous**
```
GET /appointments
→ Planning des techniciens
```

**5. Récupération des salariés**
```
GET /salaries
→ Liste des techniciens
```

#### Configuration
```typescript
// services/extrabatApi.ts
const EXTRABAT_API_URL = import.meta.env.VITE_EXTRABAT_API_URL;
const EXTRABAT_API_KEY = import.meta.env.VITE_EXTRABAT_API_KEY;

// Edge Function proxy pour sécuriser les appels
// supabase/functions/extrabat-proxy/index.ts
```

#### Fichiers concernés
- `services/extrabatApi.ts`: Appels API
- `services/extrabatParametersService.ts`: Paramètres Extrabat
- `supabase/functions/extrabat-proxy/index.ts`: Proxy sécurisé

#### Adaptation pour un autre ERP
1. Créer un nouveau service `autreErpApi.ts`
2. Mapper les fonctions :
   - `getClients()` → récupération clients
   - `getClient(id)` → détail client
   - `createDevis()` → création devis
   - `getSalaries()` → liste techniciens
3. Remplacer les imports dans les composants
4. Adapter les types TypeScript

---

### Edge Functions

#### 1. Proxy Extrabat
```typescript
// supabase/functions/extrabat-proxy/index.ts
// Sécurise les appels à l'API Extrabat
// Évite d'exposer les clés API côté client
```

#### 2. Envoi d'emails
```typescript
// send-avis-google-email
// send-parrainage-email
// send-contrat-maintenance-email
// send-telesurveillance-email
// send-ppms-email (Plan Particulier de Mise en Sûreté)
```

#### 3. Envoi de SMS
```typescript
// send-sms-notification
// Utilisé pour les rappels et notifications
```

#### Déploiement
```bash
# Via l'outil de déploiement intégré
# Les fonctions sont automatiquement déployées depuis le code
```

#### CORS
Toutes les Edge Functions incluent :
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

---

## Guide de déploiement

### Prérequis
- Compte Supabase
- Compte Netlify (ou autre hébergeur)
- Node.js 18+
- NPM ou Yarn

### Étape 1 : Configuration Supabase

1. **Créer un projet Supabase**
   - Aller sur supabase.com
   - Créer un nouveau projet
   - Noter l'URL et la clé API

2. **Exécuter les migrations**
   - Aller dans SQL Editor
   - Exécuter les migrations dans l'ordre (dossier `supabase/migrations/`)
   - Vérifier que toutes les tables sont créées

3. **Créer les buckets Storage**
   ```sql
   -- Bucket photos opportunités
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('opportunite-photos', 'opportunite-photos', false);

   -- Bucket assets application
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('app-assets', 'app-assets', true);
   ```

4. **Créer les utilisateurs**
   - Aller dans Authentication
   - Ajouter les utilisateurs manuellement
   - Ou créer un formulaire d'inscription

5. **Déployer les Edge Functions**
   - Les fonctions sont déployées via l'interface Supabase
   - Vérifier que toutes les fonctions sont actives

### Étape 2 : Configuration du projet

1. **Cloner le projet**
   ```bash
   git clone [votre-repo]
   cd project
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Créer le fichier .env**
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon
   VITE_EXTRABAT_API_URL=https://api-extrabat.com
   VITE_EXTRABAT_API_KEY=votre-cle-extrabat
   ```

4. **Tester en local**
   ```bash
   npm run dev
   # Ouvrir http://localhost:5173
   ```

### Étape 3 : Déploiement Netlify

1. **Créer un site Netlify**
   - Connecter le repository Git
   - Ou drag & drop le dossier `dist`

2. **Configuration build**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Variables d'environnement**
   - Ajouter les mêmes variables que le .env local
   - Dans Site settings > Environment variables

4. **Redirections**
   - Le fichier `public/_redirects` gère le routing SPA
   ```
   /*    /index.html   200
   ```

5. **Déployer**
   ```bash
   npm run build
   netlify deploy --prod
   ```

### Étape 4 : Configuration post-déploiement

1. **URLs autorisées dans Supabase**
   - Authentication > URL Configuration
   - Ajouter l'URL Netlify

2. **Tester l'authentification**
   - Se connecter sur le site
   - Vérifier que les données se chargent

3. **Tester les Edge Functions**
   - Envoyer un email de test
   - Vérifier les logs dans Supabase

---

## Personnalisation et adaptation

### Adapter à votre entreprise

#### 1. Branding

**Logo et favicon**
```
public/
  ├── favicon.svg          # Remplacer par votre favicon
  └── logo.png            # Remplacer par votre logo
```

**Couleurs**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#votre-couleur',
        secondary: '#votre-couleur',
      }
    }
  }
}
```

**Nom de l'entreprise**
```typescript
// src/constants/index.ts
export const COMPANY_NAME = 'Votre Entreprise';
export const APP_NAME = 'Votre CRM';
```

#### 2. Modules métier

**Champs personnalisés**
```sql
-- Ajouter des colonnes aux tables existantes
ALTER TABLE prospects ADD COLUMN votre_champ TEXT;
```

**Nouveaux statuts**
```typescript
// src/types/index.ts
export type StatutOpportunite =
  | 'a-contacter'
  | 'votre-statut'
  | 'autre-statut';
```

**Actions LTV personnalisées**
```sql
-- Modifier les actions dans la table ltv_actions
-- Adapter le scoring dans src/services/supabaseApi.ts
```

#### 3. Intégrations

**Remplacer Extrabat**
1. Créer `services/votreErpApi.ts`
2. Implémenter les fonctions nécessaires
3. Remplacer les imports
4. Adapter les types

**Ajouter une intégration**
```typescript
// services/nouvelleIntegration.ts
export const nouvelleIntegrationApi = {
  async getData() {
    // Votre logique
  }
};
```

#### 4. Edge Functions

**Email personnalisé**
```typescript
// supabase/functions/votre-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { to, data } = await req.json();

  // Votre template email
  const html = `
    <h1>Votre template</h1>
    <p>${data.message}</p>
  `;

  // Envoyer l'email
  // ... logique d'envoi

  return new Response(JSON.stringify({ success: true }));
});
```

#### 5. Permissions et rôles

**Ajouter des rôles**
```sql
-- Ajouter une colonne role à salarie_users
ALTER TABLE salarie_users ADD COLUMN role TEXT DEFAULT 'user';

-- Adapter les policies RLS
CREATE POLICY "Admins can do anything"
  ON table_name
  TO authenticated
  USING (
    (SELECT role FROM salarie_users WHERE id = auth.uid()) = 'admin'
  );
```

#### 6. Rapports et statistiques

**Dashboard personnalisé**
```typescript
// src/components/Dashboard.tsx
export const Dashboard = () => {
  // Vos KPIs
  const [stats, setStats] = useState({
    totalProspects: 0,
    opportunitesGagnees: 0,
    chiffreAffaires: 0,
  });

  // Votre logique de calcul

  return (
    <div>
      {/* Vos graphiques */}
    </div>
  );
};
```

---

## Maintenance et évolution

### Bonnes pratiques

1. **Migrations**
   - Toujours créer une migration pour les changements de schéma
   - Tester en local avant production
   - Garder un historique des migrations

2. **RLS**
   - Ne jamais désactiver RLS
   - Tester les policies avec différents utilisateurs
   - Documenter les règles d'accès

3. **Types TypeScript**
   - Synchroniser avec le schéma de base de données
   - Utiliser les types générés par Supabase si possible

4. **Edge Functions**
   - Logger les erreurs
   - Gérer les timeouts
   - Valider les entrées

5. **Performance**
   - Créer des index sur les colonnes fréquemment requêtées
   - Paginer les grandes listes
   - Utiliser les subscriptions Realtime avec parcimonie

### Monitoring

**Supabase Dashboard**
- API Usage
- Database Size
- Edge Functions Logs
- Auth Users

**Netlify Analytics**
- Page Views
- Load Time
- Bandwidth

### Backup

**Base de données**
```bash
# Export manuel depuis Supabase
# Settings > Database > Backup

# Ou via CLI
supabase db dump -f backup.sql
```

**Code**
- Repository Git
- Branches par environnement (dev, staging, prod)

---

## Support et documentation

### Documentation technique
- **Supabase**: https://supabase.com/docs
- **React**: https://react.dev
- **TailwindCSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

### Structure du code
- Commentaires en français
- Nommage explicite des fonctions
- Séparation des responsabilités (composants, services, types)

### Ressources
- `DATABASE_CONFIG.md`: Configuration base de données
- `SUPABASE_CONFIG.md`: Configuration Supabase
- `GUIDE_UTILISATION.md`: Guide utilisateur
- `EXTRABAT_INTEGRATION_PACKAGE.md`: Détails intégration Extrabat

---

## Glossaire

- **CRM**: Customer Relationship Management
- **LTV**: Lifetime Value (Valeur à Vie)
- **RLS**: Row Level Security
- **ERP**: Enterprise Resource Planning
- **Edge Function**: Fonction serverless exécutée à la périphérie
- **Pipeline**: Processus de qualification des opportunités
- **Upsell**: Vente additionnelle
- **Bucket**: Conteneur de stockage de fichiers

---

## Licence et crédits

Application développée pour Bruneau Protection.
Stack: React + TypeScript + Supabase + TailwindCSS

**Adaptable et personnalisable** pour toute entreprise de services B2B/B2C.

---

*Document mis à jour le 18/02/2026*
*Version 1.0*
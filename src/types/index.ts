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

export type StatutOpportunite = 
  | 'a-contacter'
  | 'contacte'
  | 'recueil-besoin'
  | 'redaction-devis'
  | 'devis-transmis'
  | 'relance-1'
  | 'relance-2'
  | 'relance-3'
  | 'standby'
  | 'gagne'
  | 'perdu'
  | 'archive';

export type TypeInteraction = 'telephonique' | 'physique' | 'mail';

export type StatutCloture = 'succes' | 'abandon' | 'echec';

export interface Interaction {
  id: string;
  opportuniteId: string;
  type: TypeInteraction;
  description: string;
  date: string;
  date_rdv_debut?: string;
  date_rdv_fin?: string;
  utilisateurId: number;
  utilisateur?: User;
}

export interface Opportunite {
  id: string;
  clientId: number;
  client?: Client;
  titre: string;
  description: string;
  statut: StatutOpportunite;
  suiviParId: number;
  suiviPar?: User;
  dateCreation: string;
  dateModification: string;
  dateCloture?: string;
  statutCloture?: StatutCloture;
  interactions: Interaction[];
  montantEstime?: number;
}

export type StatutTypeOuvrage = 'possede' | 'interesse' | 'pas_interesse';
export type StatutActionCommerciale = 'a_proposer' | 'propose' | 'accepte' | 'refuse' | 'deja_sous_contrat';
export type StatutParrainage = 'a_proposer' | 'propose' | 'accepte' | 'refuse';
export type StatutAvisGoogle = 'solliciter' | 'deja_fait';

export interface ProspectTypeOuvrage {
  id: string;
  client_id: string;
  type_ouvrage: string;
  statut: StatutTypeOuvrage;
  created_at: string;
  updated_at: string;
}

export interface ProspectActionCommerciale {
  id: string;
  client_id: string;
  contrat_maintenance: StatutActionCommerciale;
  telesurveillance: StatutActionCommerciale;
  parrainage: StatutParrainage;
  avis_google: StatutAvisGoogle;
  commentaires: string;
  created_at: string;
  updated_at: string;
}

export type StatutCampagneProspect = 'a_contacter' | 'contacte' | 'transforme' | 'decline';

export interface CampagneCommerciale {
  id: string;
  titre: string;
  description: string;
  objectif_montant: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CampagneProspect {
  id: string;
  campagne_id: string;
  client_id?: string;
  extrabat_id: number | null;
  client_nom: string;
  montant: number;
  commentaires: string;
  statut: StatutCampagneProspect;
  created_at: string;
  updated_at: string;
}
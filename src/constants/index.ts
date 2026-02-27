export const CIVILITES_OPTIONS = [
  { value: '', label: '' },
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'M. & Mme', label: 'M. & Mme' },
  { value: 'Sté', label: 'Sté' },
  { value: 'Commune', label: 'Commune' },
];

export const ORIGINES_CONTACT = [
  'ADEL',
  'Agence',
  'Ajax',
  'Agents immo',
  'BNI externe',
  'BNI interne',
  'Bontems',
  'Bouche à oreille',
  'Camion',
  'Cartes de visite dans commerces',
  'Cedric Costes',
  'Facebook',
  'Google',
  'Hervé Ruel',
  'JC Herbin',
  'Journaux locaux',
  'Oliv Elec',
  'Pages jaunes',
  'Panneaux',
  'Paul Picard',
  'Presse',
  'Prospection',
  'Proxeo',
  'Réseau perso',
  'Richard Blanchet',
  'Salons',
  'Securitas',
  'SNA',
  'Thierry Petitpas',
  'Vernonnaise du bâtiment',
  'Avant Extrabat',
];

export const SUIVI_PAR_OPTIONS = [
  { value: 'Hugo', label: 'Hugo' },
  { value: 'Quentin', label: 'Quentin' },
  { value: 'Cindy', label: 'Cindy' },
  { value: 'Paul', label: 'Paul' },
];

export const STATUTS_OPPORTUNITE = [
  { value: 'a-contacter', label: 'À contacter', color: 'bg-red-100 text-red-800' },
  { value: 'contacte', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'recueil-besoin', label: 'Recueil du besoin', color: 'bg-blue-100 text-blue-800' },
  { value: 'redaction-devis', label: 'Rédaction du devis', color: 'bg-purple-100 text-purple-800' },
  { value: 'devis-transmis', label: 'Devis transmis', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'relance-1', label: 'Relance 1', color: 'bg-orange-100 text-orange-800' },
  { value: 'relance-2', label: 'Relance 2', color: 'bg-red-200 text-red-900' },
  { value: 'relance-3', label: 'Relance 3', color: 'bg-red-300 text-red-900' },
] as const;

export const TYPES_INTERACTION = [
  { value: 'telephonique', label: 'Téléphonique', icon: '📞' },
  { value: 'physique', label: 'Physique', icon: '🤝' },
  { value: 'mail', label: 'Email', icon: '📧' },
] as const;

export const STATUTS_CLOTURE = [
  { value: 'succes', label: 'Succès', color: 'bg-green-100 text-green-800' },
  { value: 'abandon', label: 'Abandon du projet', color: 'bg-gray-100 text-gray-800' },
  { value: 'echec', label: 'Échec', color: 'bg-red-100 text-red-800' },
] as const;

export const STATUTS_FINAUX = [
  { value: 'gagne', label: 'Gagné!', color: 'bg-green-500 text-white' },
  { value: 'perdu', label: 'Perdu', color: 'bg-red-500 text-white' },
  { value: 'standby', label: 'En cours', color: 'bg-gray-500 text-white' },
] as const;

export const TYPES_OUVRAGE = [
  'Alarme intrusion',
  'Vidéosurveillance',
  'Contrôle d\'accès',
  'Sécurité incendie',
  'Interphone',
  'Automatisme'
] as const;

export const STATUTS_TYPE_OUVRAGE = [
  { value: 'possede', label: 'Possède', color: 'bg-green-100 text-green-800' },
  { value: 'interesse', label: 'Intéressé', color: 'bg-blue-100 text-blue-800' },
  { value: 'pas_interesse', label: 'Pas intéressé', color: 'bg-gray-100 text-gray-800' },
] as const;

export const STATUTS_ACTION_COMMERCIALE = [
  { value: 'a_proposer', label: 'À proposer' },
  { value: 'propose', label: 'Proposé' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
  { value: 'deja_sous_contrat', label: 'Déjà sous contrat' },
] as const;

export const STATUTS_PARRAINAGE = [
  { value: 'a_proposer', label: 'À proposer' },
  { value: 'propose', label: 'Proposé' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
] as const;

export const STATUTS_AVIS_GOOGLE = [
  { value: 'solliciter', label: 'Solliciter' },
  { value: 'deja_fait', label: 'Déjà fait' },
] as const;
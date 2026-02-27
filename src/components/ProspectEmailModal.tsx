import React, { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';

interface Prospect {
  id: string;
  nom: string;
  prenom?: string;
  email?: string;
  entreprise?: string;
  civilite?: string;
}

interface ProspectEmailModalProps {
  prospect: Prospect;
  onClose: () => void;
}

type EmailType = 'avis_google' | 'contrat_maintenance' | 'parrainage' | 'telesurveillance' | 'ppms';

interface EmailOption {
  value: EmailType;
  label: string;
  description: string;
}

const emailOptions: EmailOption[] = [
  {
    value: 'avis_google',
    label: 'Demande d\'avis Google',
    description: 'Invitation à laisser un avis sur Google',
  },
  {
    value: 'contrat_maintenance',
    label: 'Contrat de maintenance',
    description: 'Proposition de contrat d\'entretien régulier',
  },
  {
    value: 'parrainage',
    label: 'Offre de parrainage',
    description: 'Programme de parrainage avec avantages',
  },
  {
    value: 'telesurveillance',
    label: 'Télésurveillance',
    description: 'Proposition de service de télésurveillance',
  },
  {
    value: 'ppms',
    label: 'Solution PPMS',
    description: 'Alerte PPMS pour établissements scolaires',
  },
];

const ProspectEmailModal: React.FC<ProspectEmailModalProps> = ({ prospect, onClose }) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailType>('avis_google');
  const [customEmail, setCustomEmail] = useState(prospect.email || '');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!customEmail) {
      alert('Veuillez saisir une adresse email');
      return;
    }

    setIsSending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let endpoint = '';
      let body = {};

      switch (selectedEmail) {
        case 'avis_google':
          endpoint = 'send-avis-google-email';
          body = {
            to: customEmail,
            clientName: prospect.nom,
            clientFirstName: prospect.prenom,
          };
          break;
        case 'contrat_maintenance':
          endpoint = 'send-contrat-maintenance-email';
          body = {
            to: customEmail,
            clientName: prospect.nom,
            clientFirstName: prospect.prenom,
          };
          break;
        case 'parrainage':
          endpoint = 'send-parrainage-email';
          body = {
            to: customEmail,
            clientName: prospect.nom,
            clientFirstName: prospect.prenom,
          };
          break;
        case 'telesurveillance':
          endpoint = 'send-telesurveillance-email';
          body = {
            to: customEmail,
            clientName: prospect.nom,
            clientFirstName: prospect.prenom,
          };
          break;
        case 'ppms':
          endpoint = 'send-ppms-email';
          body = {
            to: customEmail,
            prospectName: prospect.nom,
            civilite: prospect.civilite,
            etablissement: prospect.entreprise,
          };
          break;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      alert('Email envoyé avec succès !');
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsSending(false);
    }
  };

  const selectedOption = emailOptions.find(opt => opt.value === selectedEmail);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Envoyer un email</h2>
              <p className="text-sm text-gray-600">
                {prospect.prenom} {prospect.nom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@exemple.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'email
            </label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value as EmailType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {emailOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedOption && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedOption.description}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Contenu de l'email</h3>
            <p className="text-sm text-blue-800">
              {selectedEmail === 'avis_google' && 'Le prospect recevra une invitation chaleureuse à partager son expérience avec un avis Google.'}
              {selectedEmail === 'contrat_maintenance' && 'Le prospect recevra une proposition détaillée de contrat d\'entretien incluant tous les avantages (piles, déplacements, support...).'}
              {selectedEmail === 'parrainage' && 'Le prospect recevra une présentation du programme de parrainage avec les avantages pour lui et ses filleuls.'}
              {selectedEmail === 'telesurveillance' && 'Le prospect recevra une présentation complète du service de télésurveillance avec réactivité 24/7.'}
              {selectedEmail === 'ppms' && 'Le prospect recevra une présentation de la solution d\'alerte PPMS conforme à la réglementation 2028.'}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !customEmail}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Envoi en cours...' : 'Envoyer l\'email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProspectEmailModal;

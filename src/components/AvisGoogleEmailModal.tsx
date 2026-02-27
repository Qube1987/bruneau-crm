import React, { useState } from 'react';
import { X, Mail, Send, Copy, CheckCircle } from 'lucide-react';
import { Chantier, supabase } from '../services/supabaseApi';

interface AvisGoogleEmailModalProps {
  chantier: Chantier;
  onClose: () => void;
}

const AvisGoogleEmailModal: React.FC<AvisGoogleEmailModalProps> = ({ chantier, onClose }) => {
  const prospect = chantier.opportunite?.prospect;
  const [email, setEmail] = useState(prospect?.email || '');
  const [isSent, setIsSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleReviewLink = 'https://g.page/r/CbIcLjx6WVIwEB0/review';

  const emailSubject = 'Votre avis compte pour nous !';

  const emailBody = `Bonjour Madame, Monsieur ${prospect?.prenom || prospect?.nom || ''},

Nous tenons à vous remercier chaleureusement pour la confiance que vous nous avez accordée en choisissant Bruneau Protection pour votre projet de sécurité.

Votre satisfaction est notre priorité absolue, et nous espérons que notre intervention a pleinement répondu à vos attentes.

Votre avis est précieux pour nous et pour nos futurs clients. Pourriez-vous prendre quelques instants pour partager votre expérience sur Google ?

👉 Laissez votre avis en cliquant ici : ${googleReviewLink}

Ou scannez le QR code ci-joint avec votre smartphone pour accéder directement à la page d'avis.

Votre retour nous aide à améliorer constamment nos services et à accompagner d'autres clients dans leurs projets de protection.

Nous vous remercions par avance pour votre temps et votre soutien.

Cordialement,

L'équipe Bruneau Protection`;

  const handleSendEmail = async () => {
    if (!email) return;

    setIsSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-avis-google-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          to: email,
          prospectName: prospect?.nom,
          prospectFirstName: prospect?.prenom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de l\'email');
      }

      setIsSent(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = () => {
    const fullText = `${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(googleReviewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Demande d'avis Google</h2>
              <p className="text-sm text-gray-600">
                {prospect?.nom} {prospect?.prenom || ''}
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
              Email du destinataire
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">Aperçu du message</h3>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 text-sm"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copier le texte
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-3">Objet : {emailSubject}</p>
                <div className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                  {emailBody}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">Lien vers les avis Google</p>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copier le lien
                  </button>
                </div>
                <a
                  href={googleReviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm break-all"
                >
                  {googleReviewLink}
                </a>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-3">QR Code inclus dans l'email</p>
                <div className="flex justify-center">
                  <img
                    src="/Avis_Google_(1).png"
                    alt="QR Code Avis Google"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Ce QR code sera automatiquement joint à l'email
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  Erreur lors de l'envoi
                </p>
                <p className="text-red-700 text-sm mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {isSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">
                  Email envoyé avec succès !
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Le client devrait recevoir l'email de demande d'avis dans quelques instants.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSendEmail}
              disabled={!email || isSending || isSent}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : isSent ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Email envoyé
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer l'email
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Fermer
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> L'email sera envoyé directement depuis l'application avec le QR code inclus en pièce jointe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisGoogleEmailModal;

import React, { useState } from 'react';
import { X, Mail, Send, Copy, CheckCircle, Gift } from 'lucide-react';
import { Chantier, supabase } from '../services/supabaseApi';

interface ParrainageEmailModalProps {
  chantier: Chantier;
  onClose: () => void;
}

const ParrainageEmailModal: React.FC<ParrainageEmailModalProps> = ({ chantier, onClose }) => {
  const prospect = chantier.opportunite?.prospect;
  const [email, setEmail] = useState(prospect?.email || '');
  const [isSent, setIsSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSubject = '🎁 Gagnez 100€ avec notre programme de parrainage !';

  const emailBody = `Bonjour Madame, Monsieur ${prospect?.prenom || prospect?.nom || ''},

En tant que client satisfait de Bruneau Protection, vous êtes notre meilleur ambassadeur !

Nous sommes heureux de vous proposer notre programme de parrainage exclusif qui récompense votre confiance.

🎁 VOS RÉCOMPENSES

Pour vous, le parrain :
Un cadeau d'une valeur de 100€ au choix :
- 🍽️ Un repas gastronomique à La Maison Pacel (Pacy-Sur-Eure)
- ⛽ Une carte carburant de 100€

Pour votre filleul :
Un avantage exclusif selon l'installation réalisée

COMMENT ÇA MARCHE ?

→ Parlez de Bruneau Protection à vos proches, famille, amis ou collègues
→ Ils nous contactent en mentionnant votre nom, ou vous pouvez, si vous le préférez, nous transmettre leurs coordonnées avec leur accord afin que nous les rappelions.
→ Une fois leur installation terminée, vous recevez votre récompense !

N'hésitez pas à partager nos coordonnées avec vos connaissances qui recherchent des solutions de sécurité professionnelles :

📞 Téléphone : 02 32 51 77 00
📧 Email : info@bruneau27.com

Plus vous parrainez, plus vous gagnez ! Il n'y a pas de limite au nombre de parrainages.

Merci de votre confiance et de votre fidélité !

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

      const response = await fetch(`${supabaseUrl}/functions/v1/send-parrainage-email`, {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-pink-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Programme de parrainage</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-lg p-6 border border-pink-200">
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
                  Le client devrait recevoir l'email de parrainage dans quelques instants.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSendEmail}
              disabled={!email || isSending || isSent}
              className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
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

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <p className="text-sm text-pink-800">
              <strong>Note :</strong> L'email sera envoyé directement depuis l'application avec les détails de l'offre de parrainage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParrainageEmailModal;

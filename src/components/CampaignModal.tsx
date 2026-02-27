import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CampagneCommerciale } from '../types';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CampagneCommerciale>) => Promise<void>;
  campaign?: CampagneCommerciale;
}

export default function CampaignModal({ isOpen, onClose, onSave, campaign }: CampaignModalProps) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [objectifMontant, setObjectifMontant] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (campaign) {
      setTitre(campaign.titre);
      setDescription(campaign.description || '');
      setObjectifMontant(campaign.objectif_montant?.toString() || '0');
    } else {
      setTitre('');
      setDescription('');
      setObjectifMontant('0');
    }
  }, [campaign]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      alert('Le titre est obligatoire');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        titre: titre.trim(),
        description: description.trim(),
        objectif_montant: parseFloat(objectifMontant) || 0,
      });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la campagne');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {campaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la campagne *
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Campagne emailing contrats de maintenance"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Décrivez les objectifs et le contexte de cette campagne..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objectif de chiffre d'affaires (€)
            </label>
            <input
              type="number"
              value={objectifMontant}
              onChange={(e) => setObjectifMontant(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enregistrement...' : campaign ? 'Modifier' : 'Créer la campagne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

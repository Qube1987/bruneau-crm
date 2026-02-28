import React, { useState, useEffect } from 'react';
import { Plus, Target, Edit2, Trash2 } from 'lucide-react';
import { CampagneCommerciale } from '../types';
import { supabase } from '../services/supabaseApi';
import CampaignModal from './CampaignModal';
import CampaignPage from './CampaignPage';

interface ActionsCommercialesFormProps {
  refreshTrigger: number;
}

const ActionsCommercialesForm: React.FC<ActionsCommercialesFormProps> = ({ refreshTrigger: _refreshTrigger }) => {
  const [campagnes, setCampagnes] = useState<CampagneCommerciale[]>([]);
  const [isLoadingCampagnes, setIsLoadingCampagnes] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampagneCommerciale | undefined>();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCampagnes();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadCampagnes = async () => {
    setIsLoadingCampagnes(true);
    try {
      const { data, error } = await supabase
        .from('campagnes_commerciales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampagnes(data || []);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
      setCampagnes([]);
    } finally {
      setIsLoadingCampagnes(false);
    }
  };

  const handleSaveCampaign = async (data: Partial<CampagneCommerciale>) => {
    if (!editingCampaign && !currentUserId) {
      alert("Impossible de créer la campagne : votre session utilisateur n'est pas identifiée. Veuillez vous reconnecter.");
      return;
    }

    try {
      if (editingCampaign) {
        const { error } = await supabase
          .from('campagnes_commerciales')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCampaign.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campagnes_commerciales')
          .insert({
            ...data,
            user_id: currentUserId,
          });

        if (error) throw error;
      }

      await loadCampagnes();
      setShowCampaignModal(false);
      setEditingCampaign(undefined);
    } catch (error: any) {
      console.error('Erreur sauvegarde campagne:', error);
      const message = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert(`Erreur lors de la sauvegarde de la campagne: ${message}`);
      throw error;
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ? Tous les prospects associés seront également supprimés.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campagnes_commerciales')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      await loadCampagnes();
    } catch (error) {
      console.error('Erreur suppression campagne:', error);
      alert('Erreur lors de la suppression de la campagne');
    }
  };

  if (selectedCampaignId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <CampaignPage
            campaignId={selectedCampaignId}
            onBack={() => setSelectedCampaignId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Campagnes Commerciales</h2>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900">
              Mes campagnes ({campagnes.length})
            </h3>
            <button
              onClick={() => {
                setEditingCampaign(undefined);
                setShowCampaignModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[48px] font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle campagne</span>
            </button>
          </div>

          {isLoadingCampagnes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des campagnes...</p>
            </div>
          ) : campagnes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">Aucune campagne pour le moment</p>
              <p className="text-gray-400 text-sm mb-4">
                Créez votre première campagne pour suivre vos actions commerciales
              </p>
              <button
                onClick={() => {
                  setEditingCampaign(undefined);
                  setShowCampaignModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer ma première campagne
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {campagnes.map((campagne) => (
                <div
                  key={campagne.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                  onClick={() => setSelectedCampaignId(campagne.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {campagne.titre}
                      </h4>
                      {campagne.description && (
                        <p className="text-gray-600 mb-3">{campagne.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(campagne);
                          setShowCampaignModal(true);
                        }}
                        className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Modifier"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campagne.id);
                        }}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Objectif: {campagne.objectif_montant.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="text-gray-400">
                      Créée le {new Date(campagne.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCampaignModal && (
        <CampaignModal
          isOpen={showCampaignModal}
          onClose={() => {
            setShowCampaignModal(false);
            setEditingCampaign(undefined);
          }}
          onSave={handleSaveCampaign}
          campaign={editingCampaign}
        />
      )}
    </div>
  );
};

export default ActionsCommercialesForm;

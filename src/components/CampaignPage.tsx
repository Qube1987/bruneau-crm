import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, TrendingUp, Target, DollarSign, Percent, Edit2, Trash2, Mail, Upload } from 'lucide-react';
import { supabase } from '../services/supabaseApi';
import type { CampagneCommerciale, CampagneProspect } from '../types';
import CampaignProspectModal from './CampaignProspectModal';
import CampaignProspectImportModal from './CampaignProspectImportModal';
import ProspectEmailModal from './ProspectEmailModal';

interface CampaignPageProps {
  campaignId: string;
  onBack: () => void;
}

export default function CampaignPage({ campaignId, onBack }: CampaignPageProps) {
  const [campaign, setCampaign] = useState<CampagneCommerciale | null>(null);
  const [prospects, setProspects] = useState<CampagneProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<CampagneProspect | undefined>();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedProspectForEmail, setSelectedProspectForEmail] = useState<any>(null);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);

      const { data: campaignData, error: campaignError } = await supabase
        .from('campagnes_commerciales')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      const { data: prospectsData, error: prospectsError } = await supabase
        .from('campagne_prospects')
        .select(`
          *,
          prospect:clients(
            id,
            nom,
            prenom,
            email,
            contacts:client_contacts(*)
          )
        `)
        .eq('campagne_id', campaignId)
        .order('created_at', { ascending: false });

      if (prospectsError) throw prospectsError;

      setCampaign(campaignData);
      setProspects(prospectsData || []);
    } catch (error) {
      console.error('Erreur chargement campagne:', error);
      alert('Erreur lors du chargement de la campagne');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProspect = async (data: Partial<CampagneProspect>) => {
    try {
      if (editingProspect) {
        const { error } = await supabase
          .from('campagne_prospects')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProspect.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campagne_prospects')
          .insert({
            campagne_id: campaignId,
            ...data,
          });

        if (error) throw error;
      }

      await loadCampaignData();
      setShowProspectModal(false);
      setEditingProspect(undefined);
    } catch (error) {
      console.error('Erreur sauvegarde prospect:', error);
      throw error;
    }
  };

  const handleDeleteProspect = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prospect de la campagne ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campagne_prospects')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      await loadCampaignData();
    } catch (error) {
      console.error('Erreur suppression prospect:', error);
      alert('Erreur lors de la suppression du prospect');
    }
  };

  const handleToggleStatut = async (prospect: CampagneProspect, newStatut: CampagneProspect['statut']) => {
    try {
      const { error } = await supabase
        .from('campagne_prospects')
        .update({
          statut: newStatut,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospect.id);

      if (error) throw error;

      await loadCampaignData();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">Campagne introuvable</div>
      </div>
    );
  }

  const totalProspects = prospects.length;
  const aContacter = prospects.filter(p => p.statut === 'a_contacter').length;
  const contacte = prospects.filter(p => p.statut === 'contacte').length;
  const transforme = prospects.filter(p => p.statut === 'transforme').length;
  const decline = prospects.filter(p => p.statut === 'decline').length;

  const montantTotal = prospects.reduce((sum, p) => sum + (parseFloat(p.montant as any) || 0), 0);
  const montantTransforme = prospects
    .filter(p => p.statut === 'transforme')
    .reduce((sum, p) => sum + (parseFloat(p.montant as any) || 0), 0);

  const tauxConversion = totalProspects > 0 ? (transforme / totalProspects * 100).toFixed(1) : '0';
  const avancement = campaign.objectif_montant > 0
    ? (montantTransforme / campaign.objectif_montant * 100).toFixed(1)
    : '0';

  const getStatutColor = (statut: CampagneProspect['statut']) => {
    switch (statut) {
      case 'a_contacter': return 'bg-gray-100 text-gray-700';
      case 'contacte': return 'bg-blue-100 text-blue-700';
      case 'transforme': return 'bg-green-100 text-green-700';
      case 'decline': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatutLabel = (statut: CampagneProspect['statut']) => {
    switch (statut) {
      case 'a_contacter': return 'À contacter';
      case 'contacte': return 'Contacté';
      case 'transforme': return 'Transformé';
      case 'decline': return 'Décliné';
      default: return statut;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.titre}</h1>
          {campaign.description && (
            <p className="text-gray-600 mt-1">{campaign.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 text-sm font-medium">Objectif CA</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {campaign.objectif_montant.toLocaleString('fr-FR')} €
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-700 text-sm font-medium">Avancement</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">
            {montantTransforme.toLocaleString('fr-FR')} €
          </div>
          <div className="text-sm text-green-700 mt-1">{avancement}% de l'objectif</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-700 text-sm font-medium">Taux de conversion</span>
            <Percent className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{tauxConversion}%</div>
          <div className="text-sm text-purple-700 mt-1">{transforme} / {totalProspects} transformés</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-700 text-sm font-medium">Potentiel total</span>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {montantTotal.toLocaleString('fr-FR')} €
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Prospects de la campagne ({totalProspects})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingProspect(undefined);
                setShowProspectModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un prospect
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commentaires
                </th>
                <th className="w-[15%] px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prospects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Aucun prospect dans cette campagne
                  </td>
                </tr>
              ) : (
                prospects.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900 truncate">{prospect.client_nom}</div>
                      {prospect.extrabat_id && (
                        <div className="text-sm text-gray-500 truncate">ID: {prospect.extrabat_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">
                        {parseFloat(prospect.montant as any).toLocaleString('fr-FR')} €
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={prospect.statut}
                        onChange={(e) => handleToggleStatut(prospect, e.target.value as CampagneProspect['statut'])}
                        className={`w-full px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatutColor(prospect.statut)}`}
                      >
                        <option value="a_contacter">À contacter</option>
                        <option value="contacte">Contacté</option>
                        <option value="transforme">Transformé</option>
                        <option value="decline">Décliné</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600 truncate" title={prospect.commentaires || ''}>
                        {prospect.commentaires || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const prospectData = (prospect as any).prospect;
                          if (!prospectData) return null;

                          const contacts = prospectData.contacts || [];
                          const primaryContact = contacts.find((c: any) => c.principal && c.email);
                          const firstContactWithEmail = contacts.find((c: any) => c.email);
                          const contact = primaryContact || firstContactWithEmail;

                          if (!contact) return null;

                          return (
                            <button
                              onClick={() => {
                                setSelectedProspectForEmail({
                                  id: prospectData.id,
                                  nom: contact.nom,
                                  prenom: contact.prenom,
                                  email: contact.email,
                                });
                                setShowEmailModal(true);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Envoyer un email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => {
                            setEditingProspect(prospect);
                            setShowProspectModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProspect(prospect.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showProspectModal && (
        <CampaignProspectModal
          isOpen={showProspectModal}
          onClose={() => {
            setShowProspectModal(false);
            setEditingProspect(undefined);
          }}
          onSave={handleSaveProspect}
          prospect={editingProspect}
          campaignId={campaignId}
        />
      )}

      {showEmailModal && selectedProspectForEmail && (
        <ProspectEmailModal
          prospect={selectedProspectForEmail}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedProspectForEmail(null);
          }}
        />
      )}

      {showImportModal && (
        <CampaignProspectImportModal
          campaignId={campaignId}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            loadCampaignData();
          }}
        />
      )}
    </div>
  );
}

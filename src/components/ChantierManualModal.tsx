import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Search, User } from 'lucide-react';
import { supabaseApi, Prospect } from '../services/supabaseApi';
import { extrabatApi } from '../services/extrabatApi';

interface ChantierManualModalProps {
  onClose: () => void;
  onChantierCreated: () => void;
}

const ChantierManualModal: React.FC<ChantierManualModalProps> = ({ onClose, onChantierCreated }) => {
  const [step, setStep] = useState<'search' | 'new' | 'details'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [extrabatResults, setExtrabatResults] = useState<any[]>([]);
  const [isSearchingExtrabat, setIsSearchingExtrabat] = useState(false);

  const [prospectForm, setProspectForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    civilite: 'M.',
  });

  const [chantierForm, setChantierForm] = useState({
    description: '',
    consignes: '',
    commande_passee: false,
    commande_recue: false,
    chantier_planifie: false,
    chantier_realise: false,
  });

  useEffect(() => {
    if (step === 'search') {
      loadProspects();
    }
  }, [step]);

  const loadProspects = async () => {
    try {
      const data = await supabaseApi.getProspects();
      setProspects(data);
    } catch (error) {
      console.error('Erreur lors du chargement des prospects:', error);
    }
  };

  const handleSearchExtrabat = async () => {
    if (!searchTerm.trim()) return;

    setIsSearchingExtrabat(true);
    try {
      const results = await extrabatApi.searchClients(searchTerm);
      setExtrabatResults(results);
    } catch (error) {
      console.error('Erreur lors de la recherche Extrabat:', error);
      alert('Erreur lors de la recherche Extrabat');
    } finally {
      setIsSearchingExtrabat(false);
    }
  };

  const handleSelectExtrabatClient = async (client: any) => {
    try {
      const existingProspect = prospects.find(p => p.extrabat_id === client.id);

      if (existingProspect) {
        setSelectedProspect(existingProspect);
        setStep('details');
        return;
      }

      const prospectData = {
        extrabat_id: client.id,
        nom: client.nom || '',
        prenom: client.prenom || '',
        email: client.email || '',
        telephone: client.telephone || '',
        adresse: client.adresse || '',
        code_postal: client.code_postal || '',
        ville: client.ville || '',
        civilite: client.civilite || 'M.',
        origine_contact: '',
        suivi_par: 'Quentin BRUNEAU',
        source: 'devis' as const,
      };

      const newProspect = await supabaseApi.createProspect(prospectData);
      setSelectedProspect(newProspect);
      setStep('details');
    } catch (error) {
      console.error('Erreur lors de la création du prospect:', error);
      alert('Erreur lors de la création du prospect');
    }
  };

  const handleSelectProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setStep('details');
  };

  const handleCreateNewProspect = async () => {
    if (!prospectForm.nom.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    setIsLoading(true);
    try {
      const prospectData = {
        ...prospectForm,
        origine_contact: '',
        suivi_par: 'Quentin BRUNEAU',
        source: 'devis' as const,
      };

      const newProspect = await supabaseApi.createProspect(prospectData);
      setSelectedProspect(newProspect);
      setStep('details');
    } catch (error) {
      console.error('Erreur lors de la création du prospect:', error);
      alert('Erreur lors de la création du prospect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChantier = async () => {
    if (!selectedProspect) return;

    if (!selectedProspect.extrabat_id) {
      alert('❌ ERREUR : Ce prospect doit être synchronisé avec Extrabat avant de créer un chantier.\n\nL\'ID Extrabat est obligatoire pour assurer la traçabilité entre toutes les applications.');
      return;
    }

    setIsLoading(true);
    try {
      const opportuniteData = {
        client_id: selectedProspect.id,
        titre: `${selectedProspect.nom} ${selectedProspect.prenom || ''}`.trim(),
        description: chantierForm.description,
        statut: 'devis-gagne' as const,
        suivi_par: 'Quentin BRUNEAU',
        statut_final: 'gagne' as const,
      };

      const opportunite = await supabaseApi.createOpportunite(opportuniteData, false);

      const chantierData = {
        opportunite_id: opportunite.id,
        consignes: chantierForm.consignes,
        commande_passee: chantierForm.commande_passee,
        commande_recue: chantierForm.commande_recue,
        chantier_planifie: chantierForm.chantier_planifie,
        chantier_realise: chantierForm.chantier_realise,
        date_commande_passee: chantierForm.commande_passee ? new Date().toISOString() : undefined,
        date_commande_recue: chantierForm.commande_recue ? new Date().toISOString() : undefined,
        date_chantier_planifie: chantierForm.chantier_planifie ? new Date().toISOString() : undefined,
        date_chantier_realise: chantierForm.chantier_realise ? new Date().toISOString() : undefined,
      };

      await supabaseApi.createChantier(chantierData);

      alert('✅ Chantier créé avec succès !');
      onChantierCreated();
    } catch (error) {
      console.error('Erreur lors de la création du chantier:', error);
      alert('Erreur lors de la création du chantier');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProspects = prospects.filter(p =>
    `${p.nom} ${p.prenom || ''} ${p.email || ''} ${p.telephone || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900">Créer un chantier manuellement</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'search' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher un client
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom, email, téléphone..."
                  />
                  <button
                    onClick={handleSearchExtrabat}
                    disabled={isSearchingExtrabat || !searchTerm.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    {isSearchingExtrabat ? 'Recherche...' : 'Extrabat'}
                  </button>
                </div>
              </div>

              {extrabatResults.length > 0 && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-blue-900 mb-2">Résultats Extrabat</h4>
                  <div className="space-y-2">
                    {extrabatResults.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectExtrabatClient(client)}
                        className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {client.nom} {client.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          {client.email && <span className="mr-3">{client.email}</span>}
                          {client.telephone && <span>{client.telephone}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Clients existants dans le CRM</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredProspects.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucun client trouvé</p>
                  ) : (
                    filteredProspects.map((prospect) => (
                      <button
                        key={prospect.id}
                        onClick={() => handleSelectProspect(prospect)}
                        className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {prospect.nom} {prospect.prenom || ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          {prospect.email && <span className="mr-3">{prospect.email}</span>}
                          {prospect.telephone && <span>{prospect.telephone}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('new')}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Créer un nouveau client
                </button>
              </div>
            </div>
          )}

          {step === 'new' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Nouveau client</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Civilité
                  </label>
                  <select
                    value={prospectForm.civilite}
                    onChange={(e) => setProspectForm({ ...prospectForm, civilite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Mlle">Mlle</option>
                    <option value="Société">Société</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={prospectForm.nom}
                    onChange={(e) => setProspectForm({ ...prospectForm, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={prospectForm.prenom}
                    onChange={(e) => setProspectForm({ ...prospectForm, prenom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={prospectForm.telephone}
                    onChange={(e) => setProspectForm({ ...prospectForm, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={prospectForm.email}
                  onChange={(e) => setProspectForm({ ...prospectForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={prospectForm.adresse}
                  onChange={(e) => setProspectForm({ ...prospectForm, adresse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={prospectForm.code_postal}
                    onChange={(e) => setProspectForm({ ...prospectForm, code_postal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={prospectForm.ville}
                    onChange={(e) => setProspectForm({ ...prospectForm, ville: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('search')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Retour
                </button>
                <button
                  onClick={handleCreateNewProspect}
                  disabled={isLoading || !prospectForm.nom.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  {isLoading ? 'Création...' : 'Continuer'}
                </button>
              </div>
            </div>
          )}

          {step === 'details' && selectedProspect && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-1">Client sélectionné</h4>
                <p className="text-blue-800">
                  {selectedProspect.nom} {selectedProspect.prenom || ''}
                </p>
                {selectedProspect.telephone && (
                  <p className="text-sm text-blue-700">{selectedProspect.telephone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description du projet
                </label>
                <textarea
                  value={chantierForm.description}
                  onChange={(e) => setChantierForm({ ...chantierForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Description du projet..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consignes chantier
                </label>
                <textarea
                  value={chantierForm.consignes}
                  onChange={(e) => setChantierForm({ ...chantierForm, consignes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Instructions et consignes pour la réalisation..."
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">État d'avancement</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chantierForm.commande_passee}
                      onChange={(e) => setChantierForm({ ...chantierForm, commande_passee: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Commande passée</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chantierForm.commande_recue}
                      onChange={(e) => setChantierForm({ ...chantierForm, commande_recue: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Commande reçue</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chantierForm.chantier_planifie}
                      onChange={(e) => setChantierForm({ ...chantierForm, chantier_planifie: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Chantier planifié</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chantierForm.chantier_realise}
                      onChange={(e) => setChantierForm({ ...chantierForm, chantier_realise: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Chantier réalisé</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setStep('search');
                    setSelectedProspect(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Retour
                </button>
                <button
                  onClick={handleCreateChantier}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Création...' : 'Créer le chantier'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChantierManualModal;

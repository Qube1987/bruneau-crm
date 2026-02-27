import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabaseApi, Opportunite, Prospect } from '../services/supabaseApi';
import { extrabatApi } from '../services/extrabatApi';
import { extrabatParametersService } from '../services/extrabatParametersService';

interface OpportunityCompletionModalProps {
  opportunity: Opportunite;
  onClose: () => void;
  onCompleted: () => void;
}

const OpportunityCompletionModal: React.FC<OpportunityCompletionModalProps> = ({
  opportunity,
  onClose,
  onCompleted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [civilites, setCivilites] = useState<any[]>([]);
  const [originesContact, setOriginesContact] = useState<any[]>([]);
  const [typesAdresse, setTypesAdresse] = useState<any[]>([]);
  const [typesTelephone, setTypesTelephone] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    civilite: '',
    nom: '',
    prenom: '',
    email: '',
    telephone1: '',
    telephone2: '',
    typeTelephone: '',
    adresse: '',
    codePostal: '',
    commune: '',
    typeAdresse: '',
    origineContact: '',
    suiviPar: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (opportunity.client_id) {
        const prospectData = await supabaseApi.getProspectById(opportunity.client_id);
        setProspect(prospectData);

        setFormData({
          civilite: prospectData.civilite || 'M.',
          nom: prospectData.nom || '',
          prenom: prospectData.prenom || '',
          email: prospectData.email || '',
          telephone1: prospectData.telephone || '',
          telephone2: '',
          typeTelephone: '1',
          adresse: prospectData.adresse || '',
          codePostal: prospectData.code_postal || '',
          commune: prospectData.ville || '',
          typeAdresse: '1',
          origineContact: prospectData.origine_contact || '',
          suiviPar: prospectData.suivi_par || 'Quentin BRUNEAU',
        });
      }

      const params = await extrabatParametersService.getAllParameters();
      setUtilisateurs(params.utilisateurs);
      setCivilites(params.civilites);
      setOriginesContact(params.originesContact);
      setTypesAdresse(params.typesAdresse);
      setTypesTelephone(params.typesTelephone);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.nom.trim()) errors.push('Le nom est obligatoire');
    if (!formData.civilite) errors.push('La civilité est obligatoire');
    if (!formData.telephone1.trim()) errors.push('Au moins un téléphone est obligatoire');
    if (!formData.adresse.trim()) errors.push("L'adresse est obligatoire");
    if (!formData.codePostal.trim()) errors.push('Le code postal est obligatoire');
    if (!formData.commune.trim()) errors.push('La commune est obligatoire');
    if (!formData.origineContact) errors.push("L'origine du contact est obligatoire");
    if (!formData.suiviPar) errors.push('Le suivi par est obligatoire');

    return errors;
  };

  const handleSyncToExtrabat = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      return;
    }

    setIsLoading(true);
    setSyncStatus('syncing');
    setErrorMessage('');

    try {
      // Vérifier si le prospect a déjà un extrabat_id
      if (prospect?.extrabat_id) {
        // Le client existe déjà dans Extrabat, ne pas créer de nouveau
        console.log('⚠️ Client déjà présent dans Extrabat (ID:', prospect.extrabat_id, '). Pas de création.');

        // Mettre à jour uniquement dans Supabase
        await supabaseApi.updateProspect(opportunity.client_id!, {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone1,
          adresse: formData.adresse,
          code_postal: formData.codePostal,
          ville: formData.commune,
          civilite: formData.civilite,
          origine_contact: formData.origineContact,
          suivi_par: formData.suiviPar,
        });

        await supabaseApi.updateOpportunite(opportunity.id, {
          saisie_rapide: false,
          extrabat_id: prospect.extrabat_id,
        });
      } else {
        // Le client n'existe pas dans Extrabat, créer le client
        const civiliteId = parseInt(formData.civilite);
        const suiviParId = utilisateurs.find(u => u.nom === formData.suiviPar)?.id || 1;
        const origineId = parseInt(formData.origineContact);

        const clientData: any = {
          civiliteId,
          suiviParId,
          origineId,
          nom: formData.nom,
          prenom: formData.prenom || '',
          email: formData.email || '',
          espaceClientEnabled: false,
          emailing: true,
          sms: false,
          telephones: [
            {
              number: formData.telephone1,
              typeId: parseInt(formData.typeTelephone),
            },
          ],
          adresses: [
            {
              description: formData.adresse,
              codePostal: formData.codePostal,
              ville: formData.commune,
              typeId: parseInt(formData.typeAdresse),
            },
          ],
        };

        if (formData.telephone2.trim()) {
          clientData.telephones.push({
            number: formData.telephone2,
            typeId: parseInt(formData.typeTelephone),
          });
        }

        console.log('✅ Création du client dans Extrabat...');
        const createdClient = await extrabatApi.createClient(clientData);

        await supabaseApi.updateProspect(opportunity.client_id!, {
          extrabat_id: createdClient.id,
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone1,
          adresse: formData.adresse,
          code_postal: formData.codePostal,
          ville: formData.commune,
          civilite: formData.civilite,
          origine_contact: formData.origineContact,
          suivi_par: formData.suiviPar,
        });

        await supabaseApi.updateOpportunite(opportunity.id, {
          saisie_rapide: false,
          extrabat_id: createdClient.id,
        });
      }

      console.log('✅ Marquage de l\'opportunité comme gagnée et création du chantier...');
      await supabaseApi.updateOpportunite(opportunity.id, {
        statut_final: 'gagne',
        date_cloture: new Date().toISOString()
      });

      const extrabatId = prospect?.extrabat_id || (await supabaseApi.getProspect(opportunity.client_id!)).extrabat_id;
      await supabaseApi.createChantier({
        opportunite_id: opportunity.id,
        extrabat_id: extrabatId!,
        statut: 'en_cours',
        suivi_par: formData.suiviPar,
      });

      setSyncStatus('success');
      setTimeout(() => {
        onCompleted();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setSyncStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la synchronisation avec Extrabat'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-orange-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Complétion obligatoire avant passage en "Gagné"
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Cette opportunité doit être synchronisée avec Extrabat avant de créer un chantier
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {syncStatus === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">
                Synchronisation réussie !
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Le prospect a été créé dans Extrabat et l'opportunité peut maintenant être marquée comme gagnée.
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 whitespace-pre-line">{errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Civilité <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.civilite}
                    onChange={(e) => setFormData({ ...formData, civilite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Sélectionner...</option>
                    {civilites.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone1}
                    onChange={(e) => setFormData({ ...formData, telephone1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone 2
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone2}
                    onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.codePostal}
                    onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commune <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origine contact <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.origineContact}
                    onChange={(e) => setFormData({ ...formData, origineContact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Sélectionner...</option>
                    {originesContact.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suivi par <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.suiviPar}
                    onChange={(e) => setFormData({ ...formData, suiviPar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Sélectionner...</option>
                    {utilisateurs.map((u) => (
                      <option key={u.id} value={u.nom}>
                        {u.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSyncToExtrabat}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {syncStatus === 'syncing' ? 'Synchronisation...' : 'Compléter et synchroniser'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityCompletionModal;

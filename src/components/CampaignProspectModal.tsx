import { X, Search, User, MapPin, Briefcase, Phone, Mail as MailIcon, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { extrabatApi } from '../services/extrabatApi';
import { supabase } from '../services/supabaseApi';
import type { CampagneProspect, Client, StatutCampagneProspect } from '../types';

interface CampaignProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CampagneProspect>) => Promise<void>;
  prospect?: CampagneProspect;
  campaignId: string;
}

interface Contact {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  fonction: string;
  principal: boolean;
}

export default function CampaignProspectModal({ isOpen, onClose, onSave, prospect, campaignId }: CampaignProspectModalProps) {
  const [mode, setMode] = useState<'extrabat' | 'manual'>('extrabat');
  const [clientExtrabatId, setClientExtrabatId] = useState<number | null>(null);
  const [clientNom, setClientNom] = useState('');
  const [montant, setMontant] = useState('0');
  const [commentaires, setCommentaires] = useState('');
  const [statut, setStatut] = useState<StatutCampagneProspect>('a_contacter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [showClientList, setShowClientList] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    code_postal: '',
    ville: '',
    activite: '',
  });

  const [contacts, setContacts] = useState<Contact[]>([{
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    fonction: '',
    principal: true
  }]);

  useEffect(() => {
    if (prospect) {
      setClientExtrabatId(prospect.extrabat_id);
      setClientNom(prospect.client_nom);
      setMontant(prospect.montant?.toString() || '0');
      setCommentaires(prospect.commentaires || '');
      setStatut(prospect.statut);
      setSearchQuery(prospect.client_nom);
      if (prospect.extrabat_id) {
        setMode('extrabat');
      } else {
        setMode('manual');
      }
      // Charger les données du prospect s'il existe
      if (prospect.client_id) {
        loadProspectData(prospect.client_id);
      } else {
        // Si pas de client_id, initialiser formData.nom avec client_nom
        setFormData(prev => ({
          ...prev,
          nom: prospect.client_nom || ''
        }));
      }
    } else {
      resetForm();
    }
  }, [prospect]);

  useEffect(() => {
    if (mode === 'extrabat') {
      const delayDebounce = setTimeout(() => {
        if (searchQuery.length >= 2) {
          searchClients();
        } else {
          setClients([]);
          setShowClientList(false);
        }
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, mode]);

  const loadProspectData = async (clientId: string) => {
    try {
      const { data: prospectData, error: prospectError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (prospectError) throw prospectError;

      if (prospectData) {
        setFormData({
          nom: prospectData.nom || '',
          adresse: prospectData.adresse || '',
          code_postal: prospectData.code_postal || '',
          ville: prospectData.ville || '',
          activite: prospectData.activite || '',
        });
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId);

      if (contactsError) throw contactsError;

      if (contactsData && contactsData.length > 0) {
        setContacts(contactsData.map(c => ({
          nom: c.nom,
          prenom: c.prenom,
          telephone: c.telephone,
          email: c.email,
          fonction: c.fonction,
          principal: c.principal
        })));
      }
    } catch (error) {
      console.error('Erreur chargement prospect:', error);
    }
  };

  const resetForm = () => {
    setMode('extrabat');
    setClientExtrabatId(null);
    setClientNom('');
    setMontant('0');
    setCommentaires('');
    setStatut('a_contacter');
    setSearchQuery('');
    setFormData({
      nom: '',
      adresse: '',
      code_postal: '',
      ville: '',
      activite: '',
    });
    setContacts([{
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      fonction: '',
      principal: true
    }]);
  };

  if (!isOpen) return null;

  const searchClients = async () => {
    try {
      setLoadingClients(true);
      const data = await extrabatApi.searchClients(searchQuery);
      setClients(Array.isArray(data) ? data : []);
      setShowClientList(true);
    } catch (error) {
      console.error('Erreur recherche clients:', error);
      alert('Erreur lors de la recherche de clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const selectClient = (client: Client) => {
    setClientExtrabatId(client.id!);
    setClientNom(`${client.nom} ${client.prenom}`.trim());
    setSearchQuery(`${client.nom} ${client.prenom}`.trim());
    setShowClientList(false);

    // Pré-remplir les données du formulaire avec les infos du client
    setFormData({
      nom: `${client.nom} ${client.prenom}`.trim(),
      adresse: client.adresse || '',
      code_postal: client.code_postal || '',
      ville: client.ville || '',
      activite: '',
    });

    // Créer un contact avec les données du client
    if (client.email || client.telephone) {
      setContacts([{
        nom: client.nom || '',
        prenom: client.prenom || '',
        telephone: client.telephone || '',
        email: client.email || '',
        fonction: '',
        principal: true
      }]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index: number, field: keyof Contact, value: string | boolean) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const addContact = () => {
    setContacts([...contacts, {
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      fonction: '',
      principal: false
    }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Déterminer le nom à utiliser (priorité au formulaire, sinon clientNom)
    const nomToUse = formData.nom.trim() || clientNom;

    if (!nomToUse) {
      alert('Le nom/raison sociale est obligatoire');
      return;
    }

    if (mode === 'extrabat' && !clientExtrabatId) {
      alert('Veuillez sélectionner un client');
      return;
    }

    setIsSubmitting(true);
    try {
      let clientId = prospect?.client_id;

      // Créer ou mettre à jour le prospect dans tous les cas
      if (prospect && prospect.client_id) {
        // Mise à jour d'un prospect existant
        const { error } = await supabase
          .from('clients')
          .update({
            nom: nomToUse,
            adresse: formData.adresse,
            code_postal: formData.code_postal,
            ville: formData.ville,
            activite: formData.activite,
            extrabat_id: mode === 'extrabat' ? clientExtrabatId : null,
            date_modification: new Date().toISOString(),
          })
          .eq('id', prospect.client_id);

        if (error) throw error;

        // Supprimer les anciens contacts
        await supabase
          .from('client_contacts')
          .delete()
          .eq('client_id', prospect.client_id);
      } else {
        // Vérifier si un prospect avec cet extrabat_id existe déjà
        if (mode === 'extrabat' && clientExtrabatId) {
          const { data: existingProspect } = await supabase
            .from('clients')
            .select('id')
            .eq('extrabat_id', clientExtrabatId)
            .maybeSingle();

          if (existingProspect) {
            // Utiliser le prospect existant et le mettre à jour
            clientId = existingProspect.id;

            const { error } = await supabase
              .from('clients')
              .update({
                nom: nomToUse,
                adresse: formData.adresse,
                code_postal: formData.code_postal,
                ville: formData.ville,
                activite: formData.activite,
                date_modification: new Date().toISOString(),
              })
              .eq('id', clientId);

            if (error) throw error;

            // Supprimer les anciens contacts
            await supabase
              .from('client_contacts')
              .delete()
              .eq('client_id', clientId);
          } else {
            // Créer un nouveau prospect
            const { data: newProspect, error } = await supabase
              .from('clients')
              .insert({
                nom: nomToUse,
                adresse: formData.adresse,
                code_postal: formData.code_postal,
                ville: formData.ville,
                activite: formData.activite,
                extrabat_id: clientExtrabatId,
                source: 'campagne',
                suivi_par: 'Quentin BRUNEAU',
              })
              .select()
              .single();

            if (error) throw error;
            clientId = newProspect.id;
          }
        } else {
          // Création d'un nouveau prospect en mode manuel
          const { data: newProspect, error } = await supabase
            .from('clients')
            .insert({
              nom: nomToUse,
              adresse: formData.adresse,
              code_postal: formData.code_postal,
              ville: formData.ville,
              activite: formData.activite,
              source: 'campagne',
              suivi_par: 'Quentin BRUNEAU',
            })
            .select()
            .single();

          if (error) throw error;
          clientId = newProspect.id;
        }
      }

      // Insérer les nouveaux contacts
      const validContacts = contacts.filter(c => c.nom.trim() !== '');
      if (validContacts.length > 0) {
        const contactsToInsert = validContacts.map(contact => ({
          client_id: clientId,
          nom: contact.nom,
          prenom: contact.prenom,
          telephone: contact.telephone,
          email: contact.email,
          fonction: contact.fonction,
          principal: contact.principal,
        }));

        const { error: contactsError } = await supabase
          .from('client_contacts')
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      // Sauvegarder le prospect de campagne
      await onSave({
        client_id: clientId,
        extrabat_id: mode === 'extrabat' ? clientExtrabatId : null,
        client_nom: nomToUse,
        montant: parseFloat(montant) || 0,
        commentaires: commentaires.trim(),
        statut,
      });

      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du prospect');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {prospect ? 'Modifier le prospect' : 'Ajouter un prospect'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!prospect && (
          <div className="px-6 pt-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('extrabat')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'extrabat'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="w-4 h-4 inline-block mr-2" />
                Rechercher dans Extrabat
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4 inline-block mr-2" />
                Saisie manuelle
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {mode === 'extrabat' && !clientExtrabatId && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Extrabat *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) {
                      setClientExtrabatId(null);
                      setClientNom('');
                    }
                  }}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rechercher un client..."
                  disabled={!!prospect}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {loadingClients && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <div className="text-center text-gray-500">Recherche en cours...</div>
                </div>
              )}

              {showClientList && clients.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {client.nom} {client.prenom}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.email || 'Pas d\'email'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showClientList && searchQuery.length >= 2 && clients.length === 0 && !loadingClients && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <div className="text-center text-gray-500">Aucun client trouvé</div>
                </div>
              )}
            </div>
          )}

          {(mode === 'manual' || (mode === 'extrabat' && clientExtrabatId)) && (
            <div className="space-y-4">
              {mode === 'extrabat' && clientExtrabatId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Search className="w-4 h-4" />
                    <span className="font-medium">Client Extrabat sélectionné (ID: {clientExtrabatId})</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Vous pouvez modifier les coordonnées et ajouter des contacts ci-dessous
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom / Raison sociale *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom ou raison sociale"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Numéro et rue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={formData.code_postal}
                    onChange={(e) => handleInputChange('code_postal', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Code postal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => handleInputChange('ville', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ville"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activité
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.activite}
                    onChange={(e) => handleInputChange('activite', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Plomberie, Électricité, Construction..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Contacts</h3>
                <div className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-700">Contact {index + 1}</span>
                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContact(index)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              value={contact.nom}
                              onChange={(e) => handleContactChange(index, 'nom', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Nom"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={contact.prenom}
                              onChange={(e) => handleContactChange(index, 'prenom', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Prénom"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={contact.fonction}
                          onChange={(e) => handleContactChange(index, 'fonction', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Fonction"
                        />

                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            value={contact.telephone}
                            onChange={(e) => handleContactChange(index, 'telephone', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Téléphone"
                          />
                        </div>

                        <div className="relative">
                          <MailIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={contact.email}
                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Email"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={contact.principal}
                            onChange={(e) => handleContactChange(index, 'principal', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Contact principal
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addContact}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un contact
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant estimé (€ HT) *
            </label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutCampagneProspect)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="a_contacter">À contacter</option>
              <option value="contacte">Contacté</option>
              <option value="transforme">Transformé</option>
              <option value="decline">Décliné</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaires
            </label>
            <textarea
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes, détails sur le contact, besoins spécifiques..."
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
              disabled={isSubmitting || (mode === 'extrabat' && !clientExtrabatId) || (mode === 'manual' && !formData.nom.trim())}
            >
              {isSubmitting ? 'Enregistrement...' : prospect ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

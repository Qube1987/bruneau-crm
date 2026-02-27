import React, { useState } from 'react';
import { X, Plus, Trash2, Save, MessageSquare, Phone, Mail as MailIcon, User, MapPin, Briefcase } from 'lucide-react';
import { supabase } from '../services/supabaseApi';
import InteractionModal from './InteractionModal';
import TimeSelector from './TimeSelector';

interface Contact {
  id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  fonction: string;
  principal: boolean;
}

interface ProspectInteraction {
  id: string;
  type: 'telephonique' | 'physique' | 'mail';
  description: string;
  date: string;
  utilisateur: string;
  date_rdv_debut?: string;
  date_rdv_fin?: string;
  rdv_user_id?: string;
}

interface ProspectQuickModalProps {
  onClose: () => void;
  onProspectCreated: () => void;
  prospect?: any;
  source?: 'prospection' | 'fidelisation';
}

const ProspectQuickModal: React.FC<ProspectQuickModalProps> = ({ onClose, onProspectCreated, prospect, source = 'prospection' }) => {
  const isEditing = !!prospect;

  const [formData, setFormData] = useState({
    nom: prospect?.nom || '',
    adresse: prospect?.adresse || '',
    code_postal: prospect?.code_postal || '',
    ville: prospect?.ville || '',
    activite: prospect?.activite || '',
  });

  const [contacts, setContacts] = useState<Contact[]>(
    prospect?.contacts?.length > 0 ? prospect.contacts : [{
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      fonction: '',
      principal: true
    }]
  );

  const [interactions, setInteractions] = useState<ProspectInteraction[]>(prospect?.interactions || []);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'infos' | 'contacts' | 'historique'>('infos');

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

  const handleAddInteraction = async (interactionData: any) => {
    if (!prospect?.id) return;

    try {
      const { data, error } = await supabase
        .from('prospect_interactions')
        .insert({
          client_id: prospect.id,
          type: interactionData.type,
          description: interactionData.description,
          utilisateur: interactionData.utilisateur,
          date: interactionData.date || new Date().toISOString(),
          date_rdv_debut: interactionData.date_rdv_debut,
          date_rdv_fin: interactionData.date_rdv_fin,
          rdv_user_id: interactionData.rdv_user_id,
        })
        .select()
        .single();

      if (error) throw error;

      setInteractions([data, ...interactions]);
      setShowInteractionModal(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'interaction:', error);
    }
  };

  const loadInteractions = async () => {
    if (!prospect?.id) return;

    try {
      const { data, error } = await supabase
        .from('prospect_interactions')
        .select('*')
        .eq('client_id', prospect.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des interactions:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      alert('Le nom/raison sociale est obligatoire');
      return;
    }

    setIsSaving(true);
    try {
      let clientId = prospect?.id;

      if (isEditing) {
        const { error } = await supabase
          .from('clients')
          .update({
            nom: formData.nom,
            adresse: formData.adresse,
            code_postal: formData.code_postal,
            ville: formData.ville,
            activite: formData.activite,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prospect.id);

        if (error) throw error;

        await supabase
          .from('client_contacts')
          .delete()
          .eq('client_id', prospect.id);
      } else {
        const { data: newProspect, error } = await supabase
          .from('clients')
          .insert({
            nom: formData.nom,
            adresse: formData.adresse,
            code_postal: formData.code_postal,
            ville: formData.ville,
            activite: formData.activite,
            source: source,
            suivi_par: 'Quentin BRUNEAU',
          })
          .select()
          .single();

        if (error) throw error;
        clientId = newProspect.id;
      }

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

      onProspectCreated();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du prospect');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditing ? 'Modifier le prospect' : 'Nouveau prospect'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('infos')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'infos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Informations
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'contacts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contacts ({contacts.filter(c => c.nom.trim()).length})
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setActiveTab('historique');
                  loadInteractions();
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'historique'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Historique ({interactions.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'infos' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Contact {index + 1}</h3>
                    {contacts.length > 1 && (
                      <button
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom du contact
                        </label>
                        <input
                          type="text"
                          value={contact.nom}
                          onChange={(e) => handleContactChange(index, 'nom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nom"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prénom du contact
                        </label>
                        <input
                          type="text"
                          value={contact.prenom}
                          onChange={(e) => handleContactChange(index, 'prenom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Prénom"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fonction
                      </label>
                      <input
                        type="text"
                        value={contact.fonction}
                        onChange={(e) => handleContactChange(index, 'fonction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Directeur, Responsable..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={contact.telephone}
                          onChange={(e) => handleContactChange(index, 'telephone', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Numéro de téléphone"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Adresse email"
                        />
                      </div>
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
                onClick={addContact}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un contact
              </button>
            </div>
          )}

          {activeTab === 'historique' && isEditing && (
            <div className="space-y-4">
              <button
                onClick={() => setShowInteractionModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Ajouter une interaction
              </button>

              {interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune interaction enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          interaction.type === 'telephonique' ? 'bg-blue-100 text-blue-600' :
                          interaction.type === 'physique' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {interaction.type === 'telephonique' ? <Phone className="w-4 h-4" /> :
                           interaction.type === 'physique' ? <User className="w-4 h-4" /> :
                           <MailIcon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              interaction.type === 'telephonique' ? 'bg-blue-100 text-blue-800' :
                              interaction.type === 'physique' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {interaction.type === 'telephonique' ? 'Téléphonique' :
                               interaction.type === 'physique' ? 'Physique' : 'Email'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(interaction.date).toLocaleDateString('fr-FR')} à {new Date(interaction.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-gray-700">{interaction.description}</p>
                          <p className="text-sm text-gray-500 mt-2">Par {interaction.utilisateur}</p>
                          {interaction.date_rdv_debut && (
                            <p className="text-sm text-blue-600 mt-1">
                              RDV prévu le {new Date(interaction.date_rdv_debut).toLocaleDateString('fr-FR')} à {new Date(interaction.date_rdv_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.nom.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {showInteractionModal && (
        <InteractionModal
          opportuniteId={prospect.id}
          onClose={() => setShowInteractionModal(false)}
          onInteractionAdded={handleAddInteraction}
          isProspect={true}
        />
      )}
    </div>
  );
};

export default ProspectQuickModal;

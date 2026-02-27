import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Phone, MapPin, Briefcase, User, Trash2, Upload } from 'lucide-react';
import { supabase } from '../services/supabaseApi';
import { extrabatParametersService } from '../services/extrabatParametersService';
import ProspectQuickModal from './ProspectQuickModal';
import ProspectImportModal from './ProspectImportModal';

interface ProspectionFormProps {
  onClientCreated?: (client: any) => void;
  refreshTrigger: number;
}

const ProspectionForm: React.FC<ProspectionFormProps> = ({ refreshTrigger }) => {
  const [prospects, setProspects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [filterSuiviPar, setFilterSuiviPar] = useState<string>('all');
  const [filterVille, setFilterVille] = useState<string>('all');
  const [filterActivite, setFilterActivite] = useState<string>('all');
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);

  useEffect(() => {
    loadUtilisateurs();
    loadProspects();
  }, []);

  useEffect(() => {
    loadProspects();
  }, [refreshTrigger]);

  const loadUtilisateurs = async () => {
    try {
      const data = await extrabatParametersService.getUtilisateurs();
      setUtilisateurs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const loadProspects = async () => {
    setIsLoadingProspects(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          contacts:client_contacts(*),
          interactions:prospect_interactions(*)
        `)
        .eq('source', 'prospection')
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const prospectsWithSortedInteractions = (data || []).map(prospect => ({
        ...prospect,
        interactions: (prospect.interactions || []).sort((a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      }));

      setProspects(prospectsWithSortedInteractions);
    } catch (error) {
      console.error('Erreur lors du chargement des prospects:', error);
      setProspects([]);
    } finally {
      setIsLoadingProspects(false);
    }
  };

  const villes = Array.from(new Set(prospects.filter(p => p.ville).map(p => p.ville))).sort();
  const activites = Array.from(new Set(prospects.filter(p => p.activite).map(p => p.activite))).sort();

  const filteredProspects = prospects.filter(prospect =>
    (prospect.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prospect.ville && prospect.ville.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (prospect.activite && prospect.activite.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (prospect.contacts && prospect.contacts.some((c: any) =>
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ))) &&
    (filterSuiviPar === 'all' || prospect.suivi_par === filterSuiviPar) &&
    (filterVille === 'all' || prospect.ville === filterVille) &&
    (filterActivite === 'all' || prospect.activite === filterActivite)
  );

  const handleEditProspect = (prospect: any) => {
    setSelectedProspect(prospect);
    setShowQuickModal(true);
  };

  const handleCloseModal = () => {
    setShowQuickModal(false);
    setSelectedProspect(null);
  };

  const handleDeleteProspect = async (e: React.MouseEvent, prospect: any) => {
    e.stopPropagation();

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le prospect "${prospect.nom}" ?\n\nCette action marquera le prospect comme inactif.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ actif: false })
        .eq('id', prospect.id);

      if (error) throw error;

      await loadProspects();
    } catch (error) {
      console.error('Erreur lors de la suppression du prospect:', error);
      alert('Erreur lors de la suppression du prospect');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Prospection</h2>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowQuickModal(true)}
            className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            Créer un nouveau prospect
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Importer CSV/Excel
          </button>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Liste des Prospects de Prospection</h3>
              <span className="text-sm text-gray-500">
                {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterSuiviPar}
                onChange={(e) => setFilterSuiviPar(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Tous les responsables</option>
                {utilisateurs.filter(u => u.actif).map((utilisateur) => (
                  <option key={utilisateur.id} value={utilisateur.nom}>
                    {utilisateur.nom}
                  </option>
                ))}
              </select>

              <select
                value={filterVille}
                onChange={(e) => setFilterVille(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Toutes les villes</option>
                {villes.map((ville) => (
                  <option key={ville} value={ville}>
                    {ville}
                  </option>
                ))}
              </select>

              <select
                value={filterActivite}
                onChange={(e) => setFilterActivite(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Toutes les activités</option>
                {activites.map((activite) => (
                  <option key={activite} value={activite}>
                    {activite}
                  </option>
                ))}
              </select>

              {(filterSuiviPar !== 'all' || filterVille !== 'all' || filterActivite !== 'all') && (
                <button
                  onClick={() => {
                    setFilterSuiviPar('all');
                    setFilterVille('all');
                    setFilterActivite('all');
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, ville, activité, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {isLoadingProspects ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement des prospects...</p>
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun prospect trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  onClick={() => handleEditProspect(prospect)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {prospect.nom}
                      </h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        <User className="w-3 h-3 mr-1" />
                        {prospect.suivi_par}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProspect(e, prospect)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer le prospect"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    {prospect.activite && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Briefcase className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{prospect.activite}</span>
                      </div>
                    )}

                    {prospect.adresse && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {prospect.ville || `${prospect.code_postal} ${prospect.ville}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {prospect.contacts && prospect.contacts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Contacts ({prospect.contacts.length})
                      </p>
                      <div className="space-y-2">
                        {prospect.contacts.slice(0, 2).map((contact: any) => (
                          <div key={contact.id} className="text-sm text-gray-600 flex flex-wrap items-center gap-3">
                            <span className="font-medium">
                              {contact.nom} {contact.prenom}
                              {contact.principal && (
                                <span className="ml-1 text-xs text-blue-600">(Principal)</span>
                              )}
                            </span>
                            {contact.fonction && (
                              <span className="text-gray-500">• {contact.fonction}</span>
                            )}
                            {contact.telephone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.telephone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        ))}
                        {prospect.contacts.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{prospect.contacts.length - 2} autre(s) contact(s)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {prospect.interactions && prospect.interactions.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Dernière interaction : {new Date(prospect.interactions[0].date).toLocaleDateString('fr-FR')}
                    </div>
                  )}

                  <div className="mt-3 text-sm text-gray-500">
                    <p>Créé le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showQuickModal && (
        <ProspectQuickModal
          prospect={selectedProspect}
          source="prospection"
          onClose={handleCloseModal}
          onProspectCreated={() => {
            loadProspects();
            handleCloseModal();
          }}
        />
      )}

      {showImportModal && (
        <ProspectImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            loadProspects();
          }}
        />
      )}
    </div>
  );
};

export default ProspectionForm;

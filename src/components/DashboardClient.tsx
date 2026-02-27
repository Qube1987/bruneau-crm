import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, MapPin, Phone, Mail, Building, Briefcase, TrendingUp,
  FileText, Wrench, Calendar, DollarSign, AlertCircle, RefreshCw,
  Star, CheckCircle, XCircle, Clock, Package, ChevronDown, ChevronRight,
  Tag, Box, Layers, AlertTriangle, Users, Shield
} from 'lucide-react';
import { loadClientDashboard, DashboardData } from '../services/dashboardService';

export default function DashboardClient() {
  const { extrabatId } = useParams<{ extrabatId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'commercial' | 'chantiers' | 'ouvrages' | 'pieces' | 'sav' | 'maintenance' | 'ltv' | 'rdvs'>('commercial');

  useEffect(() => {
    if (extrabatId) {
      loadData();
    }
  }, [extrabatId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await loadClientDashboard(parseInt(extrabatId!));
      if (!result) {
        setError(`Aucun client trouvé avec l'ID Extrabat ${extrabatId}`);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données client...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const { prospect, contacts } = data;

  const getCivilite = (civilite: any): string => {
    if (!civilite) return '';

    if (typeof civilite === 'string') {
      return civilite;
    }

    if (typeof civilite === 'object' && civilite !== null) {
      if (civilite.civilite_lib && typeof civilite.civilite_lib === 'string') {
        return civilite.civilite_lib;
      }
      if (civilite.civilite && typeof civilite.civilite === 'string') {
        return civilite.civilite;
      }
      if (typeof civilite.civilite === 'object' && civilite.civilite?.civilite_lib) {
        return civilite.civilite.civilite_lib;
      }
    }

    return '';
  };

  // Compter tous les SAV actifs (CRM + Extrabat)
  const countActiveSAV = () => {
    let count = 0;

    // SAV du CRM actifs
    count += data.savRequests.filter((s: any) => s.status !== 'resolved' && !s.archived_at).length;

    // SAV Extrabat actifs depuis les ouvrages
    data.ouvrages.forEach((ouvrage: any) => {
      if (ouvrage.sav && Array.isArray(ouvrage.sav)) {
        ouvrage.sav.forEach((savExtrabat: any) => {
          if (!savExtrabat._source || savExtrabat._source !== 'supabase') {
            const isArchived = savExtrabat.etat?.libelle === 'Intervention archivée' ||
                              savExtrabat.etat?.libelle?.toLowerCase().includes('archivé');
            if (!isArchived) {
              count++;
            }
          }
        });
      }
    });

    return count;
  };

  const kpis = {
    caTotal: (data.pieces || [])
      .filter((p: any) => p.type === 4)
      .reduce((sum: number, p: any) => sum + (p.totalTTC || 0), 0),
    caDevis: data.devis
      .filter((d: any) => d.accepted_status === 'accepted')
      .reduce((sum: number, d: any) => {
        const totaux = typeof d.totaux === 'string' ? JSON.parse(d.totaux) : d.totaux;
        return sum + (totaux?.totalTTC || 0);
      }, 0),
    opportunitesOuvertes: data.opportunites.filter((o: any) => o.statut !== 'Clôturée' && !o.archive).length,
    chantiersEnCours: data.chantiers.filter((c: any) => !c.chantier_realise).length,
    ticketsSAV: countActiveSAV(),
    contratsMaintenance: data.maintenance.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  {getCivilite(prospect.civilite) ? `${getCivilite(prospect.civilite)} ` : ''}
                  {prospect.nom} {prospect.prenom || ''}
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
                {prospect.activite && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{prospect.activite}</span>
                  </div>
                )}
                {(prospect.adresse || prospect.ville) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>
                      {prospect.adresse && `${prospect.adresse}, `}
                      {prospect.code_postal} {prospect.ville}
                    </span>
                  </div>
                )}
                {prospect.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${prospect.telephone}`} className="hover:text-blue-600">
                      {prospect.telephone}
                    </a>
                  </div>
                )}
                {prospect.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${prospect.email}`} className="hover:text-blue-600">
                      {prospect.email}
                    </a>
                  </div>
                )}
              </div>


              {contacts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Contacts:</h3>
                  <div className="space-y-2">
                    {contacts.map((contact: any) => (
                      <div key={contact.id} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">
                          {contact.nom} {contact.prenom}
                          {contact.principal && <span className="text-blue-600 ml-1">(Principal)</span>}
                        </span>
                        {contact.fonction && <span>— {contact.fonction}</span>}
                        {contact.telephone && <span>— {contact.telephone}</span>}
                        {contact.email && <span>— {contact.email}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">CA Total facturé</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.caTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Opportunités ouvertes</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.opportunitesOuvertes}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Chantiers en cours</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.chantiersEnCours}</p>
              </div>
              <Building className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tickets SAV ouverts</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.ticketsSAV}</p>
              </div>
              <Wrench className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contrats maintenance</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.contratsMaintenance}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {(data.errors.crm || data.errors.sav || data.errors.devis ||
          (data.errors.extrabatDevis && data.extrabatDevisError === 'api_error') ||
          (data.errors.extrabatCommandes && data.extrabatCommandesError === 'api_error') ||
          (data.errors.extrabatFactures && data.extrabatFacturesError === 'api_error')) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1">Avertissements de chargement:</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {data.errors.crm && <li>• {data.errors.crm}</li>}
                  {data.errors.sav && <li>• {data.errors.sav}</li>}
                  {data.errors.devis && <li>• {data.errors.devis}</li>}
                  {data.errors.extrabatDevis && data.extrabatDevisError === 'api_error' && <li>• {data.errors.extrabatDevis}</li>}
                  {data.errors.extrabatCommandes && data.extrabatCommandesError === 'api_error' && <li>• {data.errors.extrabatCommandes}</li>}
                  {data.errors.extrabatFactures && data.extrabatFacturesError === 'api_error' && <li>• {data.errors.extrabatFactures}</li>}
                </ul>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-sm text-yellow-900 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('commercial')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'commercial'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Commercial ({data.opportunites.length})
              </button>
              <button
                onClick={() => setActiveTab('chantiers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'chantiers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chantiers ({data.chantiers.length})
              </button>
              <button
                onClick={() => setActiveTab('ouvrages')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ouvrages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ouvrages ({data.ouvrages?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('pieces')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pieces'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pièces ({(data.pieces?.length || 0)})
              </button>
              <button
                onClick={() => setActiveTab('sav')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sav'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                SAV ({kpis.ticketsSAV})
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'maintenance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Maintenance ({data.maintenance.length})
              </button>
              <button
                onClick={() => setActiveTab('ltv')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ltv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                LTV & Actions
              </button>
              <button
                onClick={() => setActiveTab('rdvs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rdvs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Historique des RDV
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'commercial' && <CommercialTab data={data} />}
            {activeTab === 'chantiers' && <ChantiersTab data={data} />}
            {activeTab === 'ouvrages' && <OuvragesTab data={data} />}
            {activeTab === 'pieces' && <PiecesTab data={data} />}
            {activeTab === 'sav' && <SAVTab data={data} />}
            {activeTab === 'maintenance' && <MaintenanceTab data={data} />}
            {activeTab === 'ltv' && <LtvTab data={data} />}
            {activeTab === 'rdvs' && <RdvsTab extrabatId={parseInt(extrabatId!)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommercialTab({ data }: { data: DashboardData }) {
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);

  if (data.opportunites.length === 0 && data.campagnes.length === 0 && data.prospectInteractions.length === 0) {
    return <EmptyState message="Aucune donnée commerciale" />;
  }

  const getStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      'En cours': 'bg-blue-100 text-blue-800',
      'Gagnée': 'bg-green-100 text-green-800',
      'Perdue': 'bg-red-100 text-red-800',
      'Clôturée': 'bg-gray-100 text-gray-800',
    };
    return colors[statut] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunités</h3>
        {data.opportunites.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune opportunité</p>
        ) : (
          <div className="space-y-3">
            {data.opportunites.map((opp: any) => (
              <div key={opp.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  onClick={() => setExpandedOpportunity(expandedOpportunity === opp.id ? null : opp.id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{opp.titre}</h4>
                        {opp.prioritaire && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatutBadge(opp.statut)}`}>
                          {opp.statut}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>Montant: {opp.montant_estime?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div>Suivi par: {opp.suivi_par}</div>
                        <div>Créé le: {new Date(opp.date_creation).toLocaleDateString('fr-FR')}</div>
                      </div>
                      {opp.date_travaux_estimee && (
                        <div className="text-sm text-gray-600 mt-1">
                          Date travaux estimée: {new Date(opp.date_travaux_estimee).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {expandedOpportunity === opp.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {opp.interactions && opp.interactions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Interactions</h5>
                        <div className="space-y-2">
                          {opp.interactions.map((interaction: any) => (
                            <div key={interaction.id} className="text-sm bg-white p-3 rounded border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{interaction.type}</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500">{new Date(interaction.date).toLocaleDateString('fr-FR')}</span>
                                {interaction.utilisateur && (
                                  <>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-500">{interaction.utilisateur}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-gray-700">{interaction.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {opp.opportunite_photos && opp.opportunite_photos.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Photos</h5>
                        <div className="grid grid-cols-4 gap-2">
                          {opp.opportunite_photos.map((photo: any, index: number) => (
                            <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.file_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {data.campagnes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campagnes commerciales</h3>
          <div className="space-y-2">
            {data.campagnes.map((campagne: any) => (
              <div key={campagne.id} className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-1">
                  {campagne.campagnes_commerciales?.titre}
                </div>
                <div className="text-sm text-gray-600">
                  Montant: {campagne.montant?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  {' • '}
                  Statut: {campagne.statut}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.actionsCommerciales.length > 0 && data.actionsCommerciales[0] && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions commerciales</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.actionsCommerciales[0]).map(([key, value]) => {
              if (key === 'id' || key === 'client_id' || key === 'created_at' || key === 'updated_at') return null;
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-gray-900">{value as string || 'Non renseigné'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.prospectInteractions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique interactions prospect</h3>
          <div className="space-y-2">
            {data.prospectInteractions.map((interaction: any) => (
              <div key={interaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">{interaction.type}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-500">
                    {new Date(interaction.date).toLocaleDateString('fr-FR')}
                  </span>
                  {interaction.utilisateur && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{interaction.utilisateur}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700">{interaction.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChantiersTab({ data }: { data: DashboardData }) {
  const [expandedChantier, setExpandedChantier] = useState<string | null>(null);

  if (data.chantiers.length === 0) {
    return <EmptyState message="Aucun chantier trouvé pour ce client" />;
  }

  return (
    <div className="space-y-3">
      {data.chantiers.map((chantier: any) => (
        <div key={chantier.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            onClick={() => setExpandedChantier(expandedChantier === chantier.id ? null : chantier.id)}
            className="p-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Statut:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  chantier.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                  chantier.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {chantier.statut}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Commande passée:</span>
                {chantier.commande_passee ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Chantier réalisé:</span>
                {chantier.chantier_realise ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              {chantier.ltv_score !== null && (
                <div>
                  <span className="text-gray-600">Score LTV:</span>
                  <span className="ml-2 font-medium">{chantier.ltv_score}</span>
                </div>
              )}
            </div>
            {chantier.consignes && (
              <p className="mt-2 text-sm text-gray-700">Consignes: {chantier.consignes}</p>
            )}
          </div>

          {expandedChantier === chantier.id && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
              {chantier.chantier_interventions && chantier.chantier_interventions.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Interventions</h5>
                  <div className="space-y-2">
                    {chantier.chantier_interventions.map((intervention: any) => (
                      <div key={intervention.id} className="text-sm bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {new Date(intervention.date_debut).toLocaleDateString('fr-FR')}
                            {intervention.date_fin && ` - ${new Date(intervention.date_fin).toLocaleDateString('fr-FR')}`}
                          </span>
                        </div>
                        {intervention.notes && <p className="text-gray-700">{intervention.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chantier.ltv_actions && chantier.ltv_actions.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Actions LTV</h5>
                  <div className="space-y-2">
                    {chantier.ltv_actions.map((action: any) => (
                      <div key={action.id} className="text-sm bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.categorie}</span>
                          <span className="text-gray-500">•</span>
                          <span>{action.action}</span>
                          <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                            action.statut === 'completee' ? 'bg-green-100 text-green-800' :
                            action.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {action.statut}
                          </span>
                        </div>
                        {action.date_proposition && (
                          <p className="text-gray-600">
                            Proposé le: {new Date(action.date_proposition).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OuvragesTab({ data }: { data: DashboardData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOuvrages, setExpandedOuvrages] = useState<Set<number>>(new Set());

  if (!data.ouvrages || data.ouvrages.length === 0) {
    return <EmptyState message="Aucun ouvrage trouvé pour ce client" />;
  }

  const filteredOuvrages = data.ouvrages.filter((ouvrage: any) => {
    const searchLower = searchTerm.toLowerCase();
    const libelle = ouvrage.libelle?.toLowerCase() || '';
    const articleLibelle = ouvrage.article?.libelle?.toLowerCase() || '';

    return libelle.includes(searchLower) || articleLibelle.includes(searchLower);
  });

  const toggleOuvrage = (ouvrageId: number) => {
    const newExpanded = new Set(expandedOuvrages);
    if (newExpanded.has(ouvrageId)) {
      newExpanded.delete(ouvrageId);
    } else {
      newExpanded.add(ouvrageId);
    }
    setExpandedOuvrages(newExpanded);
  };

  const getStatusBadge = (status: any) => {
    if (!status) return null;

    const statusColors: Record<string, string> = {
      'En projet': 'bg-blue-100 text-blue-800 border-blue-200',
      'En cours': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Terminé': 'bg-green-100 text-green-800 border-green-200',
      'Annulé': 'bg-red-100 text-red-800 border-red-200',
    };

    const colorClass = statusColors[status.label] || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colorClass}`}>
        {status.label}
      </span>
    );
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher un ouvrage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Package className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <div className="text-sm text-gray-600">
          {filteredOuvrages.length} ouvrage{filteredOuvrages.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {filteredOuvrages.map((ouvrage: any) => {
          const isExpanded = expandedOuvrages.has(ouvrage.id);
          const equipements = ouvrage.equipements || [];
          const accessoires = ouvrage.accessoires || [];
          const totalItems = equipements.length + accessoires.length;
          const savCount = ouvrage.sav?.length || 0;
          const recentSavCount = (ouvrage.sav || []).filter((s: any) => {
            const savDate = new Date(s.dateCreation);
            return (Date.now() - savDate.getTime()) < (90 * 24 * 60 * 60 * 1000);
          }).length;

          return (
            <div key={ouvrage.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggleOuvrage(ouvrage.id)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {ouvrage.libelle || ouvrage.article?.libelle || 'Ouvrage sans nom'}
                      </h3>
                      {getStatusBadge(ouvrage.status)}
                      {recentSavCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          <AlertTriangle className="w-3 h-3" />
                          {recentSavCount} SAV récent{recentSavCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {ouvrage.article && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {ouvrage.article.code}
                        </span>
                      )}
                      {totalItems > 0 && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {totalItems} article{totalItems > 1 ? 's' : ''}
                        </span>
                      )}
                      {savCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Wrench className="w-3 h-3" />
                          {savCount} SAV
                        </span>
                      )}
                      {ouvrage.dateMiseADispo && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ouvrage.dateMiseADispo).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 space-y-4">
                    {ouvrage.article && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Box className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">Article principal</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Libellé:</span>
                            <span className="ml-2 text-gray-900 font-medium">{ouvrage.article.libelle}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Code:</span>
                            <span className="ml-2 text-gray-900 font-medium">{ouvrage.article.code}</span>
                          </div>
                          {ouvrage.article.famille && (
                            <div>
                              <span className="text-gray-500">Famille:</span>
                              <span className="ml-2 text-gray-900">{ouvrage.article.famille.libelle}</span>
                            </div>
                          )}
                          {ouvrage.article.sousFamille && (
                            <div>
                              <span className="text-gray-500">Sous-famille:</span>
                              <span className="ml-2 text-gray-900">{ouvrage.article.sousFamille.libelle}</span>
                            </div>
                          )}
                          {ouvrage.article.prix > 0 && (
                            <div>
                              <span className="text-gray-500">Prix:</span>
                              <span className="ml-2 text-gray-900 font-semibold">{formatPrice(ouvrage.article.prix)}</span>
                            </div>
                          )}
                          {ouvrage.article.tauxTva && (
                            <div>
                              <span className="text-gray-500">TVA:</span>
                              <span className="ml-2 text-gray-900">{ouvrage.article.tauxTva.taux}%</span>
                            </div>
                          )}
                        </div>

                        {ouvrage.article.description && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-gray-500 text-sm block mb-1">Description:</span>
                            <div
                              className="text-sm text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: ouvrage.article.description }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {equipements.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          Équipements ({equipements.length})
                        </h4>
                        <div className="space-y-2">
                          {equipements.map((equipement: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{equipement.article?.libelle}</h5>
                                  <p className="text-xs text-gray-500 mt-0.5">{equipement.article?.code}</p>
                                </div>
                                {equipement.prix && parseFloat(equipement.prix) > 0 && (
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatPrice(equipement.prix)}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {equipement.quantite && (
                                  <div>
                                    <span className="text-gray-500">Qté:</span>
                                    <span className="ml-1 text-gray-900 font-medium">{equipement.quantite}</span>
                                  </div>
                                )}
                                {equipement.numeroSerie && (
                                  <div>
                                    <span className="text-gray-500">N° série:</span>
                                    <span className="ml-1 text-gray-900">{equipement.numeroSerie}</span>
                                  </div>
                                )}
                                {equipement.article?.famille && (
                                  <div>
                                    <span className="text-gray-500">Famille:</span>
                                    <span className="ml-1 text-gray-900">{equipement.article.famille.libelle}</span>
                                  </div>
                                )}
                                {equipement.dateMiseADispo && (
                                  <div>
                                    <span className="text-gray-500">Mise à dispo:</span>
                                    <span className="ml-1 text-gray-900">
                                      {new Date(equipement.dateMiseADispo).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {equipement.observations && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-600">{equipement.observations}</p>
                                </div>
                              )}

                              {equipement.article?.description && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                                      Voir la description technique
                                    </summary>
                                    <div
                                      className="mt-2 text-gray-700 leading-relaxed"
                                      dangerouslySetInnerHTML={{ __html: equipement.article.description }}
                                    />
                                  </details>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {accessoires.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          Accessoires ({accessoires.length})
                        </h4>
                        <div className="space-y-2">
                          {accessoires.map((accessoire: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{accessoire.article?.libelle}</h5>
                                  <p className="text-xs text-gray-500 mt-0.5">{accessoire.article?.code}</p>
                                </div>
                                {accessoire.prix && parseFloat(accessoire.prix) > 0 && (
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatPrice(accessoire.prix)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(ouvrage.sav && ouvrage.sav.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-orange-600" />
                          SAV / Interventions ({ouvrage.sav.length})
                        </h4>
                        <div className="space-y-2">
                          {ouvrage.sav
                            .sort((a: any, b: any) =>
                              new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
                            )
                            .map((sav: any, idx: number) => {
                              const savDate = new Date(sav.dateCreation);
                              const isRecent = (Date.now() - savDate.getTime()) < (90 * 24 * 60 * 60 * 1000);
                              const isSupabase = sav._source === 'supabase';

                              return (
                                <div
                                  key={idx}
                                  className={`bg-white rounded-lg p-3 border ${
                                    isRecent ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {isSupabase && (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                            CRM
                                          </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          sav.etat?.libelle === 'Intervention archivée'
                                            ? 'bg-gray-100 text-gray-700'
                                            : sav.etat?.libelle === 'Intervention terminée'
                                              ? 'bg-green-100 text-green-700'
                                              : sav.etat?.libelle === 'En cours'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {sav.etat?.libelle || 'En cours'}
                                        </span>
                                        {sav.rubrique && (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                            {sav.rubrique.libelle}
                                          </span>
                                        )}
                                        {isRecent && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                            <AlertTriangle className="w-3 h-3" />
                                            Récent
                                          </span>
                                        )}
                                        {sav._urgent && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                            <AlertTriangle className="w-3 h-3" />
                                            Urgent
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-xs text-gray-500 mb-2">
                                        <Calendar className="w-3 h-3 inline mr-1" />
                                        {savDate.toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </div>

                                      {sav.observation && (
                                        <p className="text-sm text-gray-700 mb-2">{sav.observation}</p>
                                      )}

                                      {isSupabase && (sav._site || sav._brand || sav._model) && (
                                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                          {sav._site && (
                                            <span>
                                              <MapPin className="w-3 h-3 inline mr-1" />
                                              {sav._site}
                                            </span>
                                          )}
                                          {sav._brand && (
                                            <span>
                                              <Tag className="w-3 h-3 inline mr-1" />
                                              {sav._brand}
                                            </span>
                                          )}
                                          {sav._model && (
                                            <span className="text-gray-500">
                                              {sav._model}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {sav.instructions && Object.keys(sav.instructions).length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <p className="text-xs font-semibold text-gray-600 mb-1">Instructions:</p>
                                          <div className="space-y-1">
                                            {Object.entries(sav.instructions).map(([key, value]: [string, any]) => (
                                              value && (
                                                <p key={key} className="text-xs text-gray-600 pl-2 border-l-2 border-blue-300">
                                                  {value}
                                                </p>
                                              )
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {sav.commentaireStatut && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <p className="text-xs font-semibold text-gray-600">Commentaire:</p>
                                          <p className="text-xs text-gray-600">{sav.commentaireStatut}</p>
                                        </div>
                                      )}

                                      {sav.dureeIntervention && (
                                        <div className="mt-2 text-xs text-gray-500">
                                          <Clock className="w-3 h-3 inline mr-1" />
                                          Durée: {sav.dureeIntervention}
                                        </div>
                                      )}

                                      {/* Interventions Extrabat (rdvs) avec rapports */}
                                      {sav.rdvs && sav.rdvs.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Interventions ({sav.rdvs.length})
                                          </p>
                                          <div className="space-y-2">
                                            {sav.rdvs.map((rdvWrapper: any, rdvIdx: number) => {
                                              const rdv = rdvWrapper.rdv || rdvWrapper;
                                              const hasReport = rdv.notes && rdv.notes.trim();

                                              return (
                                                <div key={rdv.id || rdvIdx} className="bg-gray-50 rounded p-2 border border-gray-200">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-900">
                                                      {rdv.debut ? new Date(rdv.debut).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                      }) : 'Date non définie'}
                                                    </span>
                                                    {rdv.debut && (
                                                      <span className="text-xs text-gray-500">
                                                        {new Date(rdv.debut).toLocaleTimeString('fr-FR', {
                                                          hour: '2-digit',
                                                          minute: '2-digit'
                                                        })}
                                                        {rdv.fin && ` - ${new Date(rdv.fin).toLocaleTimeString('fr-FR', {
                                                          hour: '2-digit',
                                                          minute: '2-digit'
                                                        })}`}
                                                      </span>
                                                    )}
                                                    {hasReport && (
                                                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        ✓ Rapport
                                                      </span>
                                                    )}
                                                  </div>

                                                  {rdv.titre && (
                                                    <p className="text-xs text-gray-600 mb-1">{rdv.titre}</p>
                                                  )}

                                                  {/* Rapport d'intervention */}
                                                  {hasReport && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 bg-white rounded p-2">
                                                      <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0 mt-0.5">
                                                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                        </div>
                                                        <div className="flex-1">
                                                          <p className="text-xs font-medium text-gray-700 mb-1">
                                                            Rapport d'intervention :
                                                          </p>
                                                          <p className="text-xs text-gray-900 whitespace-pre-wrap">
                                                            {rdv.notes}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {ouvrage.venduPar && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="text-sm">
                          <span className="text-gray-600">Vendu par:</span>
                          <span className="ml-2 text-gray-900 font-medium">{ouvrage.venduPar.nom}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PiecesTab({ data }: { data: DashboardData }) {
  const [filtreType, setFiltreType] = useState<string>('all');
  const [filtreStatut, setFiltreStatut] = useState<string>('all');
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  const pieces = data.pieces || [];

  // Types de pièces
  const typeLabels: Record<number, { label: string; color: string; icon: string }> = {
    1: { label: 'Devis', color: 'blue', icon: '📋' },
    2: { label: 'Commande', color: 'purple', icon: '📦' },
    4: { label: 'Facture', color: 'green', icon: '💰' },
    6: { label: 'Avoir', color: 'red', icon: '↩️' },
  };

  // Filtrer et trier les pièces (les plus récentes en premier)
  const piecesFiltrees = pieces
    .filter((p: any) => {
      if (filtreType !== 'all' && p.type.toString() !== filtreType) return false;
      if (filtreStatut === 'non_transforme' && (p.type !== 1 || p.transformationState !== 0)) return false;
      if (filtreStatut === 'non_reglee' && (p.type !== 4 || p.etatLettrage === 2)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  // Statistiques
  const stats = {
    devis: pieces.filter((p: any) => p.type === 1).length,
    devisNonTransformes: pieces.filter((p: any) => p.type === 1 && p.transformationState === 0).length,
    commandes: pieces.filter((p: any) => p.type === 2).length,
    factures: pieces.filter((p: any) => p.type === 4).length,
    facturesNonReglees: pieces.filter((p: any) => p.type === 4 && p.etatLettrage !== 2).length,
    avoirs: pieces.filter((p: any) => p.type === 6).length,
    totalCA: pieces.filter((p: any) => p.type === 4).reduce((sum: number, p: any) => sum + (p.totalTTC || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Devis</div>
          <div className="text-2xl font-bold text-blue-900">{stats.devis}</div>
          {stats.devisNonTransformes > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              {stats.devisNonTransformes} non transformés
            </div>
          )}
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600 mb-1">Commandes</div>
          <div className="text-2xl font-bold text-purple-900">{stats.commandes}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 mb-1">Factures</div>
          <div className="text-2xl font-bold text-green-900">{stats.factures}</div>
          {stats.facturesNonReglees > 0 && (
            <div className="text-xs text-green-600 mt-1">
              {stats.facturesNonReglees} non réglées
            </div>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">CA Total (TTC)</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalCA.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <select
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="all">Tous les types</option>
          <option value="1">Devis</option>
          <option value="2">Commandes</option>
          <option value="4">Factures</option>
          <option value="6">Avoirs</option>
        </select>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="all">Tous les statuts</option>
          <option value="non_transforme">Devis non transformés</option>
          <option value="non_reglee">Factures non réglées</option>
        </select>

        <div className="text-sm text-gray-600 flex items-center ml-auto">
          {piecesFiltrees.length} pièce(s)
        </div>
      </div>

      {/* Liste des pièces */}
      <div className="space-y-3">
        {piecesFiltrees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune pièce trouvée
          </div>
        ) : (
          piecesFiltrees.map((piece: any) => {
            const typeInfo = typeLabels[piece.type] || { label: 'Inconnu', color: 'gray', icon: '❓' };
            const isExpanded = expandedPiece === piece.id;

            return (
              <div
                key={piece.id}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedPiece(isExpanded ? null : piece.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{typeInfo.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                              {typeInfo.label}
                            </span>
                            <span className="font-medium text-gray-900">{piece.code}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{piece.titre}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Date:</span>{' '}
                          <span className="text-gray-900">
                            {new Date(piece.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Montant HT:</span>{' '}
                          <span className="text-gray-900 font-medium">
                            {piece.totalHT?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Montant TTC:</span>{' '}
                          <span className="text-gray-900 font-bold">
                            {piece.totalTTC?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                        <div>
                          {piece.type === 1 && (
                            <>
                              <span className="text-gray-500">Transformation:</span>{' '}
                              <span className={`font-medium ${
                                piece.transformationState === 0 ? 'text-orange-600' :
                                piece.transformationState === 1 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {piece.transformationState === 0 ? 'Non transformé' :
                                 piece.transformationState === 1 ? 'Partiellement' :
                                 'Transformé'}
                              </span>
                            </>
                          )}
                          {piece.type === 4 && (
                            <>
                              <span className="text-gray-500">Règlement:</span>{' '}
                              <span className={`font-medium ${
                                piece.etatLettrage === 2 ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {piece.etatLettrage === 2 ? 'Réglé' : 'Non réglé'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button className="ml-4 text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Montant TVA:</span>{' '}
                        <span className="text-gray-900">
                          {piece.totalTVA?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Remise pied:</span>{' '}
                        <span className="text-gray-900">{piece.remisePied || '0'} €</span>
                      </div>
                      {piece.echeance && (
                        <div>
                          <span className="text-gray-500">Échéance:</span>{' '}
                          <span className="text-gray-900">
                            {new Date(piece.echeance).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {piece.modeReglement && (
                        <div>
                          <span className="text-gray-500">Mode règlement:</span>{' '}
                          <span className="text-gray-900">{piece.modeReglement.libelle}</span>
                        </div>
                      )}
                      {piece.statutDevis && (
                        <div>
                          <span className="text-gray-500">Statut devis:</span>{' '}
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: piece.statutDevis.couleur + '20',
                              color: piece.statutDevis.couleur,
                            }}
                          >
                            {piece.statutDevis.libelle}
                          </span>
                        </div>
                      )}
                      {piece.lettrage && (
                        <div>
                          <span className="text-gray-500">Lettrage:</span>{' '}
                          <span className="text-gray-900 font-mono">{piece.lettrage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SAVTab({ data }: { data: DashboardData }) {
  const [expandedSAV, setExpandedSAV] = useState<string | null>(null);

  // Collecter tous les SAV : ceux du CRM + ceux d'Extrabat
  const allSAV: any[] = [];

  // Ajouter les SAV du CRM
  data.savRequests.forEach((sav: any) => {
    allSAV.push({
      ...sav,
      _source: 'supabase',
      _key: `sav-${sav.id}`
    });
  });

  // Ajouter les SAV Extrabat depuis les ouvrages
  data.ouvrages.forEach((ouvrage: any) => {
    if (ouvrage.sav && Array.isArray(ouvrage.sav)) {
      ouvrage.sav.forEach((savExtrabat: any) => {
        if (!savExtrabat._source || savExtrabat._source !== 'supabase') {
          allSAV.push({
            ...savExtrabat,
            _source: 'extrabat',
            _key: `sav-extrabat-${savExtrabat.id}`,
            _ouvrage: ouvrage
          });
        }
      });
    }
  });

  // Filtrer uniquement les SAV actifs (non archivés)
  const activeSAV = allSAV.filter((sav: any) => {
    const isArchived = !!sav.archived_at ||
                      sav.etat?.libelle === 'Intervention archivée' ||
                      sav.etat?.libelle?.toLowerCase().includes('archivé');
    return !isArchived;
  });

  // Trier par date décroissante
  activeSAV.sort((a, b) => {
    const dateA = new Date(a.dateCreation || a.requested_at).getTime();
    const dateB = new Date(b.dateCreation || b.requested_at).getTime();
    return dateB - dateA;
  });

  if (activeSAV.length === 0) {
    return <EmptyState message="Aucune demande SAV active trouvée pour ce client" />;
  }

  return (
    <div className="space-y-3">
      {activeSAV.map((sav: any) => {
        const isArchived = !!sav.archived_at || sav.etat?.libelle === 'Intervention archivée';
        const isExtrabat = sav._source === 'extrabat';

        return (
          <div
            key={sav._key}
            className={`border rounded-lg overflow-hidden ${
              isArchived
                ? 'border-gray-300 bg-gray-50 opacity-60'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div
              onClick={() => setExpandedSAV(expandedSAV === sav._key ? null : sav._key)}
              className={`p-4 cursor-pointer ${
                isArchived ? 'hover:bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Badge source */}
                    {isExtrabat && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Extrabat
                      </span>
                    )}
                    {!isExtrabat && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        CRM
                      </span>
                    )}

                    {/* Badge statut */}
                    {isArchived && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Archivé
                      </span>
                    )}
                    {!isArchived && sav.etat?.libelle && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sav.etat.libelle.toLowerCase().includes('terminée') || sav.etat.libelle.toLowerCase().includes('résolu') ? 'bg-green-100 text-green-800' :
                        sav.etat.libelle.toLowerCase().includes('cours') ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sav.etat.libelle}
                      </span>
                    )}
                    {!isArchived && sav.status && !sav.etat?.libelle && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sav.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        sav.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sav.status}
                      </span>
                    )}
                    {sav.urgent && !isArchived && <span className="text-red-600 font-medium">🔴 Urgent</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    {isExtrabat && sav._ouvrage && (
                      <div><span className="font-medium">Ouvrage:</span> {sav._ouvrage.libelle}</div>
                    )}
                    {!isExtrabat && sav.site && (
                      <div><span className="font-medium">Site:</span> {sav.site}</div>
                    )}
                    {sav.rubrique?.libelle && (
                      <div><span className="font-medium">Type:</span> {sav.rubrique.libelle}</div>
                    )}
                    {!sav.rubrique?.libelle && sav.system_type && (
                      <div><span className="font-medium">Type:</span> {sav.system_type}</div>
                    )}
                    {sav.system_brand && <div><span className="font-medium">Marque:</span> {sav.system_brand}</div>}
                    {sav.system_model && <div><span className="font-medium">Modèle:</span> {sav.system_model}</div>}
                  </div>

                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {sav.observation || sav.problem_desc}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {new Date(sav.dateCreation || sav.requested_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

          {expandedSAV === sav._key && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
              {/* Description complète */}
              {(sav.problem_desc || sav.observation) && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Description complète</h5>
                  <p className="text-sm text-gray-700">{sav.observation || sav.problem_desc}</p>
                </div>
              )}

              {/* Pré-diagnostic IA (uniquement pour SAV CRM) */}
              {sav.prediagnostic && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                    🤖 Pré-diagnostic IA
                  </h5>
                  <p className="text-sm text-gray-700">{sav.prediagnostic}</p>
                </div>
              )}

              {/* Informations Extrabat */}
              {isExtrabat && sav.commentaireStatut && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Commentaire statut</h5>
                  <p className="text-sm text-gray-700">{sav.commentaireStatut}</p>
                </div>
              )}

              {/* Interventions CRM (sav_interventions) */}
              {sav.sav_interventions && sav.sav_interventions.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Interventions CRM
                  </h5>
                  <div className="space-y-2">
                    {sav.sav_interventions.map((intervention: any) => (
                      <div key={intervention.id} className="text-sm bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {new Date(intervention.started_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {intervention.notes && <p className="text-gray-700 mt-1">{intervention.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions Extrabat (rdvs) avec rapports */}
              {isExtrabat && sav.rdvs && sav.rdvs.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Interventions Extrabat ({sav.rdvs.length})
                  </h5>
                  <div className="space-y-2">
                    {sav.rdvs.map((rdvWrapper: any, index: number) => {
                      const rdv = rdvWrapper.rdv || rdvWrapper;
                      const hasReport = rdv.notes && rdv.notes.trim();

                      return (
                        <div key={rdv.id || index} className="text-sm bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {rdv.debut ? new Date(rdv.debut).toLocaleDateString('fr-FR', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) : 'Date non définie'}
                                </span>
                                {rdv.debut && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(rdv.debut).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {rdv.fin && ` - ${new Date(rdv.fin).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}`}
                                  </span>
                                )}
                                {hasReport && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Rapport
                                  </span>
                                )}
                              </div>

                              {rdv.titre && (
                                <p className="text-xs text-gray-600 mb-1">
                                  {rdv.titre}
                                </p>
                              )}

                              {rdv.observation && rdv.observation.trim() && (
                                <p className="text-xs text-gray-600 mb-2 italic">
                                  {rdv.observation}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Rapport d'intervention (notes) */}
                          {hasReport && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-700 mb-1">
                                    Rapport d'intervention :
                                  </p>
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {rdv.notes}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Adresse */}
                          {rdv.adresse && (rdv.adresse.description || rdv.adresse.ville) && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {rdv.adresse.description && rdv.adresse.description}
                                {rdv.adresse.description && rdv.adresse.ville && ', '}
                                {rdv.adresse.ville && `${rdv.adresse.codePostal || ''} ${rdv.adresse.ville}`.trim()}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aucune intervention */}
              {!sav.sav_interventions?.length && (!sav.rdvs || sav.rdvs.length === 0) && (
                <div className="text-sm text-gray-500 italic">
                  Aucune intervention enregistrée
                </div>
              )}
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}

function LtvTab({ data }: { data: DashboardData }) {
  const ltvActions = data.ltvActions || [];
  const ltvActif = data.prospect.ltv_actif;

  console.log('🔍 [LtvTab] Données reçues:', {
    clientId: data.prospect.id,
    ltvActif,
    nombreActions: ltvActions.length,
    ltv_score: data.prospect.ltv_score
  });

  const totalActions = ltvActions.length;
  const actionsFaites = ltvActions.filter((a: any) => a.statut === 'fait').length;
  const actionsEnCours = ltvActions.filter((a: any) => a.statut === 'en_cours').length;
  const actionsAFaire = ltvActions.filter((a: any) => a.statut === 'a_faire').length;

  const getStatusBadge = (statut: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      a_faire: { color: 'bg-gray-100 text-gray-800', label: 'À faire' },
      en_cours: { color: 'bg-yellow-100 text-yellow-800', label: 'En cours' },
      fait: { color: 'bg-green-100 text-green-800', label: 'Fait' },
      refus: { color: 'bg-red-100 text-red-800', label: 'Refusé' }
    };
    const badge = badges[statut] || { color: 'bg-gray-100 text-gray-800', label: statut };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  const getCategorieIcon = (categorie: string) => {
    const icons: Record<string, any> = {
      reputation: Star,
      parrainage: Users,
      contrat_recurrent: RefreshCw,
      upsell: TrendingUp
    };
    const Icon = icons[categorie] || Package;
    return <Icon className="w-4 h-4" />;
  };

  const getCategorieLabel = (categorie: string) => {
    const labels: Record<string, string> = {
      reputation: 'Réputation',
      parrainage: 'Parrainage',
      contrat_recurrent: 'Contrat récurrent',
      upsell: 'Upsell'
    };
    return labels[categorie] || categorie;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      avis_google_envoye: 'Demande avis Google envoyée',
      avis_google_recu: 'Avis Google reçu',
      avis_google_repondu: 'Avis Google répondu',
      parrainage_propose: 'Parrainage proposé',
      coupon_envoye: 'Coupon envoyé',
      parrainage_accepte: 'Parrainage accepté',
      maintenance_propose: 'Maintenance proposée',
      contrat_maintenance_signe: 'Contrat maintenance signé',
      telesurveillance_propose: 'Télésurveillance proposée',
      telesurveillance_active: 'Télésurveillance active',
      detecteurs_ext_proposes: 'Détecteurs extérieurs proposés',
      detecteurs_ext_installes: 'Détecteurs extérieurs installés',
      detecteurs_incendie_proposes: 'Détecteurs incendie proposés',
      detecteurs_incendie_installes: 'Détecteurs incendie installés',
      protection_perimetre_proposee: 'Protection périmètre proposée',
      protection_perimetre_installee: 'Protection périmètre installée',
      maintenance_proposee: 'Maintenance proposée',
      maintenance_planifiee: 'Maintenance planifiée',
      boules_blockfire_proposees: 'Boules Block\'Fire proposées',
      boules_blockfire_installees: 'Boules Block\'Fire installées',
      detection_inondation_proposee: 'Détection inondation proposée',
      detection_inondation_installee: 'Détection inondation installée',
      electrovanne_proposee: 'Electrovanne proposée',
      electrovanne_installee: 'Electrovanne installée'
    };
    return labels[action] || action;
  };

  if (!ltvActif) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-3">
            Ce client n'est pas encore inscrit au programme d'optimisation LTV.
          </p>
          <button
            onClick={async () => {
              try {
                const { supabaseApi } = await import('../services/supabaseApi');
                await supabaseApi.enrollClientInLtv(data.prospect.id);
                alert('Client inscrit au programme LTV avec succès. Rechargez la page pour voir les actions.');
                window.location.reload();
              } catch (error) {
                console.error('Erreur inscription LTV:', error);
                alert('Erreur lors de l\'inscription au programme LTV');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Inscrire au programme LTV
          </button>
        </div>
      </div>
    );
  }

  if (totalActions === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Ce client est inscrit au programme LTV mais aucune action n'a encore été générée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Actions réalisées</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{actionsFaites}</p>
          <p className="text-xs text-green-700 mt-1">sur {totalActions} actions</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-900">En cours</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{actionsEnCours}</p>
          <p className="text-xs text-yellow-700 mt-1">actions en traitement</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">À faire</span>
            <AlertCircle className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{actionsAFaire}</p>
          <p className="text-xs text-gray-700 mt-1">actions planifiées</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Actions LTV pour {data.prospect.nom} {data.prospect.prenom || ''}
            </h3>
            {data.prospect.ltv_date_inscription && (
              <p className="text-sm text-gray-600">
                Inscrit le {new Date(data.prospect.ltv_date_inscription).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              data.prospect.ltv_score >= 8
                ? 'bg-green-100 text-green-800'
                : data.prospect.ltv_score >= 4
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Score: {data.prospect.ltv_score || 0}/10 - {
                data.prospect.ltv_score >= 8
                  ? 'Optimisé'
                  : data.prospect.ltv_score >= 4
                  ? 'Partiellement optimisé'
                  : 'Potentiel inexploité'
              }
            </span>
          </div>
        </div>

        {(() => {
          const actionsParCategorie = ltvActions.reduce((acc: any, action: any) => {
            if (!acc[action.categorie]) {
              acc[action.categorie] = [];
            }
            acc[action.categorie].push(action);
            return acc;
          }, {});

          return Object.entries(actionsParCategorie).map(([categorie, actions]: [string, any]) => (
                <div key={categorie} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-50 rounded">
                      {getCategorieIcon(categorie)}
                    </div>
                    <h4 className="font-medium text-gray-900">{getCategorieLabel(categorie)}</h4>
                  </div>

                  <div className="space-y-2 ml-8">
                    {actions.map((action: any) => (
                      <div
                        key={action.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getActionLabel(action.action)}
                          </p>
                          {action.commentaires && (
                            <p className="text-xs text-gray-600 mt-1">{action.commentaires}</p>
                          )}
                          {action.parrainages_obtenus > 0 && (
                            <p className="text-xs text-green-600 mt-1 font-medium">
                              {action.parrainages_obtenus} parrainage(s) obtenu(s)
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {action.date_echeance && (
                              <span>
                                Échéance: {new Date(action.date_echeance).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                            {action.date_action && (
                              <span>
                                Fait le: {new Date(action.date_action).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-3">{getStatusBadge(action.statut)}</div>
                      </div>
                    ))}
                  </div>
                </div>
            ));
        })()}
      </div>
    </div>
  );
}

function MaintenanceTab({ data }: { data: DashboardData }) {
  const [expandedMaintenance, setExpandedMaintenance] = useState<string | null>(null);

  if (data.maintenance.length === 0) {
    return <EmptyState message="Aucun contrat de maintenance trouvé pour ce client" />;
  }

  return (
    <div className="space-y-3">
      {data.maintenance.map((contract: any) => (
        <div key={contract.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            onClick={() => setExpandedMaintenance(expandedMaintenance === contract.id ? null : contract.id)}
            className="p-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">{contract.site}</span>
                <p className="text-gray-600">{contract.system_type}</p>
              </div>
              <div>
                <span className="text-gray-600">Montant annuel:</span>
                <p className="font-medium">
                  {contract.annual_amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {contract.status}
                </span>
              </div>
            </div>
          </div>

          {expandedMaintenance === contract.id && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
              {contract.observations && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Observations</h5>
                  <p className="text-sm text-gray-700">{contract.observations}</p>
                </div>
              )}

              {contract.maintenance_interventions && contract.maintenance_interventions.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Interventions maintenance</h5>
                  <div className="space-y-2">
                    {contract.maintenance_interventions.map((intervention: any) => (
                      <div key={intervention.id} className="text-sm bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {intervention.scheduled_at && `Planifiée: ${new Date(intervention.scheduled_at).toLocaleDateString('fr-FR')}`}
                          </span>
                          {intervention.completed_at && (
                            <span className="text-green-600">
                              ✓ Réalisée le {new Date(intervention.completed_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {intervention.notes && <p className="text-gray-700">{intervention.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RdvsTab({ extrabatId }: { extrabatId: number }) {
  const [rdvs, setRdvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRdv, setExpandedRdv] = useState<number | null>(null);

  useEffect(() => {
    loadRdvs();
  }, [extrabatId]);

  const loadRdvs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extrabat-proxy?endpoint=/v3/client/${extrabatId}?include=rdvsClient`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des RDV');
      }

      const data = await response.json();
      const rdvsData = data.rdvs || [];

      const sortedRdvs = rdvsData.sort((a: any, b: any) => {
        const dateA = a.debut ? new Date(a.debut).getTime() : 0;
        const dateB = b.debut ? new Date(b.debut).getTime() : 0;
        return dateB - dateA;
      });

      setRdvs(sortedRdvs);
    } catch (err) {
      console.error('Erreur chargement RDV:', err);
      setError('Impossible de charger l\'historique des rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categorie: string) => {
    const colors: Record<string, string> = {
      'COMMERCIAL': 'bg-blue-100 text-blue-800 border-blue-200',
      'SAV': 'bg-red-100 text-red-800 border-red-200',
      'SERVICE': 'bg-green-100 text-green-800 border-green-200',
      'TACHE': 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[categorie] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryIcon = (categorie: string) => {
    switch (categorie) {
      case 'COMMERCIAL':
        return Briefcase;
      case 'SAV':
        return Wrench;
      case 'SERVICE':
        return CheckCircle;
      case 'TACHE':
        return Calendar;
      default:
        return Calendar;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (rdvs.length === 0) {
    return <EmptyState message="Aucun rendez-vous trouvé pour ce client" />;
  }

  return (
    <div className="space-y-3">
      {rdvs.map((rdv) => {
        const Icon = getCategoryIcon(rdv.categorie);
        const isExpanded = expandedRdv === rdv.id;

        return (
          <div key={rdv.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              onClick={() => setExpandedRdv(isExpanded ? null : rdv.id)}
              className="p-4 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(rdv.categorie)}`}>
                        {rdv.categorie}
                      </span>
                      {rdv.couleur && (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium border"
                          style={{
                            backgroundColor: rdv.couleur.code + '20',
                            borderColor: rdv.couleur.code,
                            color: rdv.couleur.code
                          }}
                        >
                          {rdv.couleur.libelle}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {rdv.titre || 'Sans titre'}
                    </h4>
                    {rdv.observation && (
                      <p className="text-sm text-gray-600 mb-2">{rdv.observation}</p>
                    )}
                    {rdv.adresse?.description && (
                      <div className="flex items-start gap-1 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-line">{rdv.adresse.description}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  {rdv.debut ? (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(rdv.debut).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(rdv.debut).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {rdv.fin && (
                          <> - {new Date(rdv.fin).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Date non définie</div>
                  )}
                  {rdv.journee && (
                    <div className="text-xs text-blue-600 mt-1">Journée entière</div>
                  )}
                </div>
              </div>
            </div>

            {isExpanded && rdv.notes && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Notes</h5>
                <p className="text-sm text-gray-700 whitespace-pre-line">{rdv.notes}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

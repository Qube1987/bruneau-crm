import { useState, useEffect, useRef } from 'react';
import { Search, User, MapPin, Phone, Building } from 'lucide-react';
import { supabase } from '../lib/supabaseClients';
import { useNavigate } from 'react-router-dom';
import { extrabatApi } from '../services/extrabatApi';

interface Client {
  id: string;
  extrabat_id: number;
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  ville?: string;
  adresse?: string;
  activite?: string;
  civilite?: string;
  source?: 'supabase' | 'extrabat';
}

export default function GlobalClientSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchingExtrabat, setSearchingExtrabat] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchClients();
      } else {
        setClients([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchClients = async () => {
    try {
      setLoading(true);

      // Recherche dans Supabase
      const { data: supabaseData, error } = await supabase
        .from('clients')
        .select('id, extrabat_id, nom, prenom, telephone, email, adresse, ville, code_postal, civilite, activite')
        .or(`nom.ilike.%${searchQuery}%,ville.ilike.%${searchQuery}%,telephone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,activite.ilike.%${searchQuery}%,adresse.ilike.%${searchQuery}%`)
        .not('extrabat_id', 'is', null)
        .order('nom')
        .limit(15);

      if (error) throw error;

      const supabaseClients = (supabaseData || []).map(client => ({
        ...client,
        source: 'supabase' as const
      }));

      // Si pas de résultats dans Supabase, chercher dans Extrabat
      if (supabaseClients.length === 0) {
        try {
          setSearchingExtrabat(true);
          const extrabatData = await extrabatApi.searchClients(searchQuery);
          const extrabatClients = (extrabatData.clients || extrabatData || [])
            .filter((client: any) => client.id)
            .map((client: any) => {
              // Extraire le premier téléphone si disponible
              let telephone = '';
              if (client.telephones && Array.isArray(client.telephones) && client.telephones.length > 0) {
                telephone = client.telephones[0].numero || client.telephones[0].telephone || '';
              } else if (client.telephone) {
                telephone = client.telephone;
              }

              // Extraire la première adresse si disponible
              let ville = '';
              let adresse = '';
              if (client.adresses && Array.isArray(client.adresses) && client.adresses.length > 0) {
                const firstAddress = client.adresses[0];
                ville = firstAddress.ville || firstAddress.city || '';
                adresse = firstAddress.adresse || firstAddress.rue || firstAddress.street || '';
              } else if (client.ville) {
                ville = client.ville;
              }

              return {
                id: `extrabat-${client.id}`,
                extrabat_id: client.id,
                nom: client.nom || client.name || client.raisonSociale || '',
                prenom: client.prenom || client.firstName || '',
                telephone,
                email: client.email || '',
                ville,
                adresse,
                activite: client.activite || client.activity || '',
                civilite: client.civilite || client.title || '',
                source: 'extrabat' as const
              };
            })
            .filter((client: Client) => client.nom)
            .slice(0, 15);

          setClients(extrabatClients);
        } catch (extrabatError) {
          console.error('Erreur recherche Extrabat:', extrabatError);
          setClients([]);
        } finally {
          setSearchingExtrabat(false);
        }
      } else {
        setClients(supabaseClients);
      }

      setShowResults(true);
    } catch (error) {
      console.error('Erreur recherche clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    navigate(`/dashboard-client/${client.extrabat_id}`);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
          className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Rechercher un client (nom, ville, téléphone...)"
        />
      </div>

      {loading && showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500 text-sm">
            {searchingExtrabat ? 'Recherche dans Extrabat...' : 'Recherche en cours...'}
          </div>
        </div>
      )}

      {showResults && !loading && searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {clients.length > 0 ? (
            clients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {client.civilite ? `${client.civilite} ` : ''}
                        {client.nom} {client.prenom || ''}
                      </span>
                      {client.source === 'extrabat' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          Extrabat
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      {client.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.ville}
                        </span>
                      )}
                      {client.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.telephone}
                        </span>
                      )}
                      {client.activite && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {client.activite}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    ID: {client.extrabat_id}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm p-4">
              Aucun client trouvé
            </div>
          )}
        </div>
      )}
    </div>
  );
}

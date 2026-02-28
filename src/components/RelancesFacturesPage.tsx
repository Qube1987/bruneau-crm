import { useState, useEffect } from 'react';
import { FileText, Mail, Phone, CheckCircle, XCircle, Clock, AlertCircle, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Euro, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const EXTRABAT_API_BASE = '/extrabat-api';
const API_KEY = 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3';
const SECURITY_KEY = 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c';

const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 1000;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-EXTRABAT-API-KEY': API_KEY,
  'X-EXTRABAT-SECURITY': SECURITY_KEY,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Facture {
  id: number;
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  montantHT: number;
  montantTTC: number;
  etatLettrage: number;
  etatLettrageLibelle: string;
  clientId: number;
  clientNom?: string;
  montantRegle?: number;
  resteAPayer?: number;
}

type SortField = 'numero' | 'dateEmission' | 'montantTTC' | 'clientNom' | 'etatLettrage';
type SortDirection = 'asc' | 'desc';

export default function RelancesFacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [filteredFactures, setFilteredFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [sortField, setSortField] = useState<SortField>('dateEmission');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    loadFactures();
  }, [selectedMonth]);

  useEffect(() => {
    filterAndSortFactures();
  }, [factures, searchTerm, statusFilter, sortField, sortDirection]);

  const loadFactures = async () => {
    try {
      setLoading(true);
      setLoadingProgress({ current: 0, total: 0 });

      const dateDebut = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const dateDebutStr = dateDebut.toISOString().split('T')[0];

      const dateFin = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      const dateFinStr = dateFin.toISOString().split('T')[0];

      console.log('🔍 Chargement des factures du mois:', {
        mois: selectedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        dateDebut: dateDebutStr,
        dateFin: dateFinStr
      });

      // Une seule requête avec max 100 résultats (limite Extrabat)
      const url = `${EXTRABAT_API_BASE}/v1/pieces?types=facture&date_debut=${dateDebutStr}&date_fin=${dateFinStr}&nbitem=100&numitem=1`;
      console.log('📄 URL requête:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      const allPieces = data.pieces || data || [];

      console.log(`✅ ${allPieces.length} factures reçues du mois`);

      console.log(`📊 Total factures chargées: ${allPieces.length}`);

      // Log statistiques etatLettrage
      const stats = {
        etat0: allPieces.filter((p: any) => (p.etatLettrage ?? p.etat_lettrage ?? p.etat) === 0).length,
        etat1: allPieces.filter((p: any) => (p.etatLettrage ?? p.etat_lettrage ?? p.etat) === 1).length,
        etat2: allPieces.filter((p: any) => (p.etatLettrage ?? p.etat_lettrage ?? p.etat) === 2).length,
        etatNull: allPieces.filter((p: any) => (p.etatLettrage ?? p.etat_lettrage ?? p.etat) == null).length,
      };
      console.log('📊 Statistiques etatLettrage:', stats);

      // Log pour vérifier les factures GEC
      const gecFactures = allPieces.filter((p: any) =>
        (p.code || p.numero || '').includes('FA0001658') ||
        (p.code || p.numero || '').includes('FA0001659') ||
        (p.code || p.numero || '').includes('FA0001660')
      );
      console.log('🔍 Factures GEC trouvées:', gecFactures);
      gecFactures.forEach((f: any) => {
        console.log(`📄 Facture ${f.code || f.numero}:`, {
          etatLettrage: f.etatLettrage || f.etat_lettrage,
          montantTTC: f.totalTTC || f.montantTTC,
          dateEmission: f.dateEmission || f.date_emission,
          fullData: f
        });
      });

      const totalPieces = allPieces.length;
      setLoadingProgress({ current: 0, total: totalPieces });

      const facturesWithClients: Facture[] = [];

      for (let i = 0; i < allPieces.length; i += BATCH_SIZE) {
        const batch = allPieces.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (piece: any) => {
            const numero = piece.code || piece.numero || piece.reference || `F-${piece.id}`;

            // Vérifier TOUTES les possibilités pour etatLettrage
            const etatLettrage = piece.etatLettrage ?? piece.etat_lettrage ?? piece.etat ?? null;

            // Log détaillé pour debug
            if (numero.includes('FA000165')) {
              console.log(`🔍 DEBUG Facture ${numero}:`, {
                etatLettrage,
                pieceEtatLettrage: piece.etatLettrage,
                pieceEtat_lettrage: piece.etat_lettrage,
                pieceEtat: piece.etat,
                allKeys: Object.keys(piece),
                fullPiece: piece
              });
            }

            // IMPORTANT: Ne garder QUE les factures impayées (etatLettrage !== 2)
            // etatLettrage = 0 : Non lettré (impayé)
            // etatLettrage = 1 : Partiellement lettré
            // etatLettrage = 2 : Totalement lettré (payé)
            // On exclut seulement les factures totalement payées (2)
            if (etatLettrage === 2) {
              console.log(`⚠️ Facture ${numero} EXCLUE (totalement payée, etatLettrage = 2)`);
              return null;
            }

            console.log(`✅ Facture ${numero} INCLUSE (etatLettrage = ${etatLettrage})`);

            let clientNom = 'Client inconnu';

            if (piece.id) {
              try {
                const pieceUrl = `${EXTRABAT_API_BASE}/v1/piece/${piece.id}`;
                const pieceResponse = await fetch(pieceUrl, {
                  method: 'GET',
                  headers: getHeaders(),
                });

                if (pieceResponse.ok) {
                  const pieceData = await pieceResponse.json();
                  clientNom = pieceData.clientNom || pieceData.client?.nom || 'Client inconnu';
                }
              } catch (error) {
                console.error(`Erreur chargement client pour facture ${piece.id}:`, error);
              }
            }

            const montantTTC = parseFloat(piece.totalTTC || piece.montantTTC || piece.montant_ttc || 0);
            const montantRegle = parseFloat(piece.montantRegle || piece.montant_regle || 0);
            const resteAPayer = montantTTC - montantRegle;

            return {
              id: piece.id,
              numero: piece.code || piece.numero || piece.reference || `F-${piece.id}`,
              dateEmission: piece.dateEmission || piece.date_emission || piece.date || '',
              dateEcheance: piece.dateEcheance || piece.date_echeance || '',
              montantHT: parseFloat(piece.totalHT || piece.montantHT || piece.montant_ht || 0),
              montantTTC,
              montantRegle,
              resteAPayer,
              etatLettrage,
              etatLettrageLibelle: getEtatLettrageLibelle(etatLettrage),
              clientId: piece.clientId || piece.client_id || 0,
              clientNom,
            };
          })
        );

        // Filtrer les résultats null
        const validResults = batchResults.filter(r => r !== null) as Facture[];
        facturesWithClients.push(...validResults);
        setLoadingProgress({ current: facturesWithClients.length, total: totalPieces });

        if (i + BATCH_SIZE < allPieces.length) {
          console.log(`⏳ Pause de ${DELAY_BETWEEN_BATCHES}ms avant le prochain lot...`);
          await sleep(DELAY_BETWEEN_BATCHES);
        }
      }

      console.log(`✅ ${facturesWithClients.length} factures chargées avec succès`);

      // Log final pour les factures GEC
      const gecFacturesFinales = facturesWithClients.filter(f =>
        f.numero.includes('FA0001658') ||
        f.numero.includes('FA0001659') ||
        f.numero.includes('FA0001660')
      );
      console.log('🔍 Factures GEC dans la liste finale:', gecFacturesFinales);

      setFactures(facturesWithClients);
    } catch (error) {
      console.error('❌ Erreur chargement factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEtatLettrageLibelle = (etat: number): string => {
    switch (etat) {
      case 0: return 'Non lettrée';
      case 1: return 'Partiellement lettrée';
      case 2: return 'Totalement lettrée';
      default: return 'Inconnu';
    }
  };

  const filterAndSortFactures = () => {
    let filtered = [...factures];

    // Filtrer par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        (f.numero || '').toLowerCase().includes(searchLower) ||
        ((f.clientNom || '').toLowerCase().includes(searchLower))
      );
    }

    // Filtrer par statut (toutes les factures chargées sont impayées)
    if (statusFilter === 'unpaid') {
      // Ne montrer que les factures non payées (exclure les partiellement payées)
      filtered = filtered.filter(f => f.etatLettrage === 0);
    }
    // Si 'all', on montre toutes les factures impayées (0 et 1)

    // Trier
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Gestion spéciale pour les dates
      if (sortField === 'dateEmission') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      // Gestion spéciale pour les montants
      if (sortField === 'montantTTC') {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      }

      // Comparaison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredFactures(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={16} className="opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const formatMontant = (montant: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant);
  };

  const getStatutBadge = (facture: Facture) => {
    if (facture.etatLettrage === 2) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Payée
        </span>
      );
    }

    if (facture.etatLettrage === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          Partiellement payée
        </span>
      );
    }

    // Vérifier si en retard
    const echeance = new Date(facture.dateEcheance);
    const now = new Date();
    const isLate = echeance < now;

    if (isLate) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle size={12} className="mr-1" />
          En retard
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <XCircle size={12} className="mr-1" />
        Non payée
      </span>
    );
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prevMonth => {
      const newDate = new Date(prevMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (selectedMonth.getFullYear() < now.getFullYear() ||
      (selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() < now.getMonth())) {
      setSelectedMonth(prevMonth => {
        const newDate = new Date(prevMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
      });
    }
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = (): boolean => {
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth();
  };

  // Toutes les factures chargées sont impayées
  const stats = {
    total: factures.length,
    partielPaye: factures.filter(f => f.etatLettrage === 1).length,
    nonPayees: factures.filter(f => f.etatLettrage === 0).length,
    montantTotal: factures.reduce((sum, f) => sum + f.montantTTC, 0),
    montantRegle: factures.reduce((sum, f) => sum + (f.montantRegle || 0), 0),
    resteAPayer: factures.reduce((sum, f) => sum + (f.resteAPayer || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        {loadingProgress.total > 0 && (
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 mb-2">
              Chargement des factures...
            </p>
            <p className="text-sm text-gray-500">
              {loadingProgress.current} / {loadingProgress.total} factures chargées
            </p>
            <div className="w-64 bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relances Factures</h1>
        <p className="text-gray-600">Factures impayées du mois sélectionné</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {formatMonthYear(selectedMonth)}
            </div>
            <button
              onClick={handleNextMonth}
              disabled={isCurrentMonth()}
              className={`p-2 rounded-lg transition-colors ${isCurrentMonth()
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              title="Mois suivant"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Limite Extrabat: 100 résultats max par mois
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Factures Impayées</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="text-blue-500" size={32} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Non payées: {stats.nonPayees} | Partiellement: {stats.partielPaye}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatMontant(stats.montantTotal)}</p>
            </div>
            <Euro className="text-green-500" size={32} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Réglé: {formatMontant(stats.montantRegle)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reste à Payer</p>
              <p className="text-2xl font-bold text-red-600">{formatMontant(stats.resteAPayer)}</p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.total} facture(s) impayée(s)
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search size={16} className="inline mr-1" />
              Rechercher
            </label>
            <input
              type="text"
              placeholder="Numéro ou nom client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">Toutes les factures impayées</option>
              <option value="unpaid">Non payées seulement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des factures */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('numero')}
                >
                  <div className="flex items-center gap-2">
                    Numéro {getSortIcon('numero')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('clientNom')}
                >
                  <div className="flex items-center gap-2">
                    Client {getSortIcon('clientNom')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dateEmission')}
                >
                  <div className="flex items-center gap-2">
                    Date Émission {getSortIcon('dateEmission')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('montantTTC')}
                >
                  <div className="flex items-center gap-2">
                    Montant TTC {getSortIcon('montantTTC')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reste à Payer
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('etatLettrage')}
                >
                  <div className="flex items-center gap-2">
                    Statut {getSortIcon('etatLettrage')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Aucune facture trouvée</p>
                    <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
                  </td>
                </tr>
              ) : (
                filteredFactures.map((facture) => (
                  <tr key={facture.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{facture.numero}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{facture.clientNom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(facture.dateEmission)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatMontant(facture.montantTTC)}
                      </div>
                      <div className="text-xs text-gray-500">
                        HT: {formatMontant(facture.montantHT)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${facture.resteAPayer && facture.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMontant(facture.resteAPayer || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatutBadge(facture)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:text-blue-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Appeler le client"
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:text-green-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Envoyer un email"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Télécharger la facture"
                        >
                          <Download size={18} />
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

      {/* Résumé bas de page */}
      <div className="mt-4 text-sm text-gray-600">
        Affichage de {filteredFactures.length} facture(s) sur {factures.length} au total
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Phone, MapPin, Mail, Briefcase, Users, ChevronDown, ChevronRight, Building2, Check } from 'lucide-react';
import { Interlocuteur } from '../services/extrabatApi';

export interface AdresseInfo {
    description: string;
    codePostal: string;
    ville: string;
    siteName: string;
}

interface InterlocuteurSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (interlocuteur: Interlocuteur, adresse?: AdresseInfo) => void;
    interlocuteurs: Interlocuteur[];
    adresses?: AdresseInfo[];
    clientName: string;
    /** Si true, affiche aussi la sélection d'adresse */
    showAdresseSelection?: boolean;
}

const InterlocuteurSelectorModal: React.FC<InterlocuteurSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    interlocuteurs,
    adresses = [],
    clientName,
    showAdresseSelection = false,
}) => {
    const [selectedAdresse, setSelectedAdresse] = useState<AdresseInfo | undefined>(undefined);
    const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

    // Réinitialiser quand le modal s'ouvre avec de nouvelles données
    useEffect(() => {
        if (isOpen) {
            setSelectedAdresse(adresses.length > 0 ? adresses[0] : undefined);
            setExpandedSites(new Set(interlocuteurs.map(i => i.site)));
        }
    }, [isOpen, adresses, interlocuteurs]);

    if (!isOpen) return null;

    // Grouper les interlocuteurs par site
    const groupedBySite: Record<string, Interlocuteur[]> = {};
    interlocuteurs.forEach((interloc) => {
        const site = interloc.site || 'Autre';
        if (!groupedBySite[site]) {
            groupedBySite[site] = [];
        }
        groupedBySite[site].push(interloc);
    });

    const toggleSite = (site: string) => {
        setExpandedSites(prev => {
            const next = new Set(prev);
            if (next.has(site)) {
                next.delete(site);
            } else {
                next.add(site);
            }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
                style={{ animation: 'slideUp 0.25s ease-out' }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Choisir un contact</h3>
                                <p className="text-sm text-blue-100">{clientName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Sélection d'adresse */}
                {showAdresseSelection && adresses.length > 0 && (
                    <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-amber-600" />
                            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                                Adresse du chantier
                            </h4>
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {adresses.map((adresse, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedAdresse(adresse)}
                                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${selectedAdresse === adresse
                                        ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                                        }`}
                                >
                                    {selectedAdresse === adresse && (
                                        <Check className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium">{adresse.siteName || 'Adresse principale'}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            {adresse.codePostal && adresse.codePostal}
                                            {adresse.ville && ` ${adresse.ville}`}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Liste des interlocuteurs */}
                <div className="overflow-y-auto flex-1">
                    {interlocuteurs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">Aucun contact trouvé</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {Object.entries(groupedBySite).map(([site, siteInterlocuteurs]) => (
                                <div key={site}>
                                    {/* En-tête du site */}
                                    <button
                                        onClick={() => toggleSite(site)}
                                        className="w-full flex items-center gap-2 px-5 py-2 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${expandedSites.has(site) ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                            {expandedSites.has(site) ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                            )}
                                        </div>
                                        <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="text-sm font-medium text-gray-800 flex-1">{site}</span>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {siteInterlocuteurs.length}
                                        </span>
                                    </button>

                                    {/* Interlocuteurs du site */}
                                    {expandedSites.has(site) && (
                                        <div className="pb-1">
                                            {siteInterlocuteurs.map((interloc, index) => (
                                                <button
                                                    key={`${site}-${index}`}
                                                    onClick={() => onSelect(interloc, selectedAdresse)}
                                                    className="w-full text-left mx-3 mb-1.5 px-3 py-2.5 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all duration-150 group"
                                                    style={{ width: 'calc(100% - 1.5rem)' }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            {/* Nom + fonction */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                                                                    {interloc.nom}
                                                                </span>
                                                                {interloc.fonction && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                                        <Briefcase className="h-2.5 w-2.5" />
                                                                        {interloc.fonction}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Téléphone */}
                                                            {interloc.telephone && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                                    <span className="text-sm font-mono text-gray-700 whitespace-nowrap">
                                                                        {interloc.telephone}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {/* Email */}
                                                            {interloc.email && (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                                                    <span className="text-xs text-gray-500 break-all">
                                                                        {interloc.email}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Bouton Choisir */}
                                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-1 group-hover:translate-x-0 mt-0.5">
                                                            <span className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium shadow-sm">
                                                                Choisir
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        {interlocuteurs.length} contact{interlocuteurs.length > 1 ? 's' : ''}
                        {showAdresseSelection && adresses.length > 0 && ` · ${adresses.length} adresse${adresses.length > 1 ? 's' : ''}`}
                    </p>
                    <button
                        onClick={onClose}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                        Annuler
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default InterlocuteurSelectorModal;

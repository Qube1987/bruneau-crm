import React, { useState } from 'react';
import { X, Phone, MapPin, Mail, Briefcase, Users, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
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
    const [selectedAdresse, setSelectedAdresse] = useState<AdresseInfo | undefined>(
        adresses.length > 0 ? adresses[0] : undefined
    );
    const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set(
        // Par défaut, tout est ouvert
        interlocuteurs.map(i => i.site)
    ));

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Choisir un interlocuteur</h3>
                            <p className="text-sm text-gray-600">{clientName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Sélection d'adresse (optionnel) */}
                {showAdresseSelection && adresses.length > 0 && (
                    <div className="p-4 border-b border-gray-100 bg-amber-50">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-amber-600" />
                            <h4 className="text-sm font-semibold text-amber-900">Adresse du chantier</h4>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {adresses.map((adresse, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedAdresse(adresse)}
                                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedAdresse === adresse
                                            ? 'border-amber-400 bg-amber-100 text-amber-900'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                                        }`}
                                >
                                    <div className="font-medium">{adresse.siteName || 'Adresse principale'}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {adresse.description && <span>{adresse.description.split('\n')[0]}</span>}
                                        {adresse.codePostal && <span>, {adresse.codePostal}</span>}
                                        {adresse.ville && <span> {adresse.ville}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Interlocuteurs list */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {interlocuteurs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Phone className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                            <p>Aucun téléphone trouvé pour ce client</p>
                        </div>
                    ) : (
                        Object.entries(groupedBySite).map(([site, siteInterlocuteurs]) => (
                            <div key={site} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSite(site)}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    {expandedSites.has(site) ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <h4 className="text-sm font-semibold text-gray-700 flex-1">
                                        {site}
                                    </h4>
                                    <span className="text-xs text-gray-400">{siteInterlocuteurs.length}</span>
                                </button>
                                {expandedSites.has(site) && (
                                    <div className="divide-y divide-gray-100">
                                        {siteInterlocuteurs.map((interloc, index) => (
                                            <button
                                                key={`${site}-${index}`}
                                                onClick={() => onSelect(interloc, selectedAdresse)}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all duration-150 group"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-900 group-hover:text-blue-700 truncate">
                                                                {interloc.nom}
                                                            </span>
                                                            {interloc.fonction && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                                                    <Briefcase className="h-3 w-3" />
                                                                    {interloc.fonction}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone className="h-3.5 w-3.5 text-green-500" />
                                                                {interloc.telephone}
                                                            </span>
                                                            {interloc.email && (
                                                                <span className="flex items-center gap-1 truncate">
                                                                    <Mail className="h-3.5 w-3.5 text-blue-400" />
                                                                    {interloc.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium">
                                                            Choisir
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        {interlocuteurs.length} interlocuteur{interlocuteurs.length > 1 ? 's' : ''} trouvé{interlocuteurs.length > 1 ? 's' : ''}
                        {showAdresseSelection && adresses.length > 0 && ` • ${adresses.length} adresse${adresses.length > 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InterlocuteurSelectorModal;

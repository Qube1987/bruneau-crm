import React from 'react';
import { X, Phone, MapPin, Mail, Briefcase, Users } from 'lucide-react';
import { Interlocuteur } from '../services/extrabatApi';

interface InterlocuteurSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (interlocuteur: Interlocuteur) => void;
    interlocuteurs: Interlocuteur[];
    clientName: string;
}

const InterlocuteurSelectorModal: React.FC<InterlocuteurSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    interlocuteurs,
    clientName,
}) => {
    if (!isOpen || interlocuteurs.length === 0) return null;

    // Grouper les interlocuteurs par site
    const groupedBySite: Record<string, Interlocuteur[]> = {};
    interlocuteurs.forEach((interloc) => {
        const site = interloc.site || 'Autre';
        if (!groupedBySite[site]) {
            groupedBySite[site] = [];
        }
        groupedBySite[site].push(interloc);
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
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

                {/* Interlocuteurs list */}
                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                    {interlocuteurs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Phone className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                            <p>Aucun téléphone trouvé pour ce client</p>
                        </div>
                    ) : (
                        Object.entries(groupedBySite).map(([site, siteInterlocuteurs]) => (
                            <div key={site}>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        {site}
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    {siteInterlocuteurs.map((interloc, index) => (
                                        <button
                                            key={`${site}-${index}`}
                                            onClick={() => onSelect(interloc)}
                                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-150 group"
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
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        {interlocuteurs.length} interlocuteur{interlocuteurs.length > 1 ? 's' : ''} trouvé{interlocuteurs.length > 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InterlocuteurSelectorModal;

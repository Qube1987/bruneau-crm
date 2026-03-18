import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, Edit3, BookOpen, Building2, Briefcase, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { supabaseApi, Prospect } from '../services/supabaseApi';
import { extrabatApi, extractAllInterlocuteurs, extractAllAdresses, Interlocuteur, AdresseExtraite } from '../services/extrabatApi';

interface ClientEditModalProps {
    /** The prospect/client to edit */
    prospect: Prospect;
    /** Called when the modal is closed */
    onClose: () => void;
    /** Called after a successful save, so the parent can refresh data */
    onSaved: () => void;
}

const ClientEditModal: React.FC<ClientEditModalProps> = ({ prospect, onClose, onSaved }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        nom: prospect.nom || '',
        prenom: prospect.prenom || '',
        email: prospect.email || '',
        telephone: prospect.telephone || '',
        adresse: prospect.adresse || '',
        code_postal: prospect.code_postal || '',
        ville: prospect.ville || '',
    });

    // Carnet d'adresses state
    const [showCarnet, setShowCarnet] = useState(false);
    const [isLoadingCarnet, setIsLoadingCarnet] = useState(false);
    const [carnetAdresses, setCarnetAdresses] = useState<AdresseExtraite[]>([]);
    const [carnetInterlocuteurs, setCarnetInterlocuteurs] = useState<Interlocuteur[]>([]);
    const [expandedAdresses, setExpandedAdresses] = useState<Set<string>>(new Set());

    // Reset form data when prospect changes
    useEffect(() => {
        setFormData({
            nom: prospect.nom || '',
            prenom: prospect.prenom || '',
            email: prospect.email || '',
            telephone: prospect.telephone || '',
            adresse: prospect.adresse || '',
            code_postal: prospect.code_postal || '',
            ville: prospect.ville || '',
        });
    }, [prospect.id]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.nom.trim()) {
            alert('Le nom est requis.');
            return;
        }

        setIsSaving(true);
        try {
            await supabaseApi.updateProspect(prospect.id, {
                nom: formData.nom.trim(),
                prenom: formData.prenom.trim(),
                email: formData.email.trim(),
                telephone: formData.telephone.trim(),
                adresse: formData.adresse.trim(),
                code_postal: formData.code_postal.trim(),
                ville: formData.ville.trim(),
            });

            onSaved();
            onClose();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du client:', error);
            alert('Erreur lors de la mise à jour du client');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // Charger le carnet d'adresses depuis Extrabat
    const loadCarnet = async () => {
        if (!prospect.extrabat_id) return;

        setIsLoadingCarnet(true);
        try {
            const details = await extrabatApi.getClientDetails(prospect.extrabat_id);
            const interlocuteurs = details.interlocuteurs || extractAllInterlocuteurs(details);
            const adresses = details.extractedAdresses || extractAllAdresses(details);

            setCarnetInterlocuteurs(interlocuteurs);
            setCarnetAdresses(adresses);
            // Ouvrir toutes les adresses par défaut
            setExpandedAdresses(new Set(adresses.map((a: AdresseExtraite) => a.siteName)));
        } catch (error) {
            console.error('Erreur chargement carnet d\'adresses:', error);
        } finally {
            setIsLoadingCarnet(false);
        }
    };

    const toggleCarnet = () => {
        if (!showCarnet && carnetAdresses.length === 0) {
            loadCarnet();
        }
        setShowCarnet(!showCarnet);
    };

    const toggleAdresse = (siteName: string) => {
        setExpandedAdresses(prev => {
            const next = new Set(prev);
            if (next.has(siteName)) {
                next.delete(siteName);
            } else {
                next.add(siteName);
            }
            return next;
        });
    };

    // Appliquer un interlocuteur au formulaire
    const applyInterlocuteur = (interloc: Interlocuteur) => {
        setFormData(prev => ({
            ...prev,
            telephone: interloc.telephone,
        }));
    };

    // Appliquer une adresse au formulaire
    const applyAdresse = (adresse: AdresseExtraite) => {
        setFormData(prev => ({
            ...prev,
            adresse: adresse.description,
            code_postal: adresse.codePostal,
            ville: adresse.ville,
        }));
    };

    // Grouper les interlocuteurs par site
    const groupedInterlocuteurs: Record<string, Interlocuteur[]> = {};
    carnetInterlocuteurs.forEach((interloc) => {
        const site = interloc.site || 'Autre';
        if (!groupedInterlocuteurs[site]) {
            groupedInterlocuteurs[site] = [];
        }
        groupedInterlocuteurs[site].push(interloc);
    });

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3 text-white">
                        <Edit3 className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Modifier les coordonnées</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {/* Client name badge */}
                    <div className="px-6 pt-4 pb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium text-gray-700">
                                {prospect.civilite && `${prospect.civilite} `}
                                {prospect.nom} {prospect.prenom || ''}
                            </span>
                            {prospect.extrabat_id && (
                                <span className="ml-auto text-xs text-gray-400">
                                    Extrabat #{prospect.extrabat_id}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="px-6 py-4 space-y-4">
                        {/* Nom / Prénom */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Nom *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => handleChange('nom', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="Nom"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Prénom
                                </label>
                                <input
                                    type="text"
                                    value={formData.prenom}
                                    onChange={(e) => handleChange('prenom', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="Prénom"
                                />
                            </div>
                        </div>

                        {/* Téléphone */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                <Phone className="w-3.5 h-3.5" />
                                Téléphone
                            </label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => handleChange('telephone', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="06 00 00 00 00"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                <Mail className="w-3.5 h-3.5" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="email@exemple.com"
                            />
                        </div>

                        {/* Adresse */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                <MapPin className="w-3.5 h-3.5" />
                                Adresse
                            </label>
                            <input
                                type="text"
                                value={formData.adresse}
                                onChange={(e) => handleChange('adresse', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="Rue, numéro..."
                            />
                        </div>

                        {/* Code postal / Ville */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Code postal
                                </label>
                                <input
                                    type="text"
                                    value={formData.code_postal}
                                    onChange={(e) => handleChange('code_postal', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="00000"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Ville
                                </label>
                                <input
                                    type="text"
                                    value={formData.ville}
                                    onChange={(e) => handleChange('ville', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="Ville"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Carnet d'adresses Extrabat */}
                    {prospect.extrabat_id && (
                        <div className="px-6 pb-4">
                            <button
                                onClick={toggleCarnet}
                                className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg hover:from-indigo-100 hover:to-blue-100 transition-colors"
                            >
                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                <span className="font-medium text-indigo-900 flex-1 text-left">
                                    Carnet d'adresses Extrabat
                                </span>
                                {isLoadingCarnet ? (
                                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                                ) : (
                                    showCarnet ? <ChevronDown className="h-4 w-4 text-indigo-400" /> : <ChevronRight className="h-4 w-4 text-indigo-400" />
                                )}
                            </button>

                            {showCarnet && (
                                <div className="mt-3 border border-indigo-200 rounded-lg overflow-hidden">
                                    {isLoadingCarnet ? (
                                        <div className="p-6 text-center text-gray-500">
                                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-indigo-400" />
                                            <p className="text-sm">Chargement du carnet d'adresses...</p>
                                        </div>
                                    ) : carnetAdresses.length === 0 && carnetInterlocuteurs.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            <p className="text-sm">Aucune adresse ni interlocuteur trouvé</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-indigo-100">
                                            {/* Section Adresses */}
                                            {carnetAdresses.length > 0 && (
                                                <div className="p-3 bg-amber-50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Building2 className="h-4 w-4 text-amber-600" />
                                                        <h4 className="text-sm font-semibold text-amber-900">
                                                            Adresses ({carnetAdresses.length})
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {carnetAdresses.map((adresse, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200"
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                                        {adresse.siteName}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {adresse.description && adresse.description.split('\n')[0]}
                                                                        {adresse.codePostal && `, ${adresse.codePostal}`}
                                                                        {adresse.ville && ` ${adresse.ville}`}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => applyAdresse(adresse)}
                                                                    className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors whitespace-nowrap"
                                                                >
                                                                    Appliquer
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section Interlocuteurs */}
                                            {Object.entries(groupedInterlocuteurs).map(([site, interlocuteurs]) => (
                                                <div key={site} className="bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAdresse(site)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                    >
                                                        {expandedAdresses.has(site) ? (
                                                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                                        )}
                                                        <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                                                        <span className="text-sm font-medium text-gray-700 flex-1">{site}</span>
                                                        <span className="text-xs text-gray-400">
                                                            {interlocuteurs.length} contact{interlocuteurs.length > 1 ? 's' : ''}
                                                        </span>
                                                    </button>
                                                    {expandedAdresses.has(site) && (
                                                        <div className="divide-y divide-gray-50">
                                                            {interlocuteurs.map((interloc, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors group"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium text-gray-900">
                                                                                {interloc.nom}
                                                                            </span>
                                                                            {interloc.fonction && (
                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                                                                                    <Briefcase className="h-3 w-3" />
                                                                                    {interloc.fonction}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-3 mt-0.5">
                                                                            <span className="text-xs font-mono text-green-600 flex items-center gap-1">
                                                                                <Phone className="h-3 w-3" />
                                                                                {interloc.telephone}
                                                                            </span>
                                                                            {interloc.email && (
                                                                                <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                                                                                    <Mail className="h-3 w-3" />
                                                                                    {interloc.email}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => applyInterlocuteur(interloc)}
                                                                        className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap"
                                                                    >
                                                                        Utiliser ce n°
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !formData.nom.trim()}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
        </div>
    );
};

export default ClientEditModal;

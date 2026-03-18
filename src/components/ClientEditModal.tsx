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
            const details = await extrabatApi.getClientContacts(prospect.extrabat_id);
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

    // Appliquer un interlocuteur au formulaire (téléphone + email si disponible)
    const applyInterlocuteur = (interloc: Interlocuteur) => {
        setFormData(prev => ({
            ...prev,
            telephone: interloc.telephone,
            ...(interloc.email ? { email: interloc.email } : {}),
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
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-sm hover:shadow-md group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <BookOpen className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-medium text-white flex-1 text-left text-sm">
                                    Carnet d'adresses Extrabat
                                </span>
                                {isLoadingCarnet ? (
                                    <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                                ) : (
                                    showCarnet ? <ChevronDown className="h-4 w-4 text-white/70" /> : <ChevronRight className="h-4 w-4 text-white/70" />
                                )}
                            </button>

                            {showCarnet && (
                                <div className="mt-3 space-y-3">
                                    {isLoadingCarnet ? (
                                        <div className="py-8 text-center">
                                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-indigo-400" />
                                            <p className="text-sm text-gray-500">Chargement...</p>
                                        </div>
                                    ) : carnetAdresses.length === 0 && carnetInterlocuteurs.length === 0 ? (
                                        <div className="py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm text-gray-400">Aucune adresse ni contact trouvé</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Adresses */}
                                            {carnetAdresses.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Building2 className="h-3.5 w-3.5 text-amber-500" />
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                            Adresses ({carnetAdresses.length})
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {carnetAdresses.map((adresse, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:border-amber-200 transition-all group"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                                    <MapPin className="h-4 w-4 text-amber-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-800 leading-tight">
                                                                        {adresse.siteName || 'Adresse'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                        {adresse.description && adresse.description.split('\n')[0]}
                                                                        {adresse.codePostal && ` · ${adresse.codePostal}`}
                                                                        {adresse.ville && ` ${adresse.ville}`}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => applyAdresse(adresse)}
                                                                    className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm opacity-80 group-hover:opacity-100 whitespace-nowrap font-medium"
                                                                >
                                                                    Appliquer
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Contacts groupés par site */}
                                            {Object.keys(groupedInterlocuteurs).length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Phone className="h-3.5 w-3.5 text-blue-500" />
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                            Contacts
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Object.entries(groupedInterlocuteurs).map(([site, interlocuteurs]) => (
                                                            <div key={site} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                                                {/* En-tête site */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleAdresse(site)}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 transition-colors text-left"
                                                                >
                                                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${expandedAdresses.has(site) ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                        {expandedAdresses.has(site) ? (
                                                                            <ChevronDown className="h-3 w-3 text-blue-600" />
                                                                        ) : (
                                                                            <ChevronRight className="h-3 w-3 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                                                                    <span className="text-sm font-medium text-gray-700 flex-1">{site}</span>
                                                                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        {interlocuteurs.length}
                                                                    </span>
                                                                </button>

                                                                {/* Contacts */}
                                                                {expandedAdresses.has(site) && (
                                                                    <div className="divide-y divide-gray-50">
                                                                        {interlocuteurs.map((interloc, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                                                                                onClick={() => applyInterlocuteur(interloc)}
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                                                                                    {(interloc.nom || '?')[0].toUpperCase()}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-sm font-medium text-gray-900 truncate">
                                                                                            {interloc.nom}
                                                                                        </span>
                                                                                        {interloc.fonction && (
                                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                                                                                                <Briefcase className="h-2.5 w-2.5" />
                                                                                                {interloc.fonction}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3 mt-0.5">
                                                                                        {interloc.telephone && (
                                                                                            <span className="text-xs font-mono text-emerald-600 flex items-center gap-1">
                                                                                                <Phone className="h-3 w-3" />
                                                                                                {interloc.telephone}
                                                                                            </span>
                                                                                        )}
                                                                                        {interloc.email && (
                                                                                            <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                                                                                                <Mail className="h-3 w-3" />
                                                                                                {interloc.email}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <span className="text-[11px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
                                                                                    Utiliser
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
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

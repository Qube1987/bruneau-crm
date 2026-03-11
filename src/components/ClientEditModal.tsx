import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, Edit3 } from 'lucide-react';
import { supabaseApi, Prospect } from '../services/supabaseApi';

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

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
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

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
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

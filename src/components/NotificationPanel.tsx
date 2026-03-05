import React, { useRef, useEffect } from 'react';
import { Bell, BellOff, CheckCheck, AlertTriangle, FileText, Sparkles, Clock, X, Settings } from 'lucide-react';
import { CrmNotification } from '../hooks/useNotifications';

interface NotificationPanelProps {
    notifications: CrmNotification[];
    unreadCount: number;
    loading: boolean;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
    onOpenSettings: () => void;
    onNavigate?: (tab: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
    notifications,
    unreadCount,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose,
    onOpenSettings,
    onNavigate,
}) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getNotificationIcon = (type: CrmNotification['type']) => {
        switch (type) {
            case 'devis_urgent':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case 'devis_relance':
                return <FileText className="h-5 w-5 text-orange-500" />;
            case 'nouvelle_opportunite':
                return <Sparkles className="h-5 w-5 text-blue-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const getNotificationBg = (notif: CrmNotification) => {
        if (notif.read) return 'bg-white hover:bg-gray-50';
        switch (notif.type) {
            case 'devis_urgent':
                return 'bg-red-50/60 hover:bg-red-50';
            case 'devis_relance':
                return 'bg-orange-50/60 hover:bg-orange-50';
            case 'nouvelle_opportunite':
                return 'bg-blue-50/60 hover:bg-blue-50';
            default:
                return 'bg-gray-50 hover:bg-gray-100';
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin}min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR');
    };

    const handleNotificationClick = (notif: CrmNotification) => {
        onMarkAsRead(notif.id);
        if (notif.type === 'devis_urgent' || notif.type === 'devis_relance') {
            onNavigate?.('relances-devis');
            onClose();
        } else if (notif.type === 'nouvelle_opportunite') {
            onNavigate?.('opportunities');
            onClose();
        }
    };

    return (
        <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
            style={{
                animation: 'notifSlideIn 0.2s ease-out',
            }}
        >
            <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary-700" />
                    <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Tout marquer comme lu"
                        >
                            <CheckCheck className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onOpenSettings();
                            onClose();
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Paramètres Push"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="p-4 bg-gray-50 rounded-full mb-4">
                            <BellOff className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Aucune notification</p>
                        <p className="text-xs text-gray-400 mt-1">Tout est à jour !</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((notif) => (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`w-full text-left px-5 py-3.5 transition-all duration-150 ${getNotificationBg(notif)} ${!notif.read ? 'border-l-3 border-l-primary-500' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.read && (
                                                <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-primary-500"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            <span className="text-[11px] text-gray-400">
                                                {formatTimeAgo(notif.timestamp)}
                                            </span>
                                            {notif.data?.montant && (
                                                <span className="ml-auto text-[11px] font-medium text-gray-500">
                                                    {notif.data.montant.toLocaleString('fr-FR')} €
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => {
                            onNavigate?.('relances-devis');
                            onClose();
                        }}
                        className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                        Voir toutes les relances →
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;

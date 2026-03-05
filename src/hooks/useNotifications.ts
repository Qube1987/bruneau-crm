import { useState, useEffect, useCallback } from 'react';
import { supabaseApi } from '../services/supabaseApi';

export interface CrmNotification {
    id: string;
    type: 'devis_urgent' | 'devis_relance' | 'nouvelle_opportunite';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    data?: {
        opportuniteId?: string;
        clientName?: string;
        montant?: number;
        daysSince?: number;
        statut?: string;
    };
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<CrmNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    // Track dismissed notification IDs in localStorage
    const getDismissedIds = (): string[] => {
        try {
            const stored = localStorage.getItem('crm_dismissed_notifications');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    const saveDismissedIds = (ids: string[]) => {
        localStorage.setItem('crm_dismissed_notifications', JSON.stringify(ids));
    };

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const allOpps = await supabaseApi.getOpportunites();
            const prospects = await supabaseApi.getProspects();

            const dismissedIds = getDismissedIds();
            const newNotifications: CrmNotification[] = [];

            // Devis à relancer (urgents = + de 14 jours)
            const devisStatuts = ['devis-transmis', 'relance-1', 'relance-2', 'relance-3'];
            const devisOpps = allOpps.filter(opp =>
                devisStatuts.includes(opp.statut) && !opp.archive
            );

            for (const opp of devisOpps) {
                const prospect = prospects.find(p => p.id === opp.client_id);
                const transmissionDate = new Date(opp.updated_at || opp.created_at);
                const today = new Date();
                const daysSince = Math.floor(
                    (today.getTime() - transmissionDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                const clientName = prospect
                    ? `${prospect.nom || ''} ${prospect.prenom || ''}`.trim()
                    : 'Client inconnu';

                // Notifications urgentes (14+ jours)
                if (daysSince >= 14) {
                    const notifId = `devis_urgent_${opp.id}`;
                    newNotifications.push({
                        id: notifId,
                        type: 'devis_urgent',
                        title: '⚠️ Devis urgent à relancer',
                        message: `${clientName} - ${opp.titre || 'Sans titre'} (${daysSince}j sans réponse)`,
                        timestamp: opp.updated_at || opp.created_at,
                        read: dismissedIds.includes(notifId),
                        data: {
                            opportuniteId: opp.id,
                            clientName,
                            montant: opp.montant_estime,
                            daysSince,
                            statut: opp.statut,
                        },
                    });
                }

                // Notifications de relance (7-13 jours)
                if (daysSince >= 7 && daysSince < 14) {
                    const notifId = `devis_relance_${opp.id}`;
                    newNotifications.push({
                        id: notifId,
                        type: 'devis_relance',
                        title: '📋 Devis à relancer',
                        message: `${clientName} - ${opp.titre || 'Sans titre'} (${daysSince}j)`,
                        timestamp: opp.updated_at || opp.created_at,
                        read: dismissedIds.includes(notifId),
                        data: {
                            opportuniteId: opp.id,
                            clientName,
                            montant: opp.montant_estime,
                            daysSince,
                            statut: opp.statut,
                        },
                    });
                }
            }

            // Nouvelles opportunités créées dans les dernières 24h
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const recentOpps = allOpps.filter(opp => {
                const createdAt = new Date(opp.created_at);
                return createdAt >= yesterday && !opp.archive;
            });

            for (const opp of recentOpps) {
                const prospect = prospects.find(p => p.id === opp.client_id);
                const clientName = prospect
                    ? `${prospect.nom || ''} ${prospect.prenom || ''}`.trim()
                    : 'Client inconnu';

                const notifId = `new_opp_${opp.id}`;
                newNotifications.push({
                    id: notifId,
                    type: 'nouvelle_opportunite',
                    title: '🆕 Nouvelle opportunité',
                    message: `${clientName} - ${opp.titre || 'Sans titre'}${opp.montant_estime ? ` (${opp.montant_estime.toLocaleString('fr-FR')} €)` : ''}`,
                    timestamp: opp.created_at,
                    read: dismissedIds.includes(notifId),
                    data: {
                        opportuniteId: opp.id,
                        clientName,
                        montant: opp.montant_estime,
                    },
                });
            }

            // Trier par date décroissante
            newNotifications.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
        } catch (error) {
            console.error('Erreur chargement notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback((notifId: string) => {
        const dismissedIds = getDismissedIds();
        if (!dismissedIds.includes(notifId)) {
            dismissedIds.push(notifId);
            saveDismissedIds(dismissedIds);
        }
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(() => {
        const dismissedIds = getDismissedIds();
        const allIds = notifications.map(n => n.id);
        const newDismissed = [...new Set([...dismissedIds, ...allIds])];
        saveDismissedIds(newDismissed);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, [notifications]);

    // Charger au montage et rafraîchir toutes les 5 minutes
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Nettoyer les IDs obsolètes (plus vieux que 30 jours) 
    useEffect(() => {
        const cleanup = () => {
            const dismissedIds = getDismissedIds();
            const currentIds = notifications.map(n => n.id);
            // Garder uniquement les IDs qui sont encore dans les notifications actuelles
            const cleaned = dismissedIds.filter(id => currentIds.includes(id));
            if (cleaned.length !== dismissedIds.length) {
                saveDismissedIds(cleaned);
            }
        };
        if (notifications.length > 0) cleanup();
    }, [notifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: loadNotifications,
    };
}

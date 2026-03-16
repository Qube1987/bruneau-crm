import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClients';

// Clé VAPID publique en dur — DOIT correspondre à la clé privée configurée sur Supabase
const VAPID_PUBLIC_KEY = 'BH2A-EIhJE7x_DcWaYZoIc_HemxXXnPSc1r0wFjNwvkjUFpzT5IXrPHvT_ck2zkoIi8YwrUdIYRJ0rjmwUg-8ws';

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    async function checkSubscription() {
        if (!('serviceWorker' in navigator)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('Erreur vérification abonnement:', err);
        }
    }

    async function subscribe() {
        if (!('serviceWorker' in navigator)) {
            alert('Service Worker non supporté sur ce navigateur');
            return;
        }

        setLoading(true);
        try {
            // 1. Demander la permission AVANT de créer la subscription
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                throw new Error('Permission de notification refusée');
            }

            const registration = await navigator.serviceWorker.ready;

            // 2. Supprimer l'ancienne subscription si elle existe (évite le VAPID mismatch)
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                console.log('[PUSH] Suppression de l\'ancienne subscription pour éviter le VAPID mismatch...');
                // Supprimer côté Supabase d'abord
                await supabase.from('crm_push_subscriptions')
                    .delete()
                    .eq('endpoint', existingSubscription.endpoint);
                // Puis côté navigateur
                await existingSubscription.unsubscribe();
                console.log('[PUSH] Ancienne subscription supprimée');
            }

            // 3. Créer une nouvelle subscription avec la bonne clé VAPID
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // 4. Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            const sub = subscription.toJSON();

            // 5. Sauvegarder dans la table crm_push_subscriptions
            const { error } = await supabase.from('crm_push_subscriptions').upsert({
                user_id: user.id,
                user_email: user.email!,
                endpoint: sub.endpoint!,
                p256dh: sub.keys!.p256dh!,
                auth: sub.keys!.auth!,
                user_agent: navigator.userAgent,
                last_used: new Date().toISOString()
            }, { onConflict: 'endpoint' });

            if (error) throw error;

            setIsSubscribed(true);
            setPermission('granted');
            console.log('[PUSH] Subscription créée avec succès');
        } catch (err: any) {
            console.error('Erreur abonnement push:', err);
            alert(`Erreur d'abonnement : ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function unsubscribe() {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Supprimer côté Supabase
                const { error } = await supabase.from('crm_push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);

                if (error) console.error('Erreur suppression subscription BDD:', error);

                // Supprimer côté navigateur
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
        } catch (err) {
            console.error('Erreur désabonnement push:', err);
        } finally {
            setLoading(false);
        }
    }

    return { permission, isSubscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

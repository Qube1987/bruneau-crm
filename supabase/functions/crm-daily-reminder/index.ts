import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

serve(async (_req) => {
  try {
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:quentin@bruneau27.com'
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured')
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les opportunités avec statuts actifs nécessitant une action
    const activeStatuses = ['a-contacter', 'contacte', 'recueil-besoin', 'redaction-devis']
    const { data: opportunities, error: oppError } = await supabaseAdmin
      .from('opportunites')
      .select('id, titre, statut, suivi_par')
      .in('statut', activeStatuses)

    if (oppError) throw oppError

    if (!opportunities || opportunities.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Aucune opportunité ouverte' }))
    }

    // Grouper par suivi_par
    const countByUser: Record<string, number> = {}
    for (const opp of opportunities) {
      const user = opp.suivi_par || 'Non assigné'
      countByUser[user] = (countByUser[user] || 0) + 1
    }

    // Récupérer les subscriptions CRM
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('crm_push_subscriptions')
      .select('*')

    if (subError) throw subError
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions' }))
    }

    const total = opportunities.length
    const breakdown = Object.entries(countByUser)
      .map(([user, count]) => `${user}: ${count}`)
      .join(', ')

    const title = `☀️ Rappel CRM : ${total} opportunité(s) en cours`
    const body = breakdown

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/crm-android-chrome-512x512_(1).png',
      badge: '/crm-android-chrome-512x512_(1).png',
      tag: 'crm-daily-reminder',
      data: { url: '/' }
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, notificationPayload)
          return { success: true }
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('crm_push_subscriptions').delete().eq('id', sub.id)
          }
          throw err
        }
      })
    )

    return new Response(JSON.stringify({ success: true, total, results }))
  } catch (error: any) {
    console.error('Error in CRM daily reminder:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})

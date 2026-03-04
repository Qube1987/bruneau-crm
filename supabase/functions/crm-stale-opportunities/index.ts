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

    // Opportunités sans changement depuis 7+ jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activeStatuses = [
      'a-contacter', 'contacte', 'recueil-besoin', 'redaction-devis',
      'devis-transmis', 'relance-1', 'relance-2', 'relance-3'
    ]

    const { data: staleOpps, error: oppError } = await supabaseAdmin
      .from('opportunites')
      .select('id, titre, statut, suivi_par, date_modification')
      .in('statut', activeStatuses)
      .lt('date_modification', sevenDaysAgo.toISOString())

    if (oppError) throw oppError

    if (!staleOpps || staleOpps.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Aucune opportunité en retard' }))
    }

    // Récupérer les subscriptions CRM
    console.log('[STALE] Fetching subscriptions from DB...')
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('crm_push_subscriptions')
      .select('*')

    if (subError) {
      console.error('[STALE] Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[STALE] No subscriptions found in DB')
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions' }))
    }

    console.log(`[STALE] Sending stale reminder to ${subscriptions.length} subscription(s)`)

    const count = staleOpps.length
    const examples = staleOpps.slice(0, 3).map((o: any) => o.titre).join(', ')
    const title = `⚠️ ${count} opportunité(s) en attente depuis 7+ jours`
    const body = count <= 3
      ? examples
      : `${examples} et ${count - 3} autre(s)`

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/crm-android-chrome-512x512_(1).png',
      badge: '/crm-android-chrome-512x512_(1).png',
      tag: 'crm-stale-reminder',
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

    return new Response(JSON.stringify({ success: true, count, results }))
  } catch (error: any) {
    console.error('Error in CRM stale opportunities reminder:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})

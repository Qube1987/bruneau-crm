import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[PUSH] Incoming request: ${req.method}`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('[PUSH] Payload received:', JSON.stringify(payload))
    const { event, opportunity_title, opportunity_description, creator_email } = payload

    if (!event || !opportunity_title) {
      console.error('[PUSH] Missing event or opportunity_title')
      throw new Error('Missing event or opportunity_title')
    }

    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:quentin@bruneau27.com'
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('[PUSH] VAPID keys not configured')
      throw new Error('VAPID keys not configured')
    }

    console.log(`[PUSH] VAPID public key starts with: ${VAPID_PUBLIC_KEY.substring(0, 10)}...`)
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer toutes les subscriptions CRM
    console.log('[PUSH] Fetching subscriptions from DB...')
    const { data: allSubscriptions, error: subError } = await supabaseAdmin
      .from('crm_push_subscriptions')
      .select('*')

    if (subError) {
      console.error('[PUSH] Error fetching subscriptions:', subError)
      throw subError
    }

    console.log(`[PUSH] Total subscriptions found in DB: ${allSubscriptions?.length || 0}`)

    // Envoyer à TOUS les abonnés (y compris le créateur)
    // Pour un petit CRM, il est important de recevoir les confirmations
    const subscriptions = allSubscriptions || []

    if (subscriptions.length === 0) {
      console.log('[PUSH] No subscriptions found in crm_push_subscriptions table')
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[PUSH] Sending to ${subscriptions.length} subscription(s)`)

    let title = ''
    let body = ''

    if (event === 'opportunity_created') {
      title = '📋 Nouvelle opportunité CRM'
      body = opportunity_description
        ? `${opportunity_title} - ${opportunity_description}`
        : opportunity_title
    } else {
      // Gérer d'autres types d'événements
      title = `CRM: ${event}`
      body = opportunity_title
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/crm-android-chrome-512x512_(1).png',
      badge: '/crm-android-chrome-512x512_(1).png',
      tag: `crm-${event}-${Date.now()}`,
      data: { url: '/' }
    })

    console.log(`[PUSH] Notification payload: ${notificationPayload}`)

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        console.log(`[PUSH] Sending to endpoint: ${sub.endpoint.substring(0, 60)}... (user: ${sub.user_email})`)
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, notificationPayload)
          console.log(`[PUSH] ✅ Success for ${sub.user_email}`)

          // Mettre à jour last_used
          await supabaseAdmin.from('crm_push_subscriptions')
            .update({ last_used: new Date().toISOString() })
            .eq('id', sub.id)

          return { endpoint: sub.endpoint, success: true }
        } catch (err: any) {
          console.error(`[PUSH] ❌ Error for ${sub.user_email}: ${err.statusCode} ${err.body || err.message}`)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('crm_push_subscriptions').delete().eq('id', sub.id)
            console.log(`[PUSH] Removed stale subscription for ${sub.user_email}`)
          }
          throw err
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length
    console.log(`[PUSH] Results: ${successCount} success, ${failCount} failed`)

    return new Response(JSON.stringify({ success: true, results, successCount, failCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[PUSH] Error sending CRM push:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

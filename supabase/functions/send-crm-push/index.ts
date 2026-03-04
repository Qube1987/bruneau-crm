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

    // Filtrer SAUF le créateur
    let subscriptions = allSubscriptions || []
    if (creator_email) {
      console.log(`[PUSH] Filtering out creator: ${creator_email}`)
      subscriptions = subscriptions.filter((sub: any) => sub.user_email !== creator_email)
    }

    if (subscriptions.length === 0) {
      console.log('[PUSH] No target subscriptions found (either empty or only the creator was subscribed)')
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
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/crm-android-chrome-512x512_(1).png',
      badge: '/crm-android-chrome-512x512_(1).png',
      data: { url: '/' }
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, notificationPayload)
          return { endpoint: sub.endpoint, success: true }
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('crm_push_subscriptions').delete().eq('id', sub.id)
            console.log(`Removed stale subscription: ${sub.endpoint}`)
          }
          throw err
        }
      })
    )

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error sending CRM push:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

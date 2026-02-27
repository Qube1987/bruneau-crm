import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SmsRequest {
  clientName: string;
  description?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[SMS] Fonction appelée");

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "";
    const recipientPhoneNumber = "+33684516668";

    const { clientName, description }: SmsRequest = await req.json();
    console.log("[SMS] Client:", clientName, "Description:", description);

    if (!clientName) {
      console.error("[SMS] Nom du client manquant");
      return new Response(
        JSON.stringify({ error: "Le nom du client est requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const message = description
      ? `Nouvelle opportunité saisie dans le CRM : ${clientName} - ${description}`
      : `Nouvelle opportunité saisie dans le CRM : ${clientName}`;

    console.log("[SMS] Message à envoyer:", message);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const body = new URLSearchParams({
      To: recipientPhoneNumber,
      From: twilioPhoneNumber,
      Body: message,
    });

    console.log("[SMS] Envoi à Twilio...");
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error("[SMS] Erreur Twilio:", errorData);
      return new Response(
        JSON.stringify({
          error: "Échec de l'envoi du SMS",
          details: errorData
        }),
        {
          status: twilioResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const twilioData = await twilioResponse.json();
    console.log("[SMS] Envoyé avec succès. SID:", twilioData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS envoyé avec succès",
        sid: twilioData.sid
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SMS] Erreur lors de l'envoi du SMS:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur interne lors de l'envoi du SMS",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
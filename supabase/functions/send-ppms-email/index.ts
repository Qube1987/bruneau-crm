import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  prospectName: string;
  prospectFirstName?: string;
  civilite?: string;
  etablissement?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, prospectName, civilite }: EmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "L'adresse email est requise" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuration d'envoi d'emails manquante" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const greeting = civilite && prospectName
      ? `Bonjour ${civilite} ${prospectName},`
      : "Madame, Monsieur,";

    const emailText = `${greeting}

La réglementation relative au PPMS impose à chaque établissement scolaire de disposer, d’ici 2028, d’un dispositif d’alerte audible partout, clairement différencié de l’alarme incendie et immédiatement compris de tous.

Or, dans la pratique, beaucoup de systèmes actuels se limitent encore à une simple sonnerie, difficile à distinguer de l’alarme incendie et qui n’indique ni la nature du risque, ni la conduite à tenir.

Nous proposons une solution d’alerte PPMS, conçue et fabriquée en France, basée sur des messages vocaux clairs indiquant, selon la situation, s’il faut évacuer (risque majeur) ou se confiner (intrusion / attentat).
Sans travaux ni câblage, grâce à une technologie radio longue portée et des piles lithium (autonomie jusqu’à 5 ans), le système se déploie très facilement dans l’existant, y compris dans les bâtiments éclatés ou anciens.

Pour découvrir concrètement cette solution et voir comment elle peut s’intégrer dans votre établissement, vous trouverez une présentation détaillée sur notre site :
https://bruneau27.com/ppms

Seriez-vous disponible pour un échange de quelques minutes (en visio ou sur site) afin d’envisager une démonstration adaptée à votre établissement ?

Dans l’attente de votre retour, je vous souhaite une excellente journée.

Bien cordialement,
Quentin Bruneau
Sté Bruneau Protection`.trim();

    const emailData = {
      from: "Bruneau Protection <info@bruneau27.com>",
      to: [to],
      subject: "Solution d'Alerte PPMS - Conforme réglementation 2028",
      text: emailText,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", responseData);
      return new Response(
        JSON.stringify({
          error: "Erreur lors de l'envoi de l'email",
          details: responseData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès",
        id: responseData.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-ppms-email function:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        message: error instanceof Error ? error.message : "Erreur inconnue"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

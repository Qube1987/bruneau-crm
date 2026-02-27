import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  clientName: string;
  clientFirstName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, clientName, clientFirstName }: EmailRequest = await req.json();

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

    const greeting = clientFirstName
      ? `Bonjour ${clientFirstName},`
      : clientName
        ? `Bonjour Madame, Monsieur ${clientName},`
        : "Bonjour Madame, Monsieur,";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .alert-box {
      background: #fef3f5;
      border-left: 4px solid #E72C63;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .benefits-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .benefit-item {
      display: flex;
      align-items: start;
      margin: 15px 0;
      padding: 15px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #dbeafe;
    }
    .benefit-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .info-box {
      background: #fef9e7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .contact-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      border-radius: 0 0 10px 10px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">🛡️ Protégez votre domicile 24h/24 avec la télésurveillance</h1>
  </div>

  <div class="content">
    <p>${greeting}</p>

    <p>Votre système de sécurité est actuellement en place et fonctionne de manière autonome. Cependant, saviez-vous qu'en cas d'intrusion, <strong>vous êtes le seul averti</strong> ?</p>

    <div class="alert-box">
      <p style="margin: 0;"><strong>Que se passe-t-il si vous n'êtes pas disponible, si votre téléphone est éteint, ou si vous êtes en vacances à l'étranger ?</strong></p>
      <p style="margin: 10px 0 0 0;">Votre alarme se déclenche... mais personne n'intervient.</p>
    </div>

    <h2 style="color: #3b82f6;">🔒 La télésurveillance : une protection active 24h/24</h2>

    <p>Avec la télésurveillance, votre système n'est plus seulement un dispositif d'alerte, il devient une <strong>véritable protection active</strong> :</p>

    <div class="benefits-box">
      <h3 style="margin-top: 0; color: #3b82f6;">✅ Réactivité immédiate</h3>
      <p>Dès qu'une alarme se déclenche, les agents de télésurveillance reçoivent instantanément l'alerte et peuvent :</p>

      <div class="benefit-item">
        <div class="benefit-icon">👁️</div>
        <div>
          <strong style="color: #3b82f6;">Visualiser en direct</strong><br>
          Ce qui se passe chez vous
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">🔊</div>
        <div>
          <strong style="color: #3b82f6;">Écouter les sons ambiants</strong><br>
          Pour évaluer la situation
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">📢</div>
        <div>
          <strong style="color: #3b82f6;">Levée de doute vocale</strong><br>
          Pour dissuader les intrus
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">🚨</div>
        <div>
          <strong style="color: #3b82f6;">Contact forces de l'ordre</strong><br>
          Immédiatement si nécessaire
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">📞</div>
        <div>
          <strong style="color: #3b82f6;">Vous prévenir</strong><br>
          Et gérer l'incident même si vous n'êtes pas joignable
        </div>
      </div>
    </div>

       <div class="benefit-item" style="border-color: #10b981; background: #f0fdf4;">
      <div class="benefit-icon">😌</div>
      <div>
        <strong style="color: #10b981;">Sérénité totale</strong><br>
        Que vous soyez au travail, en déplacement ou en vacances, votre domicile est sous surveillance permanente par des professionnels formés qui savent comment réagir en toutes circonstances.
      </div>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #f59e0b;">🎯 Une solution adaptée à vos besoins</h3>
      <p style="margin-bottom: 0;">Plusieurs formules sont disponibles selon votre système et vos attentes. Nous pouvons vous présenter les différentes options lors d'un échange téléphonique ou par email.</p>
    </div>

    <div style="background: linear-gradient(135deg, #E72C63 0%, #c71f54 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <h3 style="margin-top: 0; color: white;">💡 Intéressé(e) ?</h3>
      <p style="margin-bottom: 0;">Il vous suffit de <strong>répondre à ce mail</strong> ou de nous contacter directement pour en discuter.</p>
    </div>

    <div class="contact-box">
      <p style="margin-top: 0;"><strong>Nos coordonnées :</strong></p>
      <p style="margin: 5px 0;">📞 Téléphone : <strong>02 32 51 77 00</strong></p>
      <p style="margin: 5px 0;">📧 Email : <strong>info@bruneau27.com</strong></p>
    </div>

    <p style="text-align: center; font-size: 16px; font-weight: 600; color: #3b82f6; margin: 30px 0;">Ne laissez plus votre sécurité au hasard. Optez pour une protection professionnelle et réactive.</p>

    <p style="margin-top: 30px;">Bien cordialement,</p>
    <p style="font-weight: 600; margin: 5px 0;">L'équipe Bruneau Protection</p>
  </div>

  <div class="footer">
    <p>Cet email a été envoyé par Bruneau Protection</p>
    <p style="font-size: 12px; margin-top: 10px;">Protégez votre domicile avec une surveillance professionnelle 24h/24.</p>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
${greeting}

Votre système de sécurité est actuellement en place et fonctionne de manière autonome. Cependant, saviez-vous qu'en cas d'intrusion, vous êtes le seul averti ?

Que se passe-t-il si vous n'êtes pas disponible, si votre téléphone est éteint, ou si vous êtes en vacances à l'étranger ? Votre alarme se déclenche... mais personne n'intervient.

LA TÉLÉSURVEILLANCE : UNE PROTECTION ACTIVE 24H/24

Avec la télésurveillance, votre système n'est plus seulement un dispositif d'alerte, il devient une véritable protection active :

RÉACTIVITÉ IMMÉDIATE :
Dès qu'une alarme se déclenche, nos agents de télésurveillance reçoivent instantanément l'alerte et peuvent :
✔ Visualiser en direct ce qui se passe chez vous (si caméras présentes)
✔ Écouter les sons ambiants pour évaluer la situation
✔ Déclencher une levée de doute vocale pour dissuader les intrus
✔ Contacter immédiatement les forces de l'ordre si nécessaire
✔ Vous prévenir et gérer l'incident même si vous n'êtes pas joignable

DISSUASION MAXIMALE :
La simple présence d'un macaron "Télésurveillance" sur votre propriété réduit considérablement les risques de cambriolage. Les malfaiteurs privilégient les cibles faciles, pas celles qui sont activement surveillées.

SÉRÉNITÉ TOTALE :
Que vous soyez au travail, en déplacement ou en vacances, votre domicile est sous surveillance permanente par des professionnels formés qui savent comment réagir en toutes circonstances.

UNE SOLUTION ADAPTÉE À VOS BESOINS :
Plusieurs formules sont disponibles selon votre système et vos attentes. Nous pouvons vous présenter les différentes options lors d'un échange téléphonique ou par email.

INTÉRESSÉ(E) ?
Il vous suffit de répondre à ce mail ou de nous contacter directement pour en discuter.

NOS COORDONNÉES :
📞 Téléphone : 02 32 51 77 00
📧 Email : info@bruneau27.com

Ne laissez plus votre sécurité au hasard. Optez pour une protection professionnelle et réactive.

Bien cordialement,
L'équipe Bruneau Protection
    `.trim();

    const emailData = {
      from: "Bruneau Protection <info@bruneau27.com>",
      to: [to],
      subject: "🛡️ Protégez votre domicile 24h/24 avec la télésurveillance",
      html: emailHtml,
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
    console.error("Error in send-telesurveillance-email function:", error);
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

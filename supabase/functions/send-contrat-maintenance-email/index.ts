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
  installedYear?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, clientName, clientFirstName, installedYear }: EmailRequest = await req.json();

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

    const currentYear = new Date().getFullYear();

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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    .highlight-box {
      background: #fef3f5;
      border-left: 4px solid #E72C63;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .benefits-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
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
      border: 1px solid #d1fae5;
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
    .button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      border-radius: 0 0 10px 10px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .contact-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">🛡️ Protégez votre investissement avec notre contrat de maintenance</h1>
  </div>

  <div class="content">
    <p>${greeting}</p>

    <p>Je vous écris ce mail car votre système de sécurité est en place depuis maintenant ${installedYear ? `${installedYear}` : 'un certain temps'} et, comme tout équipement technique, il nécessite un suivi régulier afin de conserver dans le temps le même niveau de fiabilité et de performance.</p>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Pourquoi un suivi est essentiel ?</h3>
      <p style="margin-bottom: 0;">Avec les années, les composants s'usent et, surtout, <strong>les batteries et piles arrivent en fin de vie</strong>, ce qui peut compromettre le fonctionnement de l'alarme au moment où vous en avez le plus besoin.</p>
    </div>

    <p>Dans le but de pérenniser votre système et son efficacité tout en évitant les mauvaises surprises (techniques et budgétaires), nous souhaiterions vous proposer un <strong>contrat d'entretien</strong>.</p>

    <div class="benefits-box">
      <h2 style="margin-top: 0; color: #10b981;">✅ Ce qui est inclus</h2>

      <div class="benefit-item">
        <div class="benefit-icon">🔍</div>
        <div>
          <strong style="color: #10b981;">Tests périodiques complets</strong><br>
          Vérification approfondie de tous les composants de votre système
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">🔋</div>
        <div>
          <strong style="color: #10b981;">Remplacement des piles et batteries</strong><br>
          Prix inclus dans le contrat, sans frais supplémentaires
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">📹</div>
        <div>
          <strong style="color: #10b981;">Nettoyage des caméras</strong><br>
          Pour une qualité d'image optimale en toutes circonstances
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">🚗</div>
        <div>
          <strong style="color: #10b981;">Déplacements et interventions</strong><br>
          Sans facturation supplémentaire
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">⚡</div>
        <div>
          <strong style="color: #10b981;">Prise en charge prioritaire</strong><br>
          Vos interventions traitées en priorité
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">📡</div>
        <div>
          <strong style="color: #10b981;">Supervision proactive</strong><br>
          Pour les systèmes connectés : détection et résolution proactive des anomalies par nos services
        </div>
      </div>

      <div class="benefit-item">
        <div class="benefit-icon">📞</div>
        <div>
          <strong style="color: #10b981;">Assistance téléphonique 7j/7</strong><br>
          Une équipe à votre écoute tous les jours de la semaine
        </div>
      </div>
    </div>

    <div class="highlight-box">
      <h3 style="margin-top: 0; color: #E72C63;">💡 Comment souscrire ?</h3>
      <p style="margin-bottom: 0;">Si vous souhaitez mettre en place ce contrat d'entretien, il vous suffit de <strong>répondre à ce mail</strong> ou de nous contacter selon votre convenance.</p>
    </div>

    <div class="contact-box">
      <p style="margin-top: 0;"><strong>Nos coordonnées :</strong></p>
      <p style="margin: 5px 0;">📞 Téléphone : <strong>02 32 51 77 00</strong></p>
      <p style="margin: 5px 0;">📧 Email : <strong>info@bruneau27.com</strong></p>
    </div>

    <p>Restant à votre disposition pour tout besoin ou précision complémentaires.</p>

    <p style="margin-top: 30px;">Bien cordialement,</p>
    <p style="font-weight: 600; margin: 5px 0;">L'équipe Bruneau Protection</p>
  </div>

  <div class="footer">
    <p>Cet email a été envoyé par Bruneau Protection</p>
    <p style="font-size: 12px; margin-top: 10px;">Protégez votre système de sécurité avec un entretien régulier et professionnel.</p>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
${greeting}

Je vous écris ce mail car votre système de sécurité est en place depuis maintenant ${installedYear ? `${installedYear}` : 'un certain temps'} et, comme tout équipement technique, il nécessite un suivi régulier afin de conserver dans le temps le même niveau de fiabilité et de performance.

POURQUOI UN SUIVI EST ESSENTIEL ?

Avec les années, les composants s'usent et, surtout, les batteries et piles arrivent en fin de vie, ce qui peut compromettre le fonctionnement de l'alarme au moment où vous en avez le plus besoin.

Dans le but de pérenniser votre système et son efficacité tout en évitant les mauvaises surprises (techniques et budgétaires), nous souhaiterions vous proposer un contrat d'entretien.

CE QUI EST INCLUS :

✔ Tests périodiques complets du système
✔ Remplacement des piles et batteries (prix inclus)
✔ Nettoyage des caméras
✔ Déplacements et interventions (sans facturation)
✔ Prise en charge prioritaire des interventions
✔ Pour les systèmes connectés : supervision proactive des anomalies
✔ Assistance téléphonique 7 jours sur 7

COMMENT SOUSCRIRE ?

Si vous souhaitez mettre en place ce contrat d'entretien, il vous suffit de répondre à ce mail ou de nous contacter selon votre convenance.

NOS COORDONNÉES :
📞 Téléphone : 02 32 51 77 00
📧 Email : info@bruneau27.com

Restant à votre disposition pour tout besoin ou précision complémentaires.

Bien cordialement,
L'équipe Bruneau Protection
    `.trim();

    const emailData = {
      from: "Bruneau Protection <info@bruneau27.com>",
      to: [to],
      subject: "🛡️ Protégez votre système de sécurité - Contrat de maintenance",
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
    console.error("Error in send-contrat-maintenance-email function:", error);
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

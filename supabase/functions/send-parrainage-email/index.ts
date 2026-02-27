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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, prospectName, prospectFirstName }: EmailRequest = await req.json();

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
    console.log("Resend API key present:", !!resendApiKey);

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuration d'envoi d'emails manquante" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const greeting = prospectFirstName
      ? `Bonjour ${prospectFirstName},`
      : prospectName
        ? `Bonjour Madame, Monsieur ${prospectName},`
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
      background: linear-gradient(135deg, #E72C63 0%, #ff4d7a 100%);
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
    .reward-item {
      display: flex;
      align-items: start;
      margin: 15px 0;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .reward-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .button {
      display: inline-block;
      background: #E72C63;
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
    .steps-box {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .step-item {
      display: flex;
      align-items: start;
      margin: 15px 0;
      padding: 15px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #dbeafe;
    }
    .step-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .step-number {
      display: inline-block;
      background: #2563eb;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-weight: bold;
      font-size: 14px;
      margin-right: 15px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">🎁 Gagnez 100€ en parrainant vos proches !</h1>
  </div>

  <div class="content">
    <p>${greeting}</p>

    <p>En tant que client satisfait de <strong>Bruneau Protection</strong>, vous êtes notre meilleur ambassadeur !</p>

    <p>Nous sommes heureux de vous proposer notre <strong>programme de parrainage exclusif</strong> qui récompense votre confiance.</p>

    <div class="highlight-box">
      <h2 style="margin-top: 0; color: #E72C63;">🎁 Vos récompenses</h2>

      <div class="reward-item">
        <div class="reward-icon">👤</div>
        <div>
          <strong style="color: #E72C63;">Pour vous, le parrain :</strong><br>
          Un cadeau d'une valeur de <strong>100€</strong> au choix :
          <ul style="margin: 10px 0;">
            <li>🍽️ Un repas gastronomique à La Maison Pacel (Pacy-Sur-Eure)</li>
            <li>⛽ Une carte carburant de 100€</li>
          </ul>
        </div>
      </div>

      <div class="reward-item">
        <div class="reward-icon">🤝</div>
        <div>
          <strong style="color: #E72C63;">Pour votre filleul :</strong><br>
          Un avantage exclusif selon l'installation réalisée
        </div>
      </div>
    </div>

    <div class="steps-box">
      <h2 style="margin-top: 0; color: #2563eb;">🔄 Comment ça marche ?</h2>

      <div class="step-item">
        <div class="step-number">1</div>
        <div>
          <strong style="color: #2563eb;">Parlez-en autour de vous</strong><br>
          Parlez de Bruneau Protection à vos proches, famille, amis ou collègues
        </div>
      </div>

      <div class="step-item">
        <div class="step-number">2</div>
        <div>
          <strong style="color: #2563eb;">Mise en contact</strong><br>
          Ils nous contactent en mentionnant votre nom, ou vous pouvez, si vous le préférez, nous transmettre leurs coordonnées avec leur accord afin que nous les rappelions.
        </div>
      </div>

      <div class="step-item">
        <div class="step-number">3</div>
        <div>
          <strong style="color: #2563eb;">Recevez votre récompense !</strong><br>
          Une fois leur installation terminée, vous recevez votre récompense !
        </div>
      </div>
    </div>

    <p>N'hésitez pas à partager nos coordonnées avec vos connaissances qui recherchent des solutions de sécurité professionnelles :</p>

    <ul>
      <li>📞 Téléphone : 02 32 51 77 00</li>
      <li>📧 Email : info@bruneau27.com</li>
    </ul>

    <p><em>Plus vous parrainez, plus vous gagnez ! Il n'y a pas de limite au nombre de parrainages.</em></p>

    <p style="margin-top: 30px;">Merci de votre confiance et de votre fidélité !</p>

    <p style="margin-top: 20px;">Cordialement,</p>
    <p style="font-weight: 600; margin: 5px 0;">L'équipe Bruneau Protection</p>
  </div>

  <div class="footer">
    <p>Cet email a été envoyé par Bruneau Protection</p>
    <p style="font-size: 12px; margin-top: 10px;">Offre de parrainage soumise à conditions. La récompense est versée après la réalisation complète de l'installation chez le filleul.</p>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
${greeting}

En tant que client satisfait de Bruneau Protection, vous êtes notre meilleur ambassadeur !

Nous sommes heureux de vous proposer notre programme de parrainage exclusif qui récompense votre confiance.

🎁 VOS RÉCOMPENSES

Pour vous, le parrain :
Un cadeau d'une valeur de 100€ au choix :
- Un repas gastronomique à La Maison Pacel (Pacy-Sur-Eure)
- Une carte carburant de 100€

Pour votre filleul :
Un avantage exclusif selon l'installation réalisée

COMMENT ÇA MARCHE ?

→ Parlez de Bruneau Protection à vos proches, famille, amis ou collègues
→ Ils nous contactent en mentionnant votre nom, ou vous pouvez, si vous le préférez, nous transmettre leurs coordonnées avec leur accord afin que nous les rappelions.
→ Une fois leur installation terminée, vous recevez votre récompense !

N'hésitez pas à partager nos coordonnées avec vos connaissances qui recherchent des solutions de sécurité professionnelles :

📞 Téléphone : 02 32 51 77 00
📧 Email : info@bruneau27.com

Plus vous parrainez, plus vous gagnez ! Il n'y a pas de limite au nombre de parrainages.

Merci de votre confiance et de votre fidélité !

Cordialement,

L'équipe Bruneau Protection

---
Offre de parrainage soumise à conditions. La récompense est versée après la réalisation complète de l'installation chez le filleul.
    `.trim();

    const emailPayload = {
      from: "Bruneau Protection <info@bruneau27.com>",
      to: [to],
      subject: "🎁 Gagnez 100€ avec notre programme de parrainage !",
      html: emailHtml,
      text: emailText,
    };

    console.log("Sending email to Resend API...");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("Resend response status:", response.status);
    const data = await response.json();
    console.log("Resend response data:", data);

    if (!response.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({
          error: "Erreur lors de l'envoi de l'email",
          details: data
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
        emailId: data.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur serveur lors de l'envoi de l'email",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

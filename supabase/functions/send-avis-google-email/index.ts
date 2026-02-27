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

    const googleReviewLink = 'https://g.page/r/CbIcLjx6WVIwEB0/review';

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
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">Votre avis compte pour nous !</h1>
  </div>

  <div class="content">
    <p>${greeting}</p>

    <p>Nous tenons à vous remercier chaleureusement pour la <strong>confiance que vous nous avez accordée</strong> en choisissant Bruneau Protection pour votre projet de sécurité.</p>

    <p>Votre satisfaction est notre priorité absolue, et nous espérons que notre intervention a pleinement répondu à vos attentes.</p>

    <p><strong>Votre avis est précieux</strong> pour nous et pour nos futurs clients. Pourriez-vous prendre quelques instants pour partager votre expérience sur Google ?</p>

    <div style="text-align: center;">
      <a href="${googleReviewLink}" class="button">⭐ Laisser mon avis sur Google</a>
    </div>

    <p>Votre retour nous aide à améliorer constamment nos services et à accompagner d'autres clients dans leurs projets de protection.</p>

    <p>Nous vous remercions par avance pour votre temps et votre soutien.</p>

    <p style="margin-top: 30px;">Cordialement,</p>
    <p style="font-weight: 600; margin: 5px 0;">L'équipe Bruneau Protection</p>
  </div>

  <div class="footer">
    <p>Cet email a été envoyé par Bruneau Protection</p>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
${greeting}

Nous tenons à vous remercier chaleureusement pour la confiance que vous nous avez accordée en choisissant Bruneau Protection pour votre projet de sécurité.

Votre satisfaction est notre priorité absolue, et nous espérons que notre intervention a pleinement répondu à vos attentes.

Votre avis est précieux pour nous et pour nos futurs clients. Pourriez-vous prendre quelques instants pour partager votre expérience sur Google ?

👉 Laissez votre avis en cliquant ici : ${googleReviewLink}

Votre retour nous aide à améliorer constamment nos services et à accompagner d'autres clients dans leurs projets de protection.

Nous vous remercions par avance pour votre temps et votre soutien.

Cordialement,

L'équipe Bruneau Protection
    `.trim();

    const emailPayload = {
      from: "Bruneau Protection <info@bruneau27.com>",
      to: [to],
      subject: "Votre avis compte pour nous !",
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

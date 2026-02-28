import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtrabatRequest {
  technicianCodes?: string[];
  interventionData?: {
    clientName: string;
    systemType: string;
    problemDesc: string;
    startedAt: string;
    endedAt?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  clientId?: number;
  extrabatAppointmentId?: string;
  action?: string;
  appointmentId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get('EXTRABAT_API_KEY');
    const securityKey = Deno.env.get('EXTRABAT_SECURITY');

    if (!apiKey || !securityKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Clés API non configurées'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const endpoint = url.searchParams.get('endpoint');

      if (!endpoint) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Paramètre endpoint manquant'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const extrabatUrl = `https://api.extrabat.com${endpoint}`;
      console.log('🔍 GET Request:', extrabatUrl);

      const response = await fetch(extrabatUrl, {
        method: 'GET',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur Extrabat GET:', responseData);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erreur API Extrabat: ${response.status}`,
            status: response.status,
            details: responseData
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody: ExtrabatRequest = await req.json();

    if (requestBody.action === 'deleteAppointment') {
      const { appointmentId } = requestBody;

      const response = await fetch(
        `https://api.extrabat.com/v1/agenda/rendez-vous/${appointmentId}`,
        {
          method: 'DELETE',
          headers: {
            'X-EXTRABAT-API-KEY': apiKey,
            'X-EXTRABAT-SECURITY': securityKey,
          }
        }
      );

      const responseData = await response.json();

      return new Response(
        JSON.stringify({
          success: response.ok,
          data: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { technicianCodes, interventionData, clientId, extrabatAppointmentId } = requestBody;

    if (!technicianCodes || technicianCodes.length === 0 || !interventionData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Paramètres manquants'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const parseLocalDateString = (dateString: string): string => {
      const d = new Date(dateString);
      // Deno runs in UTC - use UTC methods to preserve the exact time sent by the frontend
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:00`;
    };

    const debut = parseLocalDateString(interventionData.startedAt);

    let fin: string;
    if (interventionData.endedAt) {
      fin = parseLocalDateString(interventionData.endedAt);
    } else {
      const parts = debut.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        const [, y, m, d, h, min] = parts;
        const endHour = (parseInt(h) + 2) % 24;
        fin = `${y}-${m}-${d} ${String(endHour).padStart(2, '0')}:${min}:00`;
      } else {
        fin = debut;
      }
    }

    const isUpdate = !!extrabatAppointmentId;

    const appointment: any = {
      journee: false,
      objet: `${interventionData.systemType} - ${interventionData.clientName}`,
      debut: debut,
      fin: fin,
      couleur: 131577
    };

    if (isUpdate) {
      if (interventionData.problemDesc !== undefined) {
        appointment.observation = interventionData.problemDesc;
      }
    } else {
      appointment.observation = interventionData.problemDesc || '';
    }

    // Ajouter les users pour la création et la modification
    appointment.users = technicianCodes.map(code => ({
      user: parseInt(code, 10)
    }));

    if (interventionData.address) {
      const addressParts = interventionData.address.split(',').map(part => part.trim());
      if (addressParts.length >= 2) {
        appointment.rue = addressParts[0];
        const lastPart = addressParts[addressParts.length - 1];
        const cpVilleMatch = lastPart.match(/^(\d{5})\s+(.+)$/);
        if (cpVilleMatch) {
          appointment.cp = cpVilleMatch[1];
          appointment.ville = cpVilleMatch[2];
        } else {
          appointment.ville = lastPart;
        }
      } else {
        appointment.rue = interventionData.address;
      }
    }

    if (interventionData.latitude !== undefined && interventionData.longitude !== undefined) {
      appointment.latitude = interventionData.latitude;
      appointment.longitude = interventionData.longitude;
    }

    if (clientId) {
      appointment.rdvClients = [{ client: clientId }];
    }

    const apiUrl = isUpdate
      ? `https://api.extrabat.com/v1/agenda/rendez-vous/${extrabatAppointmentId}`
      : 'https://api.extrabat.com/v1/agenda/rendez-vous';

    console.log('📤 Envoi à Extrabat:', JSON.stringify(appointment, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTRABAT-API-KEY': apiKey,
        'X-EXTRABAT-SECURITY': securityKey,
      },
      body: JSON.stringify(appointment)
    });

    let responseData;
    let responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    console.log('📥 Réponse Extrabat:', typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);

    if (!response.ok) {
      console.error('❌ Erreur Extrabat:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur API Extrabat: ${response.status}`,
          status: response.status,
          details: responseData,
          sentPayload: appointment
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        message: isUpdate ? 'RDV modifié avec intervenants' : 'RDV créé'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

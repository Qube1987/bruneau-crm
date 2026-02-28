import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    console.log('📦 Requête reçue:', JSON.stringify({
      technicianCodes,
      technicianCodesLength: technicianCodes?.length,
      hasInterventionData: !!interventionData,
      isUpdate: !!extrabatAppointmentId
    }, null, 2));

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
      const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (!parts) {
        const d = new Date(dateString);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

      const [, year, month, day, hours, minutes] = parts;
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
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTRABAT-API-KEY': apiKey,
        'X-EXTRABAT-SECURITY': securityKey,
      },
      body: JSON.stringify(appointment)
    });

    const responseData = await response.json();
    console.log('📥 Réponse Extrabat:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('❌ Erreur Extrabat:', responseData);
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
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

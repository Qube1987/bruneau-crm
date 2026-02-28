const https = require('https');

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function emulateFrontend() {
    // 1. Create a fresh real Extrabat appointment to get an ID that hasn't been corrupted
    const createData = JSON.stringify({
        objet: 'TEST RDV to keep for Proxy Update Tests',
        debut: '2026-03-01 09:00:00',
        fin: '2026-03-01 17:00:00',
        journee: false,
        couleur: 131577,
        users: [{ user: 46516 }]
    });

    const createOpts = {
        hostname: 'api.extrabat.com',
        port: 443,
        path: '/v1/agenda/rendez-vous',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-EXTRABAT-API-KEY': 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3',
            'X-EXTRABAT-SECURITY': 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c',
            'Content-Length': Buffer.byteLength(createData)
        }
    };

    console.log('Sending Create Request...');
    const createRes = await request(createOpts, createData);
    const newId = JSON.parse(createRes.data).id;
    console.log('Created Fresh ID:', newId);

    // 2. Emulate the frontend's EXPLICIT object structure!
    const frontendBody = JSON.stringify({
        extrabatAppointmentId: newId.toString(),
        technicianCodes: ["46516"],
        interventionData: {
            clientName: "Frontend Emulation",
            systemType: "Frontend System Default",
            problemDesc: "This simulates the web interface payload.",
            startedAt: "2026-03-01T09:00:00",
            endedAt: "2026-03-01T17:00:00",
            address: "123 Rue de la Simulation, 75001 Paris",
            latitude: 48.8566,
            longitude: 2.3522
        },
        clientId: undefined
    });

    const opts = {
        hostname: 'rzxisqsdsiiuwaixnneo.supabase.co',
        port: 443,
        path: '/functions/v1/extrabat-proxy',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(frontendBody)
        }
    };

    console.log('Emulating frontend hitting the proxy with ID:', newId);
    const res = await request(opts, frontendBody);
    console.log('Proxy Status:', res.status);
    console.log('Proxy Response:\n', res.data);
}

emulateFrontend().catch(console.error);

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

const extrabatHeaders = {
    'X-EXTRABAT-API-KEY': 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3',
    'X-EXTRABAT-SECURITY': 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c',
};

async function test() {
    // Create fresh ID directly on Extrabat
    const createData = JSON.stringify({
        objet: 'TEST', debut: '2026-03-01 09:00:00', fin: '2026-03-01 17:00:00',
        journee: false, couleur: 131577, users: [{ user: 46516 }]
    });
    const createRes = await request({
        hostname: 'api.extrabat.com', port: 443, path: '/v1/agenda/rendez-vous', method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extrabatHeaders, 'Content-Length': Buffer.byteLength(createData) }
    }, createData);
    const newId = JSON.parse(createRes.data).id;
    console.log('Created Fresh ID:', newId);

    // Now call the PROXY with the EXACT frontend payload structure
    const proxyBody = JSON.stringify({
        extrabatAppointmentId: newId.toString(),
        technicianCodes: ["47191", "46516"],
        interventionData: {
            clientName: "BRUNEAU Quentin Quentin",
            systemType: "BRUNEAU Quentin Quentin",
            problemDesc: "Intervention chantier",
            startedAt: "2026-02-28T15:00:00.000Z",
            endedAt: "2026-02-28T16:00:00.000Z",
            address: "1 rue de l'ancienne forge, 27950 La Heunière"
        },
        clientId: 9305406
    });

    const proxyRes = await request({
        hostname: 'rzxisqsdsiiuwaixnneo.supabase.co', port: 443,
        path: '/functions/v1/extrabat-proxy', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(proxyBody) }
    }, proxyBody);

    console.log('Proxy Status:', proxyRes.status);
    console.log('Proxy Body:', proxyRes.data.substring(0, 500));
}

test().catch(console.error);

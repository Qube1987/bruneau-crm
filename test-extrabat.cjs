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

async function createAndProxyUpdate() {
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
    const result = JSON.parse(createRes.data);
    const newId = result.id;
    console.log('Created ID:', newId);

    // EXACT payload from the proxy!
    const updateData = JSON.stringify({
        journee: false,
        objet: 'System test proxy - Client Test Proxy Validation',
        debut: '2026-03-01 09:00:00',
        fin: '2026-03-01 11:00:00',
        couleur: 131577,
        // id: newId,
        // rdv: newId,
        observation: 'Testing if proxy payload is valid for a REAL fresh ID',
        users: [{ user: 46516 }] // Array format works
    });

    const updateOpts = {
        hostname: 'api.extrabat.com',
        port: 443,
        path: `/v1/agenda/rendez-vous/${newId}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-EXTRABAT-API-KEY': 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3',
            'X-EXTRABAT-SECURITY': 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c',
            'Content-Length': Buffer.byteLength(updateData)
        }
    };

    console.log('Sending proxy structured update request...');
    const updateRes = await request(updateOpts, updateData);
    console.log('Update Status:', updateRes.status);
    console.log('Update Body:', updateRes.data);
}

createAndProxyUpdate().catch(console.error);

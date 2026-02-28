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

// This is the local timezone version (UTC+1 — my machine)
function parseLocalDateStringLocal(dateString) {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
}

// This is what Deno in UTC would generate from "2026-02-28T15:00:00.000Z"
function parseLocalDateStringUTC(dateString) {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
}

const baseHeaders = {
    'X-EXTRABAT-API-KEY': 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3',
    'X-EXTRABAT-SECURITY': 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c',
};

async function post(path, body) {
    const data = JSON.stringify(body);
    const res = await request({
        hostname: 'api.extrabat.com', port: 443, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', ...baseHeaders, 'Content-Length': Buffer.byteLength(data) }
    }, data);
    return { status: res.status, body: res.data.substring(0, 400) };
}

async function test() {
    // Create
    const created = await post('/v1/agenda/rendez-vous', {
        objet: 'TEST', debut: '2026-03-01 09:00:00', fin: '2026-03-01 17:00:00',
        journee: false, couleur: 131577, users: [{ user: 46516 }]
    });
    const newId = JSON.parse(created.body).id;
    console.log('Created ID:', newId);

    // Show what each parser produces from the frontend UTC strings
    const startedAt = "2026-02-28T15:00:00.000Z";
    const endedAt = "2026-02-28T16:00:00.000Z";
    console.log('Local parse  debut:', parseLocalDateStringLocal(startedAt));
    console.log('Local parse  fin:  ', parseLocalDateStringLocal(endedAt));
    console.log('UTC   parse  debut:', parseLocalDateStringUTC(startedAt));
    console.log('UTC   parse  fin:  ', parseLocalDateStringUTC(endedAt));

    // Test with UTC dates (what Deno is actually generating on Supabase servers!)
    const utcDebut = parseLocalDateStringUTC(startedAt);
    const utcFin = parseLocalDateStringUTC(endedAt);

    const testUTC = await post(`/v1/agenda/rendez-vous/${newId}`, {
        objet: 'Test objet',
        debut: utcDebut,
        fin: utcFin,
        journee: false,
        couleur: 131577,
        observation: 'Intervention chantier',
        users: [{ user: 46516 }]
    });
    console.log('\nTest with UTC dates Status:', testUTC.status);
    if (testUTC.status === 200) console.log('SUCCESS - UTC dates work!');
    else console.log('FAIL body:', testUTC.body);
}

test().catch(console.error);

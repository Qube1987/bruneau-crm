const https = require('https');
function req(opts, body) {
    return new Promise((res_, rej) => {
        const r = https.request(opts, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => res_({ s: res.statusCode, b })); });
        r.on('error', rej); if (body) r.write(body); r.end();
    });
}
const d = JSON.stringify({ objet: 'TEST', debut: '2026-03-01 09:00:00', fin: '2026-03-01 17:00:00', journee: false, couleur: 131577, users: [{ user: 46516 }] });
req({ hostname: 'api.extrabat.com', port: 443, path: '/v1/agenda/rendez-vous', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EXTRABAT-API-KEY': 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3', 'X-EXTRABAT-SECURITY': 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c', 'Content-Length': Buffer.byteLength(d) } }, d).then(r => { const id = JSON.parse(r.b).id; console.log(id); }).catch(console.error);

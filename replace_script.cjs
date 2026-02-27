const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
let modifiedFiles = [];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // 1. Rename table references
    content = content.replace(/from\(['"]prospects['"]\)/g, "from('clients')");
    content = content.replace(/from\(['"]prospect_contacts['"]\)/g, "from('client_contacts')");

    content = content.replace(/prospect_contacts\(\*/g, "client_contacts(*");
    content = content.replace(/contacts:prospect_contacts\(\*/g, "contacts:client_contacts(*");

    content = content.replace(/prospects\(\*/g, "clients(*");
    content = content.replace(/prospect:prospects\(\*/g, "prospect:clients(*");
    content = content.replace(/prospects\(/g, "clients(");
    content = content.replace(/opportunites\(prospect_id\)/g, "opportunites(client_id)");

    // 2. Rename prospect_id to client_id globally
    content = content.replace(/prospect_id/g, 'client_id');
    content = content.replace(/prospectId/g, 'clientId');

    // 3. Rename date_creation to created_at FOR PROSPECTS ONLY
    if (file.endsWith('supabaseApi.ts')) {
        content = content.replace(/date_creation: string;[\r\n\s]*date_modification: string;/g, "created_at: string;\n  updated_at: string;");
        content = content.replace(/Omit<Prospect, 'id' \| 'date_creation' \| 'date_modification'>/g, "Omit<Prospect, 'id' | 'created_at' | 'updated_at'>");

        content = content.replace(/getProspects\(\): Promise<Prospect\[\]> {[\s\S]*?from\('clients'\)[\s\S]*?select\('\*'\)[\s\S]*?order\('date_creation'/g, (match) => {
            return match.replace(/date_creation/, 'created_at');
        });

        content = content.replace(/updateProspect\([^\)]*\)[\s\S]*?from\('clients'\)[\s\S]*?update\(\{[\s\S]*?date_modification:[^\}]*\}\)/g, (match) => {
            return match.replace(/date_modification/, 'updated_at');
        });
    } else if (file.endsWith('dashboardService.ts')) {
        content = content.replace(/from\('clients'\)\.select\('\*'\)\.eq\('client_id', clientId\)\.order\('date_creation'/g, "from('clients').select('*').eq('client_id', clientId).order('created_at'");
    } else if (file.endsWith('ProspectForm.tsx')) {
        content = content.replace(/order\('date_creation'/g, "order('created_at'");
        content = content.replace(/prospect\.date_creation/g, "prospect.created_at");
    } else if (file.endsWith('ProspectionForm.tsx')) {
        content = content.replace(/order\('date_creation'/g, "order('created_at'");
        content = content.replace(/prospect\.date_creation/g, "prospect.created_at");
    } else if (file.endsWith('ProspectQuickModal.tsx')) {
        content = content.replace(/date_modification: new Date/g, "updated_at: new Date");
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFiles.push(file);
    }
});

console.log('Modified files:', modifiedFiles.length);
modifiedFiles.forEach(f => console.log(' -', f));

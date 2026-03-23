#!/usr/bin/env node
/**
 * Aplica a migration 0010 no Supabase via Management API.
 *
 * Uso:
 *   node scripts/apply-migration.js <SUPABASE_ACCESS_TOKEN>
 *
 * Obtenha o token em: https://supabase.com/dashboard/account/tokens
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'zihgsqsaqftjouvunqvw';
const token = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
    console.error('\n❌  Token não fornecido.\n');
    console.error('   Uso: node scripts/apply-migration.js <TOKEN>');
    console.error('   Obtenha o token em: https://supabase.com/dashboard/account/tokens\n');
    process.exit(1);
}

const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '0010_saas_refactor.sql');
const sql     = fs.readFileSync(sqlFile, 'utf8');

function postQuery(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query });
        const req  = https.request({
            hostname: 'api.supabase.com',
            path:     `/v1/projects/${PROJECT_REF}/database/query`,
            method:   'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('\n🔄  Testando token...');
    const test = await postQuery('SELECT current_database()');
    if (test.status !== 200) {
        console.error('❌  Token inválido ou sem permissão:', JSON.stringify(test.body));
        process.exit(1);
    }
    console.log('✅  Conexão ok:', test.body);

    console.log('\n🔄  Aplicando migration 0010_saas_refactor.sql...');
    const result = await postQuery(sql);

    if (result.status === 200 || result.status === 201) {
        console.log('\n✅  Migration aplicada com sucesso!\n');
    } else {
        console.error('\n⚠️  Resposta:', result.status);
        console.error(JSON.stringify(result.body, null, 2));
        console.error('\nSe o erro for de conflito (column already exists, etc.), pode ser normal.\n');
    }

    // Cria o bucket de arquivos de projeto no Supabase Storage
    console.log('🔄  Verificando bucket project-files...');
    const bucketRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id:         'project-files',
            name:       'project-files',
            public:     false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        }),
    });
    const bucketData = await bucketRes.json();
    if (bucketRes.ok || bucketData.error === 'The resource already exists') {
        console.log('✅  Bucket project-files ok.\n');
    } else {
        console.log('⚠️  Bucket:', JSON.stringify(bucketData));
    }

    // Aplica stages padrão para orgs existentes
    console.log('🔄  Criando etapas padrão de Kanban para marcenarias existentes...');
    const stagesResult = await postQuery(`
        DO $$
        DECLARE org_row RECORD;
        BEGIN
            FOR org_row IN SELECT id FROM organizations LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM kanban_stages WHERE organization_id = org_row.id LIMIT 1
                ) THEN
                    PERFORM create_default_kanban_stages(org_row.id);
                    RAISE NOTICE 'Stages criados para org %', org_row.id;
                END IF;
            END LOOP;
        END $$;
    `);
    if (stagesResult.status === 200) {
        console.log('✅  Etapas padrão criadas para todas as marcenarias.\n');
    } else {
        console.log('⚠️  Stages:', JSON.stringify(stagesResult.body));
    }

    console.log('🎉  Setup completo!\n');
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });

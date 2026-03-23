#!/usr/bin/env node
/**
 * Seed completo do banco de dados para testes.
 * Limpa tudo e recria 3 marcenarias com dados completos + todos os usuários.
 */

const https = require('https');

const TOKEN       = 'sbp_d3294999586041e133964986eeefcc391887b812';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaGdzcXNhcWZ0am91dnVucXZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0NzMwOSwiZXhwIjoyMDg4MjIzMzA5fQ.xhTl3WEVslEzIg-a5F351lmp2j6gUm6iVjF2GPo33vc';
const PROJECT_REF = 'zihgsqsaqftjouvunqvw';
const PASSWORD    = 'Marcenaria@2025';

// ──────────────────────────────────────────────
// HTTP helpers
// ──────────────────────────────────────────────
function postQuery(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const req  = https.request({
            hostname: 'api.supabase.com',
            path: `/v1/projects/${PROJECT_REF}/database/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve({ ok: res.statusCode < 300, status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ ok: false, status: res.statusCode, body: data }); } });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function authRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: `/auth/v1${path}`,
            method,
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY,
                'Content-Type': 'application/json',
            },
        };
        if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve({ ok: res.statusCode < 300, status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ ok: false, status: res.statusCode, body: data }); } });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function createAuthUser(email, name) {
    const r = await authRequest('POST', '/admin/users', {
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: name },
    });
    if (!r.ok) throw new Error(`Erro ao criar ${email}: ${JSON.stringify(r.body)}`);
    return r.body.id;
}

async function deleteAllAuthUsers() {
    const r = await authRequest('GET', '/admin/users?per_page=200');
    if (!r.ok) return;
    const users = r.body.users || [];
    for (const u of users) {
        await authRequest('DELETE', `/admin/users/${u.id}`);
    }
    console.log(`  Removidos ${users.length} usuários do auth.`);
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function run() {
    console.log('\n════════════════════════════════════════');
    console.log('  SEED — Marcenaria Pro (Dados de Teste)');
    console.log('════════════════════════════════════════\n');

    // ── FASE 1: Limpar banco ──────────────────
    console.log('🗑️  Limpando banco de dados...');
    await postQuery(`SET session_replication_role = 'replica';`);
    await postQuery(`
        TRUNCATE TABLE
            audit_logs, calendar_events, project_files,
            commissions, stock_movements, installments,
            purchases, expenses, sales, inventory,
            architects, clients, suppliers, kanban_stages,
            profiles, organizations
        CASCADE;
    `);
    console.log('  Tabelas limpas. Removendo usuários de autenticação...');
    await deleteAllAuthUsers();
    await postQuery(`SET session_replication_role = 'origin';`);
    console.log('✅ Banco limpo!\n');

    // ── FASE 2: Criar usuários no auth ────────
    console.log('👤 Criando usuários de autenticação...');
    const ids = {};

    ids.sysadmin = await createAuthUser('ilson@marcenariapro.com.br',     'Ilson Brandão');

    ids.e_owner   = await createAuthUser('carlos@elitemovels.com.br',      'Carlos Eduardo Santos');
    ids.e_office  = await createAuthUser('ana@elitemovels.com.br',         'Ana Paula Ferreira');
    ids.e_seller  = await createAuthUser('pedro@elitemovels.com.br',       'Pedro Henrique Costa');
    ids.e_carp    = await createAuthUser('jose@elitemovels.com.br',        'José da Silva');

    ids.m_owner   = await createAuthUser('lucia@modernainteriores.com.br', 'Lúcia Mendes Gomes');
    ids.m_office  = await createAuthUser('rafael@modernainteriores.com.br','Rafael Oliveira Lima');
    ids.m_seller  = await createAuthUser('marina@modernainteriores.com.br','Marina Torres Faria');
    ids.m_carp    = await createAuthUser('paulo@modernainteriores.com.br', 'Paulo Roberto Souza');

    ids.c_owner   = await createAuthUser('roberto@classicamarcenaria.com.br','Roberto Alves Cardoso');
    ids.c_office  = await createAuthUser('carla@classicamarcenaria.com.br',  'Carla Souza Moreira');
    ids.c_seller  = await createAuthUser('fernanda@classicamarcenaria.com.br','Fernanda Lima Costa');
    ids.c_carp    = await createAuthUser('antonio@classicamarcenaria.com.br', 'Antônio Pereira Santos');

    console.log(`✅ 13 usuários criados! (senha: ${PASSWORD})\n`);

    // ── FASE 3: Inserir dados via SQL ─────────
    console.log('🏗️  Inserindo dados...\n');

    const sql = `
-- ═══════════════════════════════════════
-- ORGANIZAÇÕES
-- ═══════════════════════════════════════
INSERT INTO organizations (id, name, cnpj, phone, address, plan, color_theme, is_active) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Elite Móveis Planejados Ltda',    '12.345.678/0001-90', '(11) 3456-7890', 'Rua das Acácias, 123 - Moema, São Paulo - SP',              'enterprise', 'blue',   true),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'Moderna Interiores e Design',     '98.765.432/0001-10', '(21) 2345-6789', 'Av. das Américas, 4200 - Barra da Tijuca, Rio de Janeiro - RJ','pro',       'green',  true),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Clássica Marcenaria Artesanal',   '45.678.901/0001-23', '(31) 3456-7890', 'Rua dos Ipês, 789 - Santa Efigênia, Belo Horizonte - MG',   'basic',      'purple', true);

-- ═══════════════════════════════════════
-- PERFIS
-- ═══════════════════════════════════════
INSERT INTO profiles (id, organization_id, role, full_name, phone, cpf, address, city, state, is_active) VALUES
  ('${ids.sysadmin}', NULL,                                   'sysadmin', 'Ilson Brandão',          '(51) 99000-0001', '000.000.000-01', 'Rua da Tecnologia, 1 - Porto Alegre - RS', 'Porto Alegre',     'RS', true),

  ('${ids.e_owner}',  'aaaaaaaa-0001-0001-0001-000000000001', 'owner',    'Carlos Eduardo Santos',  '(11) 99100-1001', '111.222.333-44', 'Rua das Acácias, 123 - São Paulo - SP',    'São Paulo',        'SP', true),
  ('${ids.e_office}', 'aaaaaaaa-0001-0001-0001-000000000001', 'office',   'Ana Paula Ferreira',     '(11) 99200-2002', '222.333.444-55', 'Av. Paulista, 1000 - São Paulo - SP',      'São Paulo',        'SP', true),
  ('${ids.e_seller}', 'aaaaaaaa-0001-0001-0001-000000000001', 'seller',   'Pedro Henrique Costa',   '(11) 99300-3003', '333.444.555-66', 'Rua Vergueiro, 500 - São Paulo - SP',      'São Paulo',        'SP', true),
  ('${ids.e_carp}',   'aaaaaaaa-0001-0001-0001-000000000001', 'carpenter','José da Silva',           '(11) 99400-4004', '444.555.666-77', 'Rua do Ipiranga, 200 - São Paulo - SP',   'São Paulo',        'SP', true),

  ('${ids.m_owner}',  'aaaaaaaa-0002-0002-0002-000000000002', 'owner',    'Lúcia Mendes Gomes',     '(21) 99100-1001', '555.666.777-88', 'Av. das Américas, 4200 - Rio de Janeiro', 'Rio de Janeiro',   'RJ', true),
  ('${ids.m_office}', 'aaaaaaaa-0002-0002-0002-000000000002', 'office',   'Rafael Oliveira Lima',   '(21) 99200-2002', '666.777.888-99', 'Rua Visconde de Pirajá, 300 - Ipanema',   'Rio de Janeiro',   'RJ', true),
  ('${ids.m_seller}', 'aaaaaaaa-0002-0002-0002-000000000002', 'seller',   'Marina Torres Faria',    '(21) 99300-3003', '777.888.999-00', 'Rua Barata Ribeiro, 150 - Copacabana',    'Rio de Janeiro',   'RJ', true),
  ('${ids.m_carp}',   'aaaaaaaa-0002-0002-0002-000000000002', 'carpenter','Paulo Roberto Souza',    '(21) 99400-4004', '888.999.000-11', 'Av. Brasil, 500 - Centro - Rio de Janeiro','Rio de Janeiro',  'RJ', true),

  ('${ids.c_owner}',  'aaaaaaaa-0003-0003-0003-000000000003', 'owner',    'Roberto Alves Cardoso',  '(31) 99100-1001', '999.000.111-22', 'Rua dos Ipês, 789 - Belo Horizonte - MG', 'Belo Horizonte',   'MG', true),
  ('${ids.c_office}', 'aaaaaaaa-0003-0003-0003-000000000003', 'office',   'Carla Souza Moreira',    '(31) 99200-2002', '000.111.222-33', 'Av. Afonso Pena, 200 - Belo Horizonte',   'Belo Horizonte',   'MG', true),
  ('${ids.c_seller}', 'aaaaaaaa-0003-0003-0003-000000000003', 'seller',   'Fernanda Lima Costa',    '(31) 99300-3003', '111.222.333-55', 'Rua da Bahia, 400 - Belo Horizonte - MG', 'Belo Horizonte',   'MG', true),
  ('${ids.c_carp}',   'aaaaaaaa-0003-0003-0003-000000000003', 'carpenter','Antônio Pereira Santos', '(31) 99400-4004', '222.333.444-66', 'Rua Guajajaras, 100 - Belo Horizonte',    'Belo Horizonte',   'MG', true);

-- ═══════════════════════════════════════
-- KANBAN STAGES (por org)
-- ═══════════════════════════════════════
SELECT create_default_kanban_stages('aaaaaaaa-0001-0001-0001-000000000001');
SELECT create_default_kanban_stages('aaaaaaaa-0002-0002-0002-000000000002');
SELECT create_default_kanban_stages('aaaaaaaa-0003-0003-0003-000000000003');

-- ═══════════════════════════════════════
-- CLIENTES (CRM)
-- ═══════════════════════════════════════
INSERT INTO clients (id, organization_id, name, phone, email, address, notes) VALUES
  -- Elite
  ('bbbb0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','João Victor Almeida',    '(11) 99500-5001','joao.almeida@gmail.com',   'Rua Pamplona, 145 - Jardins, SP',       'Cliente recorrente. Projeto de alto padrão.'),
  ('bbbb0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Maria Fernanda Santos',  '(11) 99500-5002','mafe.santos@outlook.com',  'Av. Ibirapuera, 3103 - Moema, SP',      'Indicada pela arquiteta Beatriz.'),
  ('bbbb0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','Paulo Roberto Ramos',    '(11) 99500-5003','paulo.ramos@empresa.com.br','Rua Oscar Freire, 900 - Jardins, SP',   'Empresário. Urgência no prazo.'),
  ('bbbb0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','Ana Cristina Figueiredo','(11) 99500-5004','anacristina@yahoo.com.br', 'Al. Santos, 787 - Cerqueira César, SP', 'Apartamento novo. Quer entrega em 60 dias.'),
  -- Moderna
  ('bbbb0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','Roberto Carlos Costa',   '(21) 99700-7001','roberto.costa@gmail.com',  'Av. das Américas, 3900 - Barra, RJ',    'Casa em condomínio. Projeto grande.'),
  ('bbbb0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Sandra Lima Pereira',    '(21) 99700-7002','sandra.lima@hotmail.com',  'Rua García D''Ávila, 56 - Ipanema, RJ', 'Apartamento de frente para o mar.'),
  ('bbbb0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','Felipe Araujo Neto',     '(21) 99700-7003','felipe.araujo@empresa.com', 'Av. Ayrton Senna, 2150 - Barra, RJ',   'Escritório corporativo. Faturamento pessoa jurídica.'),
  ('bbbb0002-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-000000000002','Cristina Peres Viana',   '(21) 99700-7004','cristina.peres@gmail.com', 'Rua Visconde de Pirajá, 500 - Ipanema', 'Mudança para apartamento reformado.'),
  -- Clássica
  ('bbbb0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','Gustavo Dias Freitas',   '(31) 99900-9001','gustavo.dias@gmail.com',   'Rua dos Otoni, 200 - Santa Efigênia, BH','Quarto infantil para 2 crianças.'),
  ('bbbb0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Patrícia Souza Melo',    '(31) 99900-9002','patricia.melo@hotmail.com','Av. Afonso Pena, 1500 - Centro, BH',    'Cozinha compacta. Orçamento fixo.'),
  ('bbbb0003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','Diego Martins Barros',   '(31) 99900-9003','diego.barros@outlook.com', 'Rua da Bahia, 600 - Lourdes, BH',       'Arquiteto parceiro recomendou.'),
  ('bbbb0003-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-000000000003','Camila Freitas Alves',   '(31) 99900-9004','camila.freitas@gmail.com', 'Rua Curitiba, 300 - Lourdes, BH',       'Apartamento pequeno. Soluções de espaço.');

-- ═══════════════════════════════════════
-- ARQUITETOS PARCEIROS
-- ═══════════════════════════════════════
INSERT INTO architects (id, organization_id, name, phone, email, default_rt_percent, notes) VALUES
  -- Elite
  ('cccc0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','Beatriz Nunes Arquitetura','(11) 99600-6001','beatriz@nunesarq.com.br', 8.0,'Studio em Pinheiros. Foco em alto padrão residencial.'),
  ('cccc0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Ricardo Azevedo Design',  '(11) 99600-6002','ricardo@azevedo.arq.br',  10.0,'Especialista em interiores comerciais e corporativos.'),
  -- Moderna
  ('cccc0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','Camila Rocha Interiores', '(21) 99800-8001','camila@rochadesign.com.br', 7.0,'Top 10 arquitetas do RJ. Clientes de altíssimo padrão.'),
  ('cccc0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Bruno Motta Studio',      '(21) 99800-8002','bruno@mottastudio.com',    9.0,'Especialista em projetos de varandas e áreas gourmet.'),
  -- Clássica
  ('cccc0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','Mariana Lopes Projetos',  '(31) 99011-0001','mariana@lopesproj.com.br', 6.0,'Parcerias em lançamentos imobiliários de BH.'),
  ('cccc0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Tiago Braga Arquitetura', '(31) 99011-0002','tiago@braga.arq.br',       8.0,'Escritório com carteira de 30+ construtoras.');

-- ═══════════════════════════════════════
-- FORNECEDORES
-- ═══════════════════════════════════════
INSERT INTO suppliers (id, organization_id, name, cnpj_cpf, phone, email, contact_name, notes, is_active) VALUES
  -- Elite
  ('dddd0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','MDF Center SP',   '11.222.333/0001-44','(11) 3100-1000','compras@mdfcenter.com.br',  'Rodrigo Pimentel', 'Principal fornecedor de painéis MDF. Prazo 3 dias. Entrega em SP.',  true),
  ('dddd0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Häfele Brasil',   '22.333.444/0001-55','(11) 3200-2000','vendas@hafele.com.br',      'Camila Rodrigues', 'Ferragens premium. Importados alemães. Pedido mínimo R$500.',         true),
  ('dddd0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','Egger Brasil',    '33.444.555/0001-66','(11) 3300-3000','pedidos@egger.com.br',      'Marcos Souza',     'Painéis de alta qualidade. Distribuidor exclusivo SP.',               true),
  -- Moderna
  ('dddd0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','MDF Rio Norte',   '44.555.666/0001-77','(21) 3100-1000','vendas@mdfrio.com.br',      'Fernando Moura',   'Distribuidor oficial Arauco RJ. Prazo 2 dias.',                       true),
  ('dddd0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Blum Brasil',     '55.666.777/0001-88','(21) 3200-2000','blum@blum.com.br',          'Andréia Pinto',    'Ferragens premium. Sistema lift e dobradiças Clip Top.',              true),
  ('dddd0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','Eucatex RJ',      '66.777.888/0001-99','(21) 3300-3000','rj@eucatex.com.br',        'Diego Alves',      'Eucatex e Duratex. Bons preços para grandes volumes.',                true),
  -- Clássica
  ('dddd0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','MDF Minas',       '77.888.999/0001-00','(31) 3400-4000','vendas@mdfminas.com.br',    'Leandro Costa',    'Maior distribuidor de MDF de BH. Crédito 30/60 dias.',               true),
  ('dddd0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Grass Brasil MG', '88.999.000/0001-11','(31) 3500-5000','mg@grassbrasil.com.br',    'Silvia Cardoso',   'Ferragens Grass e Hettich. Corrediças e dobradiças.',                 true);

-- ═══════════════════════════════════════
-- ESTOQUE
-- ═══════════════════════════════════════
INSERT INTO inventory (id, organization_id, category, brand, name_or_color, thickness, quantity, cost_per_unit) VALUES
  -- Elite
  ('eeee0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','MDF',     'Duratex', 'Branco Polar TX',      18, 48, 89.90),
  ('eeee0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','MDF',     'Duratex', 'Carvalho Naturale',    15, 28, 95.00),
  ('eeee0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','MDF',     'Egger',   'Cinza Platinum',       18, 20, 102.50),
  ('eeee0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','Ferragem','Häfele',  'Dobradiça 35mm Clip',   0, 180, 3.20),
  ('eeee0001-0001-0001-0001-000000000005','aaaaaaaa-0001-0001-0001-000000000001','Ferragem','Häfele',  'Corrediça Soft 450mm',  0, 95,  18.90),
  ('eeee0001-0001-0001-0001-000000000006','aaaaaaaa-0001-0001-0001-000000000001','Ferragem','Häfele',  'Puxador Inox 128mm',    0, 120, 9.50),
  -- Moderna
  ('eeee0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','MDF',     'Arauco',  'Branco Neve TX',       18, 55, 92.00),
  ('eeee0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','MDF',     'Arauco',  'Freijó Naturale',      25, 18, 118.00),
  ('eeee0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','Ferragem','Blum',    'Dobradiça Clip Top 35', 0, 200, 3.80),
  ('eeee0002-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-000000000002','Ferragem','Blum',    'Corrediça Tandem 500',  0, 80,  42.00),
  -- Clássica
  ('eeee0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','MDF',     'Eucatex', 'Branco TX',            18, 38, 85.00),
  ('eeee0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','MDF',     'Eucatex', 'Natural',              15, 22, 82.00),
  ('eeee0003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','Ferragem','Grass',   'Dobradiça 35mm',        0, 280, 2.20),
  ('eeee0003-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-000000000003','Ferragem','Hettich', 'Corrediça 400mm',       0, 110, 14.50);

-- ═══════════════════════════════════════
-- PROJETOS / VENDAS
-- ═══════════════════════════════════════
INSERT INTO sales (id, organization_id, client_id, client_name, architect_id,
    seller_id, carpenter_id,
    total_value, received_value, status,
    commission_seller_percent, commission_carpenter_percent, rt_architect_percent,
    freight_cost, meals_cost, raw_material_cost,
    delivery_date, notes) VALUES

  -- ──── ELITE (6 projetos) ────
  ('ffff0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000001','João Victor Almeida',
   'cccc0001-0001-0001-0001-000000000001',
   '${ids.e_seller}','${ids.e_carp}',
   28500.00, 28500.00, 'Concluído',
   5.0, 3.0, 8.0, 280.00, 120.00, 4200.00,
   '2026-01-20',
   'Sala de estar + cozinha planejada completa. Projeto Beatriz Nunes. MDF Branco Polar + Cinza Platinum.'),

  ('ffff0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000002','Maria Fernanda Santos',
   'cccc0001-0001-0001-0001-000000000001',
   '${ids.e_seller}','${ids.e_carp}',
   18000.00, 12600.00, 'Montagem',
   5.0, 3.0, 8.0, 180.00, 90.00, 2800.00,
   '2026-04-05',
   'Dormitório master com closet integrado. Frentes em Carvalho Naturale 15mm.'),

  ('ffff0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000003','Paulo Roberto Ramos',
   NULL,
   '${ids.e_seller}','${ids.e_carp}',
   9800.00, 4900.00, 'Produção',
   5.0, 3.0, 0.0, 120.00, 60.00, 1600.00,
   '2026-04-25',
   'Home office completo. Mesa planejada em L + estantes + gaveteiros. Branco TX + detalhes Cinza.'),

  ('ffff0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000004','Ana Cristina Figueiredo',
   'cccc0001-0001-0001-0001-000000000001',
   '${ids.e_seller}','${ids.e_carp}',
   22000.00, 11000.00, 'Produção',
   5.0, 3.0, 8.0, 220.00, 100.00, 3400.00,
   '2026-05-10',
   'Closet casal + banheiro planejado. Arquiteta Beatriz Nunes. Carvalho + Branco.'),

  ('ffff0001-0001-0001-0001-000000000005','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000001','João Victor Almeida',
   'cccc0001-0001-0001-0001-000000000002',
   '${ids.e_seller}', NULL,
   15500.00, 0.00, 'Orçamento',
   5.0, 0.0, 10.0, 0.00, 0.00, 0.00,
   '2026-06-01',
   'Varanda gourmet. Armários suspensos + bancada + área de churrasco. Projeto Ricardo Azevedo.'),

  ('ffff0001-0001-0001-0001-000000000006','aaaaaaaa-0001-0001-0001-000000000001',
   'bbbb0001-0001-0001-0001-000000000002','Maria Fernanda Santos',
   NULL,
   '${ids.e_seller}', NULL,
   12000.00, 0.00, 'Orçamento',
   5.0, 0.0, 0.0, 0.00, 0.00, 0.00,
   NULL,
   'Segundo quarto / quarto de hóspedes. Em orçamento — cliente avaliando proposta.'),

  -- ──── MODERNA (6 projetos) ────
  ('ffff0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000001','Roberto Carlos Costa',
   'cccc0002-0002-0002-0002-000000000001',
   '${ids.m_seller}','${ids.m_carp}',
   45000.00, 45000.00, 'Concluído',
   4.0, 3.0, 7.0, 450.00, 200.00, 7500.00,
   '2026-01-30',
   'Cozinha gourmet completa + despensa + lavanderia. Casa em condomínio Barra. Projeto Camila Rocha.'),

  ('ffff0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000002','Sandra Lima Pereira',
   'cccc0002-0002-0002-0002-000000000002',
   '${ids.m_seller}','${ids.m_carp}',
   18500.00, 12950.00, 'Montagem',
   4.0, 3.0, 9.0, 185.00, 80.00, 2900.00,
   '2026-04-08',
   'Quarto master + closet. Apartamento em Ipanema. Projeto Bruno Motta. Freijó + Branco.'),

  ('ffff0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000003','Felipe Araujo Neto',
   NULL,
   '${ids.m_seller}','${ids.m_carp}',
   28000.00, 14000.00, 'Produção',
   4.0, 3.0, 0.0, 300.00, 120.00, 4500.00,
   '2026-05-05',
   'Escritório executivo. Mesa em U + estantes embutidas + rack de TV. Ambiente corporativo.'),

  ('ffff0002-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000004','Cristina Peres Viana',
   'cccc0002-0002-0002-0002-000000000001',
   '${ids.m_seller}','${ids.m_carp}',
   12500.00, 6250.00, 'Produção',
   4.0, 3.0, 7.0, 125.00, 60.00, 2000.00,
   '2026-04-20',
   'Sala de estar + rack de TV embutido. Projeto Camila Rocha. Branco Neve + detalhe Carvalho.'),

  ('ffff0002-0002-0002-0002-000000000005','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000001','Roberto Carlos Costa',
   'cccc0002-0002-0002-0002-000000000002',
   '${ids.m_seller}', NULL,
   35000.00, 0.00, 'Orçamento',
   4.0, 0.0, 9.0, 0.00, 0.00, 0.00,
   '2026-07-01',
   'Suite completa master. Segunda fase da casa. Projeto Bruno Motta. Em aprovação.'),

  ('ffff0002-0002-0002-0002-000000000006','aaaaaaaa-0002-0002-0002-000000000002',
   'bbbb0002-0002-0002-0002-000000000002','Sandra Lima Pereira',
   NULL,
   '${ids.m_seller}', NULL,
   19500.00, 0.00, 'Orçamento',
   4.0, 0.0, 0.0, 0.00, 0.00, 0.00,
   NULL,
   'Varanda gourmet do apartamento de Ipanema. Área descoberta. Cliente aguardando AVCB.'),

  -- ──── CLÁSSICA (6 projetos) ────
  ('ffff0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000001','Gustavo Dias Freitas',
   'cccc0003-0003-0003-0003-000000000001',
   '${ids.c_seller}','${ids.c_carp}',
   8500.00, 8500.00, 'Concluído',
   6.0, 4.0, 6.0, 80.00, 40.00, 1400.00,
   '2026-02-15',
   'Quarto infantil temático. Beliche embutido + escrivaninha + armário com nichos. Projeto Mariana Lopes.'),

  ('ffff0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000002','Patrícia Souza Melo',
   NULL,
   '${ids.c_seller}','${ids.c_carp}',
   14000.00, 9800.00, 'Montagem',
   6.0, 4.0, 0.0, 140.00, 60.00, 2200.00,
   '2026-04-10',
   'Cozinha planejada com ilha central. Branco TX + detalhes em madeira natural.'),

  ('ffff0003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000003','Diego Martins Barros',
   'cccc0003-0003-0003-0003-000000000002',
   '${ids.c_seller}','${ids.c_carp}',
   11000.00, 5500.00, 'Produção',
   6.0, 4.0, 8.0, 110.00, 50.00, 1800.00,
   '2026-05-15',
   'Home office planejado. Projeto Tiago Braga. Mesa em L + estante embutida + painel ripado.'),

  ('ffff0003-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000004','Camila Freitas Alves',
   NULL,
   '${ids.c_seller}','${ids.c_carp}',
   9000.00, 4500.00, 'Produção',
   6.0, 4.0, 0.0, 90.00, 40.00, 1500.00,
   '2026-04-28',
   'Sala compacta. Rack embutido + painel ripado + armário multiuso. Soluções inteligentes de espaço.'),

  ('ffff0003-0003-0003-0003-000000000005','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000001','Gustavo Dias Freitas',
   NULL,
   '${ids.c_seller}', NULL,
   7500.00, 0.00, 'Orçamento',
   6.0, 0.0, 0.0, 0.00, 0.00, 0.00,
   NULL,
   'Banheiro planejado. Gabinete + espelheira + nichos embutidos na parede.'),

  ('ffff0003-0003-0003-0003-000000000006','aaaaaaaa-0003-0003-0003-000000000003',
   'bbbb0003-0003-0003-0003-000000000002','Patrícia Souza Melo',
   NULL,
   '${ids.c_seller}', NULL,
   6800.00, 0.00, 'Orçamento',
   6.0, 0.0, 0.0, 0.00, 0.00, 0.00,
   NULL,
   'Lavabo + hall de entrada. Espelheira suspensa + rack de entrada + nichos decorativos.');

-- ═══════════════════════════════════════
-- PARCELAS (INSTALLMENTS)
-- ═══════════════════════════════════════
INSERT INTO installments (id, sale_id, organization_id, description, amount, due_date, paid, paid_at) VALUES
  -- Elite: Venda 1 (concluída — 100% pago)
  ('ac000001-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','Entrada (30%)',     8550.00,'2025-12-01',true, '2025-12-01 10:00:00+00'),
  ('ac000001-0001-0001-0001-000000000002','ffff0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','Parcela 2 (30%)',   8550.00,'2026-01-05',true, '2026-01-05 14:00:00+00'),
  ('ac000001-0001-0001-0001-000000000003','ffff0001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','Saldo final (40%)',11400.00,'2026-01-20',true, '2026-01-20 09:00:00+00'),
  -- Elite: Venda 2 (montagem — 70% pago)
  ('ac000001-0001-0001-0001-000000000004','ffff0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Entrada (30%)',     5400.00,'2026-02-10',true, '2026-02-10 11:00:00+00'),
  ('ac000001-0001-0001-0001-000000000005','ffff0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Parcela 2 (40%)',   7200.00,'2026-03-01',true, '2026-03-01 15:00:00+00'),
  ('ac000001-0001-0001-0001-000000000006','ffff0001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','Saldo final (30%)', 5400.00,'2026-04-05',false, NULL),
  -- Elite: Venda 3 (produção — 50% pago)
  ('ac000001-0001-0001-0001-000000000007','ffff0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','Entrada (50%)',     4900.00,'2026-02-20',true, '2026-02-20 10:00:00+00'),
  ('ac000001-0001-0001-0001-000000000008','ffff0001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','Saldo final (50%)', 4900.00,'2026-04-25',false, NULL),
  -- Elite: Venda 4 (produção — 50% pago)
  ('ac000001-0001-0001-0001-000000000009','ffff0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','Entrada (30%)',     6600.00,'2026-02-28',true, '2026-02-28 09:00:00+00'),
  ('ac000001-0001-0001-0001-000000000010','ffff0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','Parcela 2 (20%)',   4400.00,'2026-03-15',true, '2026-03-15 10:00:00+00'),
  ('ac000001-0001-0001-0001-000000000011','ffff0001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','Saldo final (50%)',11000.00,'2026-05-10',false, NULL),

  -- Moderna: Venda 1 (concluída — 100% pago)
  ('ac000002-0002-0002-0002-000000000001','ffff0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','Entrada (30%)',    13500.00,'2025-11-15',true, '2025-11-15 11:00:00+00'),
  ('ac000002-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','Parcela 2 (40%)',  18000.00,'2026-01-05',true, '2026-01-05 09:00:00+00'),
  ('ac000002-0002-0002-0002-000000000003','ffff0002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','Saldo final (30%)',13500.00,'2026-01-30',true, '2026-01-30 14:00:00+00'),
  -- Moderna: Venda 2 (montagem — 70% pago)
  ('ac000002-0002-0002-0002-000000000004','ffff0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Entrada (30%)',     5550.00,'2026-02-15',true, '2026-02-15 10:00:00+00'),
  ('ac000002-0002-0002-0002-000000000005','ffff0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Parcela 2 (40%)',   7400.00,'2026-03-10',true, '2026-03-10 11:00:00+00'),
  ('ac000002-0002-0002-0002-000000000006','ffff0002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','Saldo final (30%)', 5550.00,'2026-04-08',false, NULL),
  -- Moderna: Venda 3 (produção — 50% pago)
  ('ac000002-0002-0002-0002-000000000007','ffff0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','Entrada (50%)',    14000.00,'2026-03-01',true, '2026-03-01 09:00:00+00'),
  ('ac000002-0002-0002-0002-000000000008','ffff0002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','Saldo final (50%)',14000.00,'2026-05-05',false, NULL),

  -- Clássica: Venda 1 (concluída — 100% pago)
  ('ac000003-0003-0003-0003-000000000001','ffff0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','Entrada (50%)',     4250.00,'2026-01-10',true, '2026-01-10 09:00:00+00'),
  ('ac000003-0003-0003-0003-000000000002','ffff0003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','Saldo final (50%)', 4250.00,'2026-02-15',true, '2026-02-15 14:00:00+00'),
  -- Clássica: Venda 2 (montagem — 70% pago)
  ('ac000003-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Entrada (40%)',     5600.00,'2026-02-20',true, '2026-02-20 10:00:00+00'),
  ('ac000003-0003-0003-0003-000000000004','ffff0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Parcela 2 (30%)',   4200.00,'2026-03-15',true, '2026-03-15 11:00:00+00'),
  ('ac000003-0003-0003-0003-000000000005','ffff0003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','Saldo final (30%)', 4200.00,'2026-04-10',false, NULL),
  -- Clássica: Venda 3 (produção — 50% pago)
  ('ac000003-0003-0003-0003-000000000006','ffff0003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','Entrada (50%)',     5500.00,'2026-03-05',true, '2026-03-05 09:00:00+00'),
  ('ac000003-0003-0003-0003-000000000007','ffff0003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','Saldo final (50%)', 5500.00,'2026-05-15',false, NULL);

-- ═══════════════════════════════════════
-- DESPESAS
-- ═══════════════════════════════════════
INSERT INTO expenses (id, organization_id, sale_id, description, amount, expense_type, date_incurred) VALUES
  -- Elite — Fixas
  ('af000001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001',NULL,'Aluguel do Galpão',             4500.00,'Fixed','2026-03-01'),
  ('af000001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001',NULL,'Energia Elétrica + Água',       780.00, 'Fixed','2026-03-01'),
  ('af000001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001',NULL,'Internet + Telefone',           250.00, 'Fixed','2026-03-01'),
  ('af000001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001',NULL,'Software e Assinaturas',        390.00, 'Fixed','2026-03-01'),
  -- Elite — Diretas
  ('af000001-0001-0001-0001-000000000005','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000001','Material extra — Projeto João Almeida',  680.00,'Direct','2026-01-10'),
  ('af000001-0001-0001-0001-000000000006','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000002','Cola e acessórios — Projeto Maria Santos',220.00,'Direct','2026-02-25'),
  ('af000001-0001-0001-0001-000000000007','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000003','Fita de bordo e primer — Home Office',   145.00,'Direct','2026-03-10'),
  -- Moderna — Fixas
  ('af000002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002',NULL,'Aluguel do Espaço',             6800.00,'Fixed','2026-03-01'),
  ('af000002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002',NULL,'Energia Elétrica',              1100.00,'Fixed','2026-03-01'),
  ('af000002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002',NULL,'Contador + Folha de Pagamento', 1800.00,'Fixed','2026-03-01'),
  -- Moderna — Diretas
  ('af000002-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000001','Material extra — Cozinha Gourmet',      1200.00,'Direct','2026-01-20'),
  ('af000002-0002-0002-0002-000000000005','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000003','Aço inox e alumínio — Escritório Felipe', 890.00,'Direct','2026-03-05'),
  -- Clássica — Fixas
  ('af000003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003',NULL,'Aluguel da Oficina',            2200.00,'Fixed','2026-03-01'),
  ('af000003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003',NULL,'Energia e Água',                 420.00,'Fixed','2026-03-01'),
  ('af000003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003',NULL,'Internet e Telefone',            180.00,'Fixed','2026-03-01'),
  -- Clássica — Diretas
  ('af000003-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000001','Tinta e verniz — Quarto Infantil',       320.00,'Direct','2026-02-05'),
  ('af000003-0003-0003-0003-000000000005','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000002','Iluminação LED embutida — Cozinha',      480.00,'Direct','2026-03-02');

-- ═══════════════════════════════════════
-- COMPRAS (PURCHASES)
-- ═══════════════════════════════════════
INSERT INTO purchases (id, organization_id, supplier_id, sale_id, description, amount, quantity, unit, purchase_date, invoice_number) VALUES
  -- Elite
  ('ab000001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','dddd0001-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000001','MDF 18mm Branco Polar TX',  2697.00,30,'chapa','2025-12-05','NF-12345'),
  ('ab000001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','dddd0001-0001-0001-0001-000000000002','ffff0001-0001-0001-0001-000000000001','Dobradiças Häfele Clip Top', 384.00,120,'un',   '2025-12-05','NF-12346'),
  ('ab000001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','dddd0001-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000002','MDF 15mm Carvalho Naturale', 950.00,10,'chapa','2026-02-10','NF-12350'),
  ('ab000001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','dddd0001-0001-0001-0001-000000000001',NULL,'Reposição estoque MDF Branco Polar',  1798.00,20,'chapa','2026-03-05','NF-12360'),
  -- Moderna
  ('ab000002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','dddd0002-0002-0002-0002-000000000001','ffff0002-0002-0002-0002-000000000001','MDF 18mm Branco Neve TX',   4140.00,45,'chapa','2025-11-20','NF-22100'),
  ('ab000002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','dddd0002-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000001','Corrediças Blum Tandem 500', 2520.00,60,'par', '2025-11-20','NF-22101'),
  ('ab000002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','dddd0002-0002-0002-0002-000000000001','ffff0002-0002-0002-0002-000000000003','MDF 25mm Freijó Naturale',  2360.00,20,'chapa','2026-03-01','NF-22115'),
  -- Clássica
  ('ab000003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','dddd0003-0003-0003-0003-000000000001','ffff0003-0003-0003-0003-000000000001','MDF 18mm Branco TX',         850.00,10,'chapa','2026-01-12','NF-33050'),
  ('ab000003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','dddd0003-0003-0003-0003-000000000002','ffff0003-0003-0003-0003-000000000002','Dobradiças Grass 35mm',      264.00,120,'un',  '2026-02-22','NF-33060'),
  ('ab000003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','dddd0003-0003-0003-0003-000000000001',NULL,'Reposição estoque geral MDF',         1700.00,20,'chapa','2026-03-10','NF-33070');

-- ═══════════════════════════════════════
-- COMISSÕES (para vendas concluídas)
-- ═══════════════════════════════════════
INSERT INTO commissions (id, organization_id, sale_id, profile_id, commission_type, base_amount, percent, amount, status, paid_at) VALUES
  -- Elite: Venda 1 (concluída)
  ('ad000001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000001','${ids.e_seller}','seller',   28500.00,5.0,1425.00,'paid','2026-01-22 10:00:00+00'),
  ('ad000001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000001','${ids.e_carp}', 'carpenter',28500.00,3.0, 855.00,'paid','2026-01-22 10:00:00+00'),
  -- Elite: Venda 2 (em andamento — pendente)
  ('ad000001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000002','${ids.e_seller}','seller',   18000.00,5.0, 900.00,'pending',NULL),
  ('ad000001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000002','${ids.e_carp}', 'carpenter',18000.00,3.0, 540.00,'pending',NULL),
  -- Moderna: Venda 1 (concluída)
  ('ad000002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000001','${ids.m_seller}','seller',   45000.00,4.0,1800.00,'paid','2026-02-01 11:00:00+00'),
  ('ad000002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000001','${ids.m_carp}', 'carpenter',45000.00,3.0,1350.00,'paid','2026-02-01 11:00:00+00'),
  -- Moderna: Venda 2 (pendente)
  ('ad000002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000002','${ids.m_seller}','seller',   18500.00,4.0, 740.00,'pending',NULL),
  ('ad000002-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000002','${ids.m_carp}', 'carpenter',18500.00,3.0, 555.00,'pending',NULL),
  -- Clássica: Venda 1 (concluída)
  ('ad000003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000001','${ids.c_seller}','seller',   8500.00,6.0,510.00,'paid','2026-02-18 09:00:00+00'),
  ('ad000003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000001','${ids.c_carp}', 'carpenter',8500.00,4.0,340.00,'paid','2026-02-18 09:00:00+00'),
  -- Clássica: Venda 2 (pendente)
  ('ad000003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000002','${ids.c_seller}','seller',   14000.00,6.0,840.00,'pending',NULL),
  ('ad000003-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000002','${ids.c_carp}', 'carpenter',14000.00,4.0,560.00,'pending',NULL);

-- ═══════════════════════════════════════
-- CALENDÁRIO DE EVENTOS
-- ═══════════════════════════════════════
INSERT INTO calendar_events (id, organization_id, sale_id, title, description, event_type, event_date, event_time, is_private, color) VALUES
  -- Elite
  ('ae000001-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000002','Montagem — Maria Santos',         'Montagem do dormitório master. Equipe: José + assistente.',          'installation','2026-04-05','08:00',false,'#22c55e'),
  ('ae000001-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000003','Entrega Home Office — Paulo Ramos','Entrega e instalação do home office.',                                'delivery',    '2026-04-25','09:00',false,'#6366f1'),
  ('ae000001-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-000000000001','ffff0001-0001-0001-0001-000000000005','Reunião — Varanda João Almeida',  'Apresentação do projeto da varanda gourmet ao cliente.',              'meeting',     '2026-03-28','15:00',false,'#f59e0b'),
  ('ae000001-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-000000000001',NULL,                                 'Pagamento Aluguel Galpão',         'Vencimento do aluguel mensal.',                                       'other',       '2026-04-01','09:00',true, '#94a3b8'),
  -- Moderna
  ('ae000002-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000002','Montagem — Sandra Lima Ipanema',  'Montagem do quarto master. Coordenação Rafael.',                      'installation','2026-04-08','08:30',false,'#22c55e'),
  ('ae000002-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000003','Entrega Escritório Felipe Araujo','Entrega do escritório executivo. Faturamento PJ.',                    'delivery',    '2026-05-05','10:00',false,'#6366f1'),
  ('ae000002-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-000000000002','ffff0002-0002-0002-0002-000000000005','Orçamento — Suite Roberto Costa', 'Reunião para aprovação do projeto da suite master.',                  'budget',      '2026-03-30','11:00',false,'#f59e0b'),
  -- Clássica
  ('ae000003-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000002','Montagem — Cozinha Patrícia Melo','Montagem da cozinha planejada. Antônio + Fernanda acompanha.',        'installation','2026-04-10','08:00',false,'#22c55e'),
  ('ae000003-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-000000000003','ffff0003-0003-0003-0003-000000000003','Entrega Home Office — Diego',     'Entrega e acabamento final do home office.',                          'delivery',    '2026-05-15','09:30',false,'#6366f1'),
  ('ae000003-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-000000000003',NULL,                                 'Visita ao Fornecedor MDF Minas',  'Negociação de preços e volume para Q2 2026.',                         'meeting',     '2026-04-03','14:00',true, '#a78bfa');
    `;

    const r = await postQuery(sql);
    if (!r.ok) {
        console.error('❌ Erro ao inserir dados:', JSON.stringify(r.body).slice(0, 800));
        process.exit(1);
    }
    console.log('✅ Todos os dados inseridos!\n');

    // ── FASE 4: Verificação final ─────────────
    console.log('🔍 Verificação final...\n');

    const checks = [
        ['SELECT count(*)::int as n FROM organizations',  'Organizações'],
        ['SELECT count(*)::int as n FROM profiles',        'Usuários'],
        ['SELECT count(*)::int as n FROM clients',         'Clientes'],
        ['SELECT count(*)::int as n FROM architects',      'Arquitetos'],
        ['SELECT count(*)::int as n FROM suppliers',       'Fornecedores'],
        ['SELECT count(*)::int as n FROM inventory',       'Itens de estoque'],
        ['SELECT count(*)::int as n FROM kanban_stages',   'Etapas de Kanban'],
        ['SELECT count(*)::int as n FROM sales',           'Projetos (vendas)'],
        ['SELECT count(*)::int as n FROM installments',    'Parcelas'],
        ['SELECT count(*)::int as n FROM expenses',        'Despesas'],
        ['SELECT count(*)::int as n FROM purchases',       'Compras'],
        ['SELECT count(*)::int as n FROM commissions',     'Comissões'],
        ['SELECT count(*)::int as n FROM calendar_events', 'Eventos de calendário'],
    ];

    for (const [sql, label] of checks) {
        const r = await postQuery(sql);
        const n = Array.isArray(r.body) ? r.body[0]?.n : '?';
        console.log(`  ${label.padEnd(25)} → ${n}`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('  🎉 SEED COMPLETO!');
    console.log('════════════════════════════════════════');
    console.log('\n📋 CREDENCIAIS DE ACESSO:');
    console.log(`  Senha padrão: ${PASSWORD}\n`);
    console.log('  SUPER ADMIN:');
    console.log('    ilson@marcenariapro.com.br\n');
    console.log('  ELITE MÓVEIS PLANEJADOS:');
    console.log('    carlos@elitemovels.com.br   (Proprietário)');
    console.log('    ana@elitemovels.com.br      (Escritório)');
    console.log('    pedro@elitemovels.com.br    (Vendedor)');
    console.log('    jose@elitemovels.com.br     (Marceneiro)\n');
    console.log('  MODERNA INTERIORES E DESIGN:');
    console.log('    lucia@modernainteriores.com.br  (Proprietária)');
    console.log('    rafael@modernainteriores.com.br (Escritório)');
    console.log('    marina@modernainteriores.com.br (Vendedora)');
    console.log('    paulo@modernainteriores.com.br  (Marceneiro)\n');
    console.log('  CLÁSSICA MARCENARIA ARTESANAL:');
    console.log('    roberto@classicamarcenaria.com.br  (Proprietário)');
    console.log('    carla@classicamarcenaria.com.br    (Escritório)');
    console.log('    fernanda@classicamarcenaria.com.br (Vendedora)');
    console.log('    antonio@classicamarcenaria.com.br  (Marceneiro)\n');
}

run().catch(e => { console.error('\n❌ Erro fatal:', e.message); process.exit(1); });

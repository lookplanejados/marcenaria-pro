-- 1. Criação das Tabelas Base com Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perfis dos usuários (RBAC: 'admin', 'owner', 'carpenter')
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'carpenter')),
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Estoque de Insumos (MDF, Ferragens)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('MDF', 'Ferragem')),
    brand TEXT,
    name_or_color TEXT,
    thickness NUMERIC, -- Ex: 6, 15, 18, 25 para MDF
    quantity NUMERIC NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vendas / Projetos (Kanban)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    total_value NUMERIC NOT NULL DEFAULT 0,
    received_value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Orçamento', -- Ex: Orçamento, Produção, Montagem, Concluído
    commission_carpenter_percent NUMERIC NOT NULL DEFAULT 0,
    commission_seller_percent NUMERIC NOT NULL DEFAULT 0,
    rt_architect_percent NUMERIC NOT NULL DEFAULT 0,
    freight_cost NUMERIC NOT NULL DEFAULT 0,
    meals_cost NUMERIC NOT NULL DEFAULT 0,
    raw_material_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Despesas (Operacionais e Vinculadas a Projetos)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- Opcional para vincular
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    expense_type TEXT CHECK (expense_type IN ('Fixed', 'Direct')),
    date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitando RLS (Row Level Security)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Regras Multi-Tenant)

-- Função Auxiliar para pegar o organization_id do usuário logado via JWT Claims ou Profile
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Padrão de Política para Tenants: O usuário só vê e interage com o que é da sua marcenaria.
CREATE POLICY "Isolamento de Tenant - Organizations" ON organizations
FOR ALL USING (id = get_user_org_id());

CREATE POLICY "Isolamento de Tenant - Profiles" ON profiles
FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "Isolamento de Tenant - Inventory" ON inventory
FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "Isolamento de Tenant - Sales" ON sales
FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "Isolamento de Tenant - Expenses" ON expenses
FOR ALL USING (organization_id = get_user_org_id());

-- Exemplo de política baseada em Perfil (Somente proprietário pode apagar Vendas)
CREATE POLICY "Proprietários podem apagar vendas" ON sales
FOR DELETE USING (
   organization_id = get_user_org_id() AND
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Cadastro de Clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cadastro de Arquitetos Parceiros
CREATE TABLE IF NOT EXISTS architects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    default_rt_percent NUMERIC NOT NULL DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vincular Vendas a Clientes e Arquitetos
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES architects(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE architects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento de Tenant - Clients" ON clients
FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "Isolamento de Tenant - Architects" ON architects
FOR ALL USING (organization_id = get_user_org_id());

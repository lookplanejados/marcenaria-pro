-- ============================================================
-- MIGRATION 0010: SaaS Multi-Tenant Refactor
-- Novos perfis, tabelas, audit, comissões, fornecedores,
-- kanban dinâmico, arquivos, calendário e RLS atualizado.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NOVOS ROLES: owner, office, seller  (mantém sysadmin e carpenter)
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Migra 'admin' existente → 'owner'
UPDATE profiles SET role = 'owner' WHERE role = 'admin';

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('sysadmin', 'owner', 'office', 'seller', 'carpenter'));

-- ────────────────────────────────────────────────────────────
-- 2. COLUNAS NOVAS NAS TABELAS EXISTENTES
-- ────────────────────────────────────────────────────────────

-- Profiles: foto e preferência de tema pessoal
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
    ADD COLUMN IF NOT EXISTS color_theme    TEXT DEFAULT 'blue';

-- Organizations: logo, plano, tema da empresa
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS logo_url       TEXT,
    ADD COLUMN IF NOT EXISTS color_theme    TEXT DEFAULT 'blue',
    ADD COLUMN IF NOT EXISTS plan           TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    ADD COLUMN IF NOT EXISTS plan_start     DATE,
    ADD COLUMN IF NOT EXISTS plan_end       DATE,
    ADD COLUMN IF NOT EXISTS is_active      BOOLEAN DEFAULT true;

-- Sales: vínculo com vendedor e marceneiro responsável, prazo de entrega
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS seller_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS carpenter_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_date     DATE,
    ADD COLUMN IF NOT EXISTS kanban_type       TEXT DEFAULT 'production' CHECK (kanban_type IN ('sales', 'production')),
    ADD COLUMN IF NOT EXISTS kanban_stage_id   UUID; -- FK adicionada depois (FK circular)

-- ────────────────────────────────────────────────────────────
-- 3. KANBAN DINÂMICO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_stages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    kanban_type     TEXT NOT NULL CHECK (kanban_type IN ('sales', 'production')),
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#6366f1',
    position        INTEGER NOT NULL DEFAULT 0,
    is_final        BOOLEAN DEFAULT false,  -- estágio final = concluído / contrato assinado
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Agora podemos adicionar a FK em sales
ALTER TABLE sales
    ADD CONSTRAINT fk_sales_kanban_stage
    FOREIGN KEY (kanban_stage_id) REFERENCES kanban_stages(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 4. FORNECEDORES E COMPRAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name            TEXT NOT NULL,
    cnpj_cpf        TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    contact_name    TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    sale_id         UUID REFERENCES sales(id) ON DELETE SET NULL, -- compra vinculada a projeto
    description     TEXT NOT NULL,
    amount          NUMERIC NOT NULL DEFAULT 0,
    quantity        NUMERIC DEFAULT 1,
    unit            TEXT,                 -- ex: chapa, peça, kg
    purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number  TEXT,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 5. COMISSÕES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    sale_id             UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    profile_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    commission_type     TEXT NOT NULL CHECK (commission_type IN ('seller', 'carpenter', 'architect_rt')),
    base_amount         NUMERIC NOT NULL DEFAULT 0,  -- valor base para o cálculo
    percent             NUMERIC NOT NULL DEFAULT 0,
    amount              NUMERIC NOT NULL DEFAULT 0,  -- valor calculado
    status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at             TIMESTAMP WITH TIME ZONE,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 6. ARQUIVOS DE PROJETO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    sale_id         UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL, -- path no Supabase Storage: org_id/sale_id/file_name
    file_type       TEXT,          -- 'pdf', 'image', etc.
    file_size       INTEGER,       -- bytes
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 7. CALENDÁRIO UNIFICADO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    sale_id         UUID REFERENCES sales(id) ON DELETE CASCADE,
    created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    event_type      TEXT DEFAULT 'delivery' CHECK (event_type IN ('delivery', 'budget', 'meeting', 'installation', 'other')),
    event_date      DATE NOT NULL,
    event_time      TIME,
    is_private      BOOLEAN DEFAULT false, -- privado = só creator e admin vê
    color           TEXT DEFAULT '#6366f1',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 8. AUDITORIA TOTAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    table_name      TEXT NOT NULL,
    record_id       UUID,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Index para busca rápida por projeto ou tabela
CREATE INDEX IF NOT EXISTS idx_audit_logs_record   ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table    ON audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org      ON audit_logs(organization_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 9. FUNÇÃO E TRIGGER DE AUDITORIA AUTOMÁTICA
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id       UUID;
    v_org_id        UUID;
    v_record_id     UUID;
    v_old_data      JSONB;
    v_new_data      JSONB;
BEGIN
    -- Obtém o usuário e org da sessão atual
    v_user_id := auth.uid();
    SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = v_user_id LIMIT 1;

    IF TG_OP = 'INSERT' THEN
        v_record_id := (NEW.id)::UUID;
        v_new_data  := to_jsonb(NEW);
        v_old_data  := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := (NEW.id)::UUID;
        v_new_data  := to_jsonb(NEW);
        v_old_data  := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := (OLD.id)::UUID;
        v_old_data  := to_jsonb(OLD);
        v_new_data  := NULL;
    END IF;

    -- Usa org da linha se disponível
    IF v_org_id IS NULL THEN
        BEGIN
            IF TG_OP = 'DELETE' THEN
                v_org_id := (OLD.organization_id)::UUID;
            ELSE
                v_org_id := (NEW.organization_id)::UUID;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_org_id := NULL;
        END;
    END IF;

    INSERT INTO public.audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_org_id, v_user_id, TG_TABLE_NAME, v_record_id, TG_OP, v_old_data, v_new_data);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers nas tabelas principais
DROP TRIGGER IF EXISTS audit_sales      ON sales;
DROP TRIGGER IF EXISTS audit_expenses   ON expenses;
DROP TRIGGER IF EXISTS audit_profiles   ON profiles;
DROP TRIGGER IF EXISTS audit_inventory  ON inventory;
DROP TRIGGER IF EXISTS audit_commissions ON commissions;
DROP TRIGGER IF EXISTS audit_purchases  ON purchases;

CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_commissions
    AFTER INSERT OR UPDATE OR DELETE ON commissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_purchases
    AFTER INSERT OR UPDATE OR DELETE ON purchases
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ────────────────────────────────────────────────────────────
-- 10. HABILITAR RLS NAS NOVAS TABELAS
-- ────────────────────────────────────────────────────────────
ALTER TABLE kanban_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 11. ATUALIZAR FUNÇÃO get_user_role PARA NOVOS ROLES
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    returned_role TEXT;
BEGIN
    SELECT role INTO returned_role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    RETURN returned_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
DECLARE
    returned_org_id UUID;
BEGIN
    SELECT organization_id INTO returned_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    RETURN returned_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: verifica se role tem acesso financeiro
CREATE OR REPLACE FUNCTION can_view_finance()
RETURNS BOOLEAN AS $$
    SELECT get_user_role() IN ('sysadmin', 'owner', 'office');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 12. POLÍTICAS RLS — NOVOS ROLES
-- ────────────────────────────────────────────────────────────

-- Atualiza políticas existentes para incluir 'owner' e 'office' no lugar de 'admin'
DROP POLICY IF EXISTS "Admin write - Profiles"   ON profiles;
DROP POLICY IF EXISTS "Admin update - Profiles"  ON profiles;
DROP POLICY IF EXISTS "Admin delete - Profiles"  ON profiles;
DROP POLICY IF EXISTS "Admin write - Inventory"  ON inventory;
DROP POLICY IF EXISTS "Admin/Sysadmin write - Sales"    ON sales;
DROP POLICY IF EXISTS "Admin/Sysadmin write - Expenses" ON expenses;

-- Profiles: owner e office podem gerenciar usuários da org
CREATE POLICY "Manager write - Profiles" ON profiles
    FOR INSERT WITH CHECK (get_user_role() IN ('sysadmin', 'owner', 'office'));
CREATE POLICY "Manager update - Profiles" ON profiles
    FOR UPDATE USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
        OR id = auth.uid()  -- cada um pode atualizar a si mesmo
    );
CREATE POLICY "Manager delete - Profiles" ON profiles
    FOR DELETE USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Inventory: owner e office gerenciam; seller e carpenter leitura
CREATE POLICY "Manager write - Inventory" ON inventory
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Sales: owner e office gerenciam completo; seller só as suas; carpenter leitura
DROP POLICY IF EXISTS "Tenant read or sysadmin all - Sales" ON sales;
CREATE POLICY "Tenant read - Sales" ON sales
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR (organization_id = get_user_org_id() AND get_user_role() = 'seller'    AND seller_id    = auth.uid())
        OR (organization_id = get_user_org_id() AND get_user_role() = 'carpenter' AND carpenter_id = auth.uid())
    );
CREATE POLICY "Manager write - Sales" ON sales
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Carpenter pode atualizar status (kanban) das suas sales
CREATE POLICY "Carpenter update status - Sales" ON sales
    FOR UPDATE USING (
        organization_id = get_user_org_id()
        AND get_user_role() = 'carpenter'
        AND carpenter_id = auth.uid()
    );

-- Expenses: owner e office gerenciam
CREATE POLICY "Manager write - Expenses" ON expenses
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Kanban Stages
CREATE POLICY "Tenant all - KanbanStages" ON kanban_stages
    FOR ALL USING (
        organization_id = get_user_org_id() OR get_user_role() = 'sysadmin'
    );
CREATE POLICY "Manager write - KanbanStages" ON kanban_stages
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Suppliers
CREATE POLICY "Tenant read - Suppliers" ON suppliers
    FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Manager write - Suppliers" ON suppliers
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Purchases
CREATE POLICY "Tenant read - Purchases" ON purchases
    FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Manager write - Purchases" ON purchases
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Commissions: owner vê todas; seller e carpenter vêem as suas
CREATE POLICY "Tenant read - Commissions" ON commissions
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR (organization_id = get_user_org_id() AND profile_id = auth.uid())
    );
CREATE POLICY "Manager write - Commissions" ON commissions
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Project Files: owner e office gerenciam; carpenter lê dos seus; seller lê dos seus
CREATE POLICY "Tenant read - ProjectFiles" ON project_files
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('seller', 'carpenter')
            AND sale_id IN (
                SELECT id FROM sales
                WHERE (seller_id = auth.uid() OR carpenter_id = auth.uid())
            ))
    );
CREATE POLICY "Manager write - ProjectFiles" ON project_files
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
    );

-- Calendar Events: filtros por privacidade
CREATE POLICY "Tenant read - CalendarEvents" ON calendar_events
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office') AND NOT is_private)
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR (organization_id = get_user_org_id() AND get_user_role() = 'seller'
            AND (created_by = auth.uid() OR NOT is_private)
            AND (sale_id IS NULL OR sale_id IN (SELECT id FROM sales WHERE seller_id = auth.uid())))
        OR (organization_id = get_user_org_id() AND get_user_role() = 'carpenter'
            AND (created_by = auth.uid() OR event_type = 'delivery'))
    );
CREATE POLICY "Manager write - CalendarEvents" ON calendar_events
    FOR ALL USING (
        (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
        OR get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND created_by = auth.uid())
    );

-- Audit Logs: owner e admin lêem; ninguém escreve diretamente (só via trigger)
CREATE POLICY "Owner read - AuditLogs" ON audit_logs
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
    );

-- ────────────────────────────────────────────────────────────
-- 13. INDEXES DE PERFORMANCE NAS NOVAS TABELAS
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kanban_stages_org     ON kanban_stages(organization_id, kanban_type, position);
CREATE INDEX IF NOT EXISTS idx_suppliers_org         ON suppliers(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_purchases_org_date    ON purchases(organization_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_sale        ON purchases(sale_id);
CREATE INDEX IF NOT EXISTS idx_commissions_org       ON commissions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_profile   ON commissions(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_sale      ON commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_project_files_sale    ON project_files(sale_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org   ON calendar_events(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_sales_seller          ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_carpenter       ON sales(carpenter_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery        ON sales(organization_id, delivery_date);

-- ────────────────────────────────────────────────────────────
-- 14. DADOS INICIAIS: Stages padrão para novas orgs
--     (serão criados via função para cada nova org)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_default_kanban_stages(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Funil de Vendas
    INSERT INTO kanban_stages (organization_id, kanban_type, name, color, position, is_final) VALUES
        (p_org_id, 'sales', '1º Contato',         '#94a3b8', 0, false),
        (p_org_id, 'sales', 'Medição Agendada',   '#60a5fa', 1, false),
        (p_org_id, 'sales', 'Orçamento Enviado',  '#fb923c', 2, false),
        (p_org_id, 'sales', 'Negociação',         '#f59e0b', 3, false),
        (p_org_id, 'sales', 'Contrato Assinado',  '#22c55e', 4, true)
    ON CONFLICT DO NOTHING;

    -- Fluxo de Produção
    INSERT INTO kanban_stages (organization_id, kanban_type, name, color, position, is_final) VALUES
        (p_org_id, 'production', 'Contrato Assinado', '#22c55e', 0, false),
        (p_org_id, 'production', 'Em Produção',       '#60a5fa', 1, false),
        (p_org_id, 'production', 'Acabamento',        '#fb923c', 2, false),
        (p_org_id, 'production', 'Pronto p/ Entrega', '#a78bfa', 3, false),
        (p_org_id, 'production', 'Montagem/Entrega',  '#f59e0b', 4, false),
        (p_org_id, 'production', 'Concluído',         '#10b981', 5, true)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

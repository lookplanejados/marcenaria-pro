-- ============================================================
-- MIGRATION 0012: Módulo de Orçamento
-- Tabela de preços por m², orçamentos com ambientes e itens,
-- token público para cliente aprovar/simular, RLS e auditoria.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELA DE PREÇOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_table_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,
    name            TEXT NOT NULL,
    price_prazo     NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_avista    NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 2. ORÇAMENTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    sale_id                 UUID REFERENCES sales(id) ON DELETE SET NULL,
    client_id               UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name             TEXT NOT NULL,
    client_address          TEXT,
    budget_number           TEXT,
    payment_type            TEXT NOT NULL DEFAULT 'both' CHECK (payment_type IN ('prazo', 'avista', 'both')),
    total_prazo             NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_avista            NUMERIC(10,2) NOT NULL DEFAULT 0,
    prazo_entry_percent     NUMERIC(5,2)  NOT NULL DEFAULT 30,
    prazo_installments      INTEGER       NOT NULL DEFAULT 12,
    avista_discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 10,
    avista_entry_percent    NUMERIC(5,2)  NOT NULL DEFAULT 50,
    observations            TEXT,
    status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    public_token            UUID UNIQUE DEFAULT uuid_generate_v4(),
    created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 3. AMBIENTES DO ORÇAMENTO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_environments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id   UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 4. ITENS DO ORÇAMENTO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_items (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id            UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
    environment_id       UUID REFERENCES budget_environments(id) ON DELETE CASCADE NOT NULL,
    price_table_item_id  UUID REFERENCES price_table_items(id) ON DELETE SET NULL,
    description          TEXT NOT NULL,
    qty                  NUMERIC(10,2) NOT NULL DEFAULT 1,
    alt_cm               NUMERIC(10,2) NOT NULL DEFAULT 0,
    larg_cm              NUMERIC(10,2) NOT NULL DEFAULT 0,
    prof_cm              NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_prazo_m2       NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_avista_m2      NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- Calculado automaticamente: (alt * larg / 10000) * preco_m2 * qty
    value_prazo          NUMERIC(10,2) GENERATED ALWAYS AS (
                             ROUND((alt_cm * larg_cm / 10000.0) * price_prazo_m2 * qty, 2)
                         ) STORED,
    value_avista         NUMERIC(10,2) GENERATED ALWAYS AS (
                             ROUND((alt_cm * larg_cm / 10000.0) * price_avista_m2 * qty, 2)
                         ) STORED,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    position             INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- 5. HABILITAR RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE price_table_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items        ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 6. POLÍTICAS RLS
-- ────────────────────────────────────────────────────────────

-- price_table_items: todos da org lêem; apenas managers escrevem
CREATE POLICY "Tenant read - PriceTableItems" ON price_table_items
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR organization_id = get_user_org_id()
    );

CREATE POLICY "Manager write - PriceTableItems" ON price_table_items
    FOR ALL USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office'))
    );

-- budgets: todos exceto carpenter lêem/escrevem
CREATE POLICY "NonCarpenter read - Budgets" ON budgets
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office', 'seller'))
    );

CREATE POLICY "NonCarpenter write - Budgets" ON budgets
    FOR ALL USING (
        get_user_role() = 'sysadmin'
        OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office', 'seller'))
    );

-- budget_environments: através do orçamento
CREATE POLICY "Budget access - Environments" ON budget_environments
    FOR ALL USING (
        budget_id IN (
            SELECT id FROM budgets
            WHERE get_user_role() = 'sysadmin'
               OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office', 'seller'))
        )
    );

-- budget_items: através do orçamento
CREATE POLICY "Budget access - Items" ON budget_items
    FOR ALL USING (
        budget_id IN (
            SELECT id FROM budgets
            WHERE get_user_role() = 'sysadmin'
               OR (organization_id = get_user_org_id() AND get_user_role() IN ('owner', 'office', 'seller'))
        )
    );

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGERS DE AUDITORIA
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS audit_price_table_items ON price_table_items;
DROP TRIGGER IF EXISTS audit_budgets           ON budgets;

CREATE TRIGGER audit_price_table_items
    AFTER INSERT OR UPDATE OR DELETE ON price_table_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_budgets
    AFTER INSERT OR UPDATE OR DELETE ON budgets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ────────────────────────────────────────────────────────────
-- 8. INDEXES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_price_items_org     ON price_table_items(organization_id, position);
CREATE INDEX IF NOT EXISTS idx_budgets_org         ON budgets(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_token       ON budgets(public_token);
CREATE INDEX IF NOT EXISTS idx_budgets_client      ON budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budgets_sale        ON budgets(sale_id);
CREATE INDEX IF NOT EXISTS idx_budget_envs_budget  ON budget_environments(budget_id, position);
CREATE INDEX IF NOT EXISTS idx_budget_items_env    ON budget_items(environment_id, position);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);

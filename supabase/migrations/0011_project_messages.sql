-- ============================================================
-- MIGRATION 0011: Chat de projeto (mensagens por projeto)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    sale_id         UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_messages_sale ON project_messages(sale_id, created_at);
CREATE INDEX IF NOT EXISTS idx_project_messages_org  ON project_messages(organization_id, created_at DESC);

-- Todos os membros da org podem ler mensagens do projeto
CREATE POLICY "Tenant read - ProjectMessages" ON project_messages
    FOR SELECT USING (
        get_user_role() = 'sysadmin'
        OR organization_id = get_user_org_id()
    );

-- Todos os membros da org podem enviar mensagens
CREATE POLICY "Tenant insert - ProjectMessages" ON project_messages
    FOR INSERT WITH CHECK (
        get_user_role() = 'sysadmin'
        OR organization_id = get_user_org_id()
    );

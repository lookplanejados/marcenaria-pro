-- Adicionar campos de contato e identificação para a organização
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Permitir update da organizacao pelo owner ou admin
CREATE POLICY "Users can update their own organization"
    ON organizations FOR UPDATE
    USING (id = get_user_org_id());

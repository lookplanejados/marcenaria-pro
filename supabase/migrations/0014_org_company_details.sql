-- Novos campos de cadastro da empresa e proprietário
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS company_name       TEXT,
    ADD COLUMN IF NOT EXISTS state_registration TEXT,
    ADD COLUMN IF NOT EXISTS owner_name         TEXT,
    ADD COLUMN IF NOT EXISTS owner_cpf          TEXT,
    ADD COLUMN IF NOT EXISTS owner_phone        TEXT;

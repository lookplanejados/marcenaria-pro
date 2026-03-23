-- Preferências de pagamento padrão por organização
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS default_payment_type TEXT DEFAULT 'both' CHECK (default_payment_type IN ('prazo', 'avista', 'both')),
    ADD COLUMN IF NOT EXISTS default_prazo_entry_percent NUMERIC DEFAULT 30,
    ADD COLUMN IF NOT EXISTS default_prazo_installments INTEGER DEFAULT 12,
    ADD COLUMN IF NOT EXISTS default_avista_discount_percent NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS default_avista_entry_percent NUMERIC DEFAULT 50;

-- Adicionando novos campos de contato e endereço para as Marcenarias (Organizations)

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2);

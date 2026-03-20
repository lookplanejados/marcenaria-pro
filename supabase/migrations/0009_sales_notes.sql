-- Adiciona campo de observações/descrição nas vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

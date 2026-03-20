-- Índices de performance para queries frequentes

-- sales
CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(organization_id, created_at DESC);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_sale_id ON expenses(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date_incurred ON expenses(organization_id, date_incurred DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(organization_id, expense_type);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- inventory
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(organization_id, category);

-- installments
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installments_organization_id ON installments(organization_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_installments_paid ON installments(sale_id, paid);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale_id ON stock_movements(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_id ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_organization_id ON stock_movements(organization_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);

-- architects
CREATE INDEX IF NOT EXISTS idx_architects_organization_id ON architects(organization_id);

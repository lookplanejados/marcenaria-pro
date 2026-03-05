-- Migration para hierarquia de perfis: sysadmin, admin, carpenter

-- 1. Atualizar a restrição de role na tabela profiles
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;

-- Atualizar os perfis existentes ('owner' vira 'sysadmin' para não quebrar a restrição)
UPDATE profiles SET role = 'sysadmin' WHERE role = 'owner';

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('sysadmin', 'admin', 'carpenter'));

-- 2. Permitir que o sysadmin não esteja vinculado a nenhuma organização específica (organization_id nulo)
-- Inicialmente organization_id tem ON DELETE CASCADE, mas como ele pode ser nulo se não houver um NOT NULL, precisamos garantir isso.
-- A definição inicial não tinha NOT NULL no organization_id explícito na tabela profiles: 
-- `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`
-- Então ele já aceita null, o que está de acordo.

-- 3. Atualizar função get_user_org_id e criar get_user_role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Atualizar as Políticas RLS
-- O objetivo agora é permitir que quem tem 'sysadmin' ignore todas as regras de Tenant e possa ver/editar de todas.
-- E organizações só podem ser criadas/editadas por 'sysadmin'.

-- Remover políticas antigas de Tenant baseadas apenas no organization_id

-- organizations
DROP POLICY IF EXISTS "Isolamento de Tenant - Organizations" ON organizations;
CREATE POLICY "Tenant read or sysadmin all - Organizations" ON organizations
FOR SELECT USING (id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Admin check - Organizations" ON organizations
FOR ALL USING (get_user_role() = 'sysadmin'); -- INSERT/UPDATE/DELETE só sysadmin

-- profiles
DROP POLICY IF EXISTS "Isolamento de Tenant - Profiles" ON profiles;
CREATE POLICY "Tenant read or sysadmin all - Profiles" ON profiles
FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Admin write - Profiles" ON profiles
FOR INSERT WITH CHECK (get_user_role() IN ('sysadmin', 'admin'));
CREATE POLICY "Admin update - Profiles" ON profiles
FOR UPDATE USING (organization_id = get_user_org_id() AND get_user_role() IN ('sysadmin', 'admin') OR get_user_role() = 'sysadmin');
CREATE POLICY "Admin delete - Profiles" ON profiles
FOR DELETE USING (organization_id = get_user_org_id() AND get_user_role() IN ('sysadmin', 'admin') OR get_user_role() = 'sysadmin');

-- inventory
DROP POLICY IF EXISTS "Isolamento de Tenant - Inventory" ON inventory;
CREATE POLICY "Tenant read or sysadmin all - Inventory" ON inventory
FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Admin write - Inventory" ON inventory
FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('sysadmin', 'admin') OR get_user_role() = 'sysadmin');

-- sales
DROP POLICY IF EXISTS "Isolamento de Tenant - Sales" ON sales;
CREATE POLICY "Tenant read or sysadmin all - Sales" ON sales
FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
-- A política antiga "Proprietários podem apagar vendas" não vai chocar aqui pois vamos repor as escritas:
DROP POLICY IF EXISTS "Proprietários podem apagar vendas" ON sales;
CREATE POLICY "Admin/Sysadmin write - Sales" ON sales
FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('sysadmin', 'admin') OR get_user_role() = 'sysadmin');

-- expenses
DROP POLICY IF EXISTS "Isolamento de Tenant - Expenses" ON expenses;
CREATE POLICY "Tenant read or sysadmin all - Expenses" ON expenses
FOR SELECT USING (organization_id = get_user_org_id() OR get_user_role() = 'sysadmin');
CREATE POLICY "Admin/Sysadmin write - Expenses" ON expenses
FOR ALL USING (organization_id = get_user_org_id() AND get_user_role() IN ('sysadmin', 'admin') OR get_user_role() = 'sysadmin');

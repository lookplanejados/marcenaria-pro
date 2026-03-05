-- Fix sysadmin user and RLS policies

-- 1. Garante que Ilson é sysadmin (se ele existir no auth.users)
DO $$
DECLARE
    ilson_uid UUID;
BEGIN
    SELECT id INTO ilson_uid FROM auth.users WHERE email = 'ilsonbrandao@gmail.com' LIMIT 1;
    
    IF ilson_uid IS NOT NULL THEN
        -- Tenta atualizar o perfil
        UPDATE public.profiles SET role = 'sysadmin' WHERE id = ilson_uid;
        
        -- Se não atualizou nada, o perfil não existe, então insere
        IF NOT FOUND THEN
            INSERT INTO public.profiles (id, full_name, role)
            VALUES (ilson_uid, 'Ilson Rodrigues Brandão', 'sysadmin');
        END IF;
    END IF;
END $$;

-- 2. Reescreve get_user_role e get_user_org_id para garantir bypass de RLS via SECURITY DEFINER
-- usando uma tabela limpa sem invocar novos RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  returned_role TEXT;
BEGIN
  -- Acesso direto para não engatilhar RLS
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

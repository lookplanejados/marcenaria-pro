import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente admin do Supabase usando a SERVICE_ROLE_KEY
// Isso permite gerenciar usuários no auth.users sem precisar fazer login no frontend
// e evita que o usuário atual (Admin) seja deslogado.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Auxiliar para pegar e validar a sessão de quem está chamando a API
async function getCallerProfile(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) return null;

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return profile;
}

export async function GET(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'admin'].includes(caller.role)) {
            return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
        }

        // Monta a query. Se for sysadmin, vê todos. Se for admin, vê só da sua org.
        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                organization_id,
                address,
                city,
                state,
                cpf,
                phone,
                notes,
                is_active,
                organizations ( name )
            `);

        if (caller.role === 'admin') {
            query = query.eq('organization_id', caller.organization_id);
        }

        const { data, error } = await query.order('full_name', { ascending: true });

        if (error) throw error;

        // Vamos enriquecer trazendo o email do auth.admin
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const enrichedData = data.map(profile => {
            const authUser = authData.users.find(u => u.id === profile.id);
            return {
                ...profile,
                email: authUser?.email || '',
            };
        });

        return NextResponse.json(enrichedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'admin'].includes(caller.role)) {
            return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
        }

        const {
            email, password, full_name, role, organization_id,
            address, city, state, cpf, phone, notes, is_active
        } = await req.json();

        if (!email || !password || !full_name || !role) {
            return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
        }

        let targetOrgId = organization_id;

        // Regras de negócio
        if (caller.role === 'admin') {
            if (role === 'sysadmin') {
                return NextResponse.json({ error: "Admins não podem criar Super Admins." }, { status: 403 });
            }
            // Força a organização do criador
            targetOrgId = caller.organization_id;
        }

        // Criar usuário no auth.users
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (createError) throw createError;

        // Criar perfil
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                organization_id: targetOrgId || null,
                role: role,
                full_name: full_name,
                address: address || null,
                city: city || null,
                state: state || null,
                cpf: cpf || null,
                phone: phone || null,
                notes: notes || null,
                is_active: is_active !== undefined ? is_active : true,
            });

        if (profileError) {
            // Se falhou, desfaz a criação no auth
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json({ message: "Usuário criado com sucesso", id: authData.user.id }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'admin'].includes(caller.role)) {
            return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
        }

        const {
            id, full_name, role, organization_id, password,
            address, city, state, cpf, phone, notes, is_active
        } = await req.json();

        if (!id) return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });

        // Validação de segurança para 'admin'
        if (caller.role === 'admin') {
            if (role === 'sysadmin') return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

            // Verifica se o usuário que está sendo editado pertence a org dele
            const { data: targetProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
            if (!targetProfile) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
            if (targetProfile.role === 'sysadmin') return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
            if (targetProfile.organization_id !== caller.organization_id) {
                return NextResponse.json({ error: "Você não tem permissão para editar este usuário." }, { status: 403 });
            }
        }

        // Atualizar perfil
        const updateData: any = {
            full_name,
            role,
            address: address !== undefined ? address : null,
            city: city !== undefined ? city : null,
            state: state !== undefined ? state : null,
            cpf: cpf !== undefined ? cpf : null,
            phone: phone !== undefined ? phone : null,
            notes: notes !== undefined ? notes : null,
            is_active: is_active !== undefined ? is_active : true
        };
        if (caller.role === 'sysadmin' && organization_id !== undefined) {
            updateData.organization_id = organization_id || null;
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', id);

        if (profileError) throw profileError;

        // Atualizar senha se fornecida
        if (password && password.trim() !== '') {
            const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
            if (pwdError) throw pwdError;
        }

        return NextResponse.json({ message: "Usuário atualizado com sucesso" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'admin'].includes(caller.role)) {
            return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
        }

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
        if (id === caller.id) return NextResponse.json({ error: "Você não pode excluir a si mesmo." }, { status: 400 });

        // Validação de segurança para 'admin'
        if (caller.role === 'admin') {
            const { data: targetProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
            if (!targetProfile) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
            if (targetProfile.role === 'sysadmin') return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
            if (targetProfile.organization_id !== caller.organization_id) {
                return NextResponse.json({ error: "Você não tem permissão para excluir este usuário." }, { status: 403 });
            }
        }

        // Excluir usuário do auth.users. O CASCADE fará o favor de limpar o profiles.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (error) throw error;

        return NextResponse.json({ message: "Usuário removido com sucesso" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

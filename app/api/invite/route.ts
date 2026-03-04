import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        // Cria um client vazio so para decodificar o token com a chave anon
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
        }

        const { email, fullName, role } = await req.json();

        if (!email || !role) {
            return NextResponse.json({ error: 'E-mail e Perfil são obrigatórios' }, { status: 400 });
        }

        // Descobre a organização do usuário logado e certifica que ele é owner ou admin
        const { data: callerProfile, error: callerError } = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single();

        if (callerError || !callerProfile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 });
        }

        if (callerProfile.role !== 'owner' && callerProfile.role !== 'admin') {
            return NextResponse.json({ error: 'Apenas proprietários e administradores podem convidar usuários.' }, { status: 403 });
        }

        // Tenta enviar o convite pelo Supabase Auth Admin
        const { data: userInviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                organization_id: callerProfile.organization_id
            }
        });

        if (inviteError) {
            return NextResponse.json({ error: inviteError.message }, { status: 500 });
        }

        const newUserId = userInviteData?.user?.id;

        if (newUserId) {
            // Cria ou atualiza o perfil do novo usuário na tabela profiles para vincular à org
            await supabaseAdmin.from('profiles').upsert({
                id: newUserId,
                organization_id: callerProfile.organization_id,
                role: role,
                full_name: fullName || email.split('@')[0],
            });
        }

        return NextResponse.json({ success: true, message: 'Convite enviado e perfil configurado.' });

    } catch (error: any) {
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}

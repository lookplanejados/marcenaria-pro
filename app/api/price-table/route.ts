import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getCallerProfile(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    return profile;
}

export async function GET(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

        const query = caller.role === 'sysadmin'
            ? supabaseAdmin.from('price_table_items').select('*').order('position')
            : supabaseAdmin.from('price_table_items').select('*').eq('organization_id', caller.organization_id).order('position');

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'owner', 'office'].includes(caller.role)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const { name, price_prazo, price_avista, is_active } = body;
        if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });

        const orgId = caller.organization_id;

        // posição = próximo número
        const { count } = await supabaseAdmin
            .from('price_table_items')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId);

        const { data, error } = await supabaseAdmin.from('price_table_items').insert({
            organization_id: orgId,
            name: name.trim(),
            price_prazo: price_prazo || 0,
            price_avista: price_avista || 0,
            is_active: is_active !== false,
            position: count ?? 0,
        }).select().single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

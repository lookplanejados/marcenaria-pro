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

export async function POST(req: Request, { params }: { params: { budgetId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const { name } = await req.json();
        if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });

        const { count } = await supabaseAdmin
            .from('budget_environments')
            .select('*', { count: 'exact', head: true })
            .eq('budget_id', params.budgetId);

        const { data, error } = await supabaseAdmin.from('budget_environments').insert({
            budget_id: params.budgetId,
            name:      name.trim(),
            position:  count ?? 0,
        }).select().single();

        if (error) throw error;
        return NextResponse.json({ ...data, items: [] }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

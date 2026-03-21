import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { recalcTotals } from '@/lib/budget-recalc';

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

        const body = await req.json();
        const {
            environment_id, price_table_item_id, description,
            qty, alt_cm, larg_cm, prof_cm, price_prazo_m2, price_avista_m2,
        } = body;

        if (!environment_id || !description?.trim()) {
            return NextResponse.json({ error: 'Ambiente e descrição são obrigatórios.' }, { status: 400 });
        }

        const { count } = await supabaseAdmin
            .from('budget_items')
            .select('*', { count: 'exact', head: true })
            .eq('environment_id', environment_id);

        const { data, error } = await supabaseAdmin.from('budget_items').insert({
            budget_id:           params.budgetId,
            environment_id,
            price_table_item_id: price_table_item_id || null,
            description:         description.trim(),
            qty:                 qty || 1,
            alt_cm:              alt_cm || 0,
            larg_cm:             larg_cm || 0,
            prof_cm:             prof_cm || 0,
            price_prazo_m2:      price_prazo_m2 || 0,
            price_avista_m2:     price_avista_m2 || 0,
            position:            count ?? 0,
        }).select().single();

        if (error) throw error;
        await recalcTotals(params.budgetId);
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

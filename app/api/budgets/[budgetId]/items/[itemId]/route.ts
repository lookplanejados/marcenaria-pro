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

async function recalcTotals(budgetId: string) {
    const { data: items } = await supabaseAdmin
        .from('budget_items')
        .select('value_prazo, value_avista')
        .eq('budget_id', budgetId)
        .eq('is_active', true);

    const total_prazo  = items?.reduce((s, i) => s + (i.value_prazo  || 0), 0) ?? 0;
    const total_avista = items?.reduce((s, i) => s + (i.value_avista || 0), 0) ?? 0;

    await supabaseAdmin.from('budgets').update({
        total_prazo:  Math.round(total_prazo  * 100) / 100,
        total_avista: Math.round(total_avista * 100) / 100,
        updated_at:   new Date().toISOString(),
    }).eq('id', budgetId);
}

export async function PUT(req: Request, { params }: { params: { budgetId: string; itemId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const allowed = ['description', 'qty', 'alt_cm', 'larg_cm', 'prof_cm', 'price_prazo_m2', 'price_avista_m2', 'is_active', 'position'];
        const updates: any = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        const { data, error } = await supabaseAdmin
            .from('budget_items')
            .update(updates)
            .eq('id', params.itemId)
            .eq('budget_id', params.budgetId)
            .select().single();

        if (error) throw error;
        await recalcTotals(params.budgetId);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { budgetId: string; itemId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('budget_items')
            .delete()
            .eq('id', params.itemId)
            .eq('budget_id', params.budgetId);

        if (error) throw error;
        await recalcTotals(params.budgetId);
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
    try {
        const { data: budget, error: budgetErr } = await supabaseAdmin
            .from('budgets')
            .select('id, status')
            .eq('public_token', params.token)
            .single();

        if (budgetErr || !budget) {
            return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
        }

        const body = await req.json();
        const { action, item_id, is_active, qty, status,
                prazo_entry_percent, prazo_installments,
                avista_discount_percent, avista_entry_percent } = body;

        // Atualizar status do orçamento (aprovado/rejeitado pelo cliente)
        if (action === 'set_status' && status) {
            await supabaseAdmin.from('budgets')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', budget.id);
            return NextResponse.json({ ok: true });
        }

        // Atualizar condições de pagamento
        if (action === 'update_payment') {
            const updates: any = { updated_at: new Date().toISOString() };
            if (prazo_entry_percent    !== undefined) updates.prazo_entry_percent    = prazo_entry_percent;
            if (prazo_installments     !== undefined) updates.prazo_installments     = prazo_installments;
            if (avista_discount_percent !== undefined) updates.avista_discount_percent = avista_discount_percent;
            if (avista_entry_percent   !== undefined) updates.avista_entry_percent   = avista_entry_percent;
            await supabaseAdmin.from('budgets').update(updates).eq('id', budget.id);
            return NextResponse.json({ ok: true });
        }

        // Atualizar item (is_active / qty)
        if (item_id) {
            const itemUpdates: any = {};
            if (is_active !== undefined) itemUpdates.is_active = is_active;
            if (qty       !== undefined) itemUpdates.qty       = qty;

            const { error } = await supabaseAdmin
                .from('budget_items')
                .update(itemUpdates)
                .eq('id', item_id)
                .eq('budget_id', budget.id);

            if (error) throw error;
            await recalcTotals(budget.id);

            const { data: updated } = await supabaseAdmin
                .from('budgets')
                .select('total_prazo, total_avista')
                .eq('id', budget.id)
                .single();

            return NextResponse.json({ ok: true, totals: updated });
        }

        return NextResponse.json({ error: 'Nenhuma ação reconhecida.' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

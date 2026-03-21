import { supabaseAdmin } from '@/lib/supabase-admin';

export async function recalcTotals(budgetId: string) {
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

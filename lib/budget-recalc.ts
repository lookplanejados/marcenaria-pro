import { supabaseAdmin } from '@/lib/supabase-admin';

export async function recalcTotals(budgetId: string) {
    const [{ data: items }, { data: budget }] = await Promise.all([
        supabaseAdmin
            .from('budget_items')
            .select('value_prazo')
            .eq('budget_id', budgetId)
            .eq('is_active', true),
        supabaseAdmin
            .from('budgets')
            .select('avista_discount_percent')
            .eq('id', budgetId)
            .single(),
    ]);

    const total_prazo = items?.reduce((s, i) => s + (i.value_prazo || 0), 0) ?? 0;
    const discount    = budget?.avista_discount_percent ?? 0;
    const total_avista = total_prazo * (1 - discount / 100);

    await supabaseAdmin.from('budgets').update({
        total_prazo:  Math.round(total_prazo  * 100) / 100,
        total_avista: Math.round(total_avista * 100) / 100,
        updated_at:   new Date().toISOString(),
    }).eq('id', budgetId);
}

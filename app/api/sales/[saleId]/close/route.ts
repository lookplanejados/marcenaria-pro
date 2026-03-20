import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

export async function POST(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'admin'].includes(caller.role)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const {
            total_value,
            received_value,
            commission_carpenter_percent,
            commission_seller_percent,
            rt_architect_percent,
            freight_cost,
            meals_cost,
            raw_material_cost,
        } = await req.json();

        // Deduções percentuais
        const rt_value = total_value * (rt_architect_percent / 100);
        const commission_seller_value = total_value * (commission_seller_percent / 100);
        const commission_carpenter_value = total_value * (commission_carpenter_percent / 100);

        // Total de custos diretos
        const total_deductions =
            rt_value +
            commission_seller_value +
            commission_carpenter_value +
            freight_cost +
            meals_cost +
            raw_material_cost;

        // Lucratividade e saldo a receber
        const gross_profit = total_value - total_deductions;
        const balance_to_receive = total_value - received_value;
        const gross_margin_percent = total_value > 0 ? (gross_profit / total_value) * 100 : 0;

        // Atualizar venda no banco
        const { error } = await supabaseAdmin
            .from('sales')
            .update({ status: 'Concluído', received_value })
            .eq('id', params.saleId);

        if (error) throw error;

        return NextResponse.json({
            sale_id: params.saleId,
            balance_to_receive: Math.round(balance_to_receive * 100) / 100,
            total_deductions: Math.round(total_deductions * 100) / 100,
            gross_profit: Math.round(gross_profit * 100) / 100,
            gross_margin_percent: Math.round(gross_margin_percent * 100) / 100,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

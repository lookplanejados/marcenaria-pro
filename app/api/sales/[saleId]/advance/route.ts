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
        if (!caller) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const { new_status, used_materials } = await req.json();

        // Avançar status no Kanban
        const { error: saleError } = await supabaseAdmin
            .from('sales')
            .update({ status: new_status })
            .eq('id', params.saleId);

        if (saleError) throw saleError;

        // Baixa automática de estoque
        if (used_materials && used_materials.length > 0) {
            for (const material of used_materials) {
                const { data: inv } = await supabaseAdmin
                    .from('inventory')
                    .select('quantity')
                    .eq('id', material.inventory_id)
                    .single();

                if (inv) {
                    const new_qty = Math.max(0, inv.quantity - material.quantity_used);
                    await supabaseAdmin
                        .from('inventory')
                        .update({ quantity: new_qty })
                        .eq('id', material.inventory_id);
                }
            }
        }

        return NextResponse.json({
            message: `Obra avançada para ${new_status} com sucesso e estoque atualizado.`,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

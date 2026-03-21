import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getCallerProfile(req: Request) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    return data;
}

/** PATCH /api/sales/[saleId]/notes — salva observações do projeto */
export async function PATCH(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const { notes } = await req.json();
        const { error } = await supabaseAdmin
            .from('sales')
            .update({ notes })
            .eq('id', params.saleId);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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

        const { message } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ error: 'Mensagem não pode ser vazia.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('expenses').insert({
            organization_id: caller.organization_id,
            sale_id: params.saleId,
            description: `⚠️ Relato de ${caller.full_name || 'marceneiro'}: ${message.trim()}`,
            amount: 0,
            expense_type: 'Direct',
        });

        if (error) throw error;

        return NextResponse.json({ message: 'Relato registrado com sucesso.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

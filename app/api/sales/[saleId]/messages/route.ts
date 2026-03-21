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

/** GET /api/sales/[saleId]/messages */
export async function GET(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const { data, error } = await supabaseAdmin
            .from('project_messages')
            .select('*, profiles(id, full_name, avatar_url, role)')
            .eq('sale_id', params.saleId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** POST /api/sales/[saleId]/messages */
export async function POST(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const { message } = await req.json();
        if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('project_messages')
            .insert({
                organization_id: caller.organization_id,
                sale_id: params.saleId,
                profile_id: caller.id,
                message: message.trim(),
            })
            .select('*, profiles(id, full_name, avatar_url, role)')
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

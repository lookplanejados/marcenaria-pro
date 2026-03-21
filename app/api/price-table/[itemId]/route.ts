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

export async function PUT(req: Request, { params }: { params: { itemId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'owner', 'office'].includes(caller.role)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const { name, price_prazo, price_avista, is_active, position } = body;

        const updates: any = {};
        if (name !== undefined)          updates.name          = name;
        if (price_prazo !== undefined)   updates.price_prazo   = price_prazo;
        if (price_avista !== undefined)  updates.price_avista  = price_avista;
        if (is_active !== undefined)     updates.is_active     = is_active;
        if (position !== undefined)      updates.position      = position;

        const { data, error } = await supabaseAdmin
            .from('price_table_items')
            .update(updates)
            .eq('id', params.itemId)
            .select().single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { itemId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'owner', 'office'].includes(caller.role)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('price_table_items')
            .delete()
            .eq('id', params.itemId);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

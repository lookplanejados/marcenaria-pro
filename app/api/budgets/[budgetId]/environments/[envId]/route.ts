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

export async function PUT(req: Request, { params }: { params: { budgetId: string; envId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const updates: any = {};
        if (body.name !== undefined)     updates.name     = body.name;
        if (body.position !== undefined) updates.position = body.position;

        const { data, error } = await supabaseAdmin
            .from('budget_environments')
            .update(updates)
            .eq('id', params.envId)
            .eq('budget_id', params.budgetId)
            .select().single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { budgetId: string; envId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('budget_environments')
            .delete()
            .eq('id', params.envId)
            .eq('budget_id', params.budgetId);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: Request, { params }: { params: { budgetId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('budgets')
            .select('public_token')
            .eq('id', params.budgetId)
            .single();

        if (error) throw error;
        return NextResponse.json({
            public_token: data.public_token,
            public_url:   `${appUrl}/orcamento/${data.public_token}`,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { budgetId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        // regenera token
        const { data, error } = await supabaseAdmin
            .from('budgets')
            .update({ public_token: crypto.randomUUID() })
            .eq('id', params.budgetId)
            .select('public_token')
            .single();

        if (error) throw error;
        return NextResponse.json({
            public_token: data.public_token,
            public_url:   `${appUrl}/orcamento/${data.public_token}`,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

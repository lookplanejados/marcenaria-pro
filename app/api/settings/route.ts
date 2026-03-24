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

export async function GET(req: Request) {
    const profile = await getCallerProfile(req);
    if (!profile) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('name, company_name, cnpj, state_registration, phone, email, address, owner_name, owner_cpf, owner_phone, logo_url, budget_validity_days, default_payment_type, default_prazo_entry_percent, default_prazo_installments, default_avista_discount_percent, default_avista_entry_percent, default_budget_observations')
        .eq('id', profile.organization_id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(req: Request) {
    const profile = await getCallerProfile(req);
    if (!profile) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!['owner', 'office', 'sysadmin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();

    // Campos permitidos
    const allowed = ['name', 'company_name', 'cnpj', 'state_registration', 'phone', 'email', 'address',
        'owner_name', 'owner_cpf', 'owner_phone', 'budget_validity_days',
        'default_payment_type', 'default_prazo_entry_percent',
        'default_prazo_installments', 'default_avista_discount_percent',
        'default_avista_entry_percent', 'default_budget_observations'];

    const updates: any = {};
    for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key];
    }

    const { error } = await supabaseAdmin
        .from('organizations')
        .update(updates)
        .eq('id', profile.organization_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

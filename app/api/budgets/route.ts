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

export async function GET(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const status  = url.searchParams.get('status');
        const search  = url.searchParams.get('search');
        const page    = parseInt(url.searchParams.get('page') || '1');
        const limit   = 20;
        const offset  = (page - 1) * limit;

        let query = supabaseAdmin
            .from('budgets')
            .select('id, client_name, client_address, budget_number, payment_type, total_prazo, total_avista, status, created_at, updated_at, created_by, profiles!budgets_created_by_fkey(full_name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (caller.role !== 'sysadmin') {
            query = query.eq('organization_id', caller.organization_id);
        }
        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('client_name', `%${search}%`);

        const { data, error, count } = await query;
        if (error) throw error;
        return NextResponse.json({ data, total: count, page, limit });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || caller.role === 'carpenter') {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const body = await req.json();
        const {
            client_id, client_name, client_address,
            payment_type, prazo_entry_percent, prazo_installments,
            avista_discount_percent, avista_entry_percent, observations,
        } = body;

        if (!client_name?.trim()) return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 });

        const orgId = caller.organization_id;

        // gera número sequencial do orçamento no ano
        const year = new Date().getFullYear();
        const { count } = await supabaseAdmin
            .from('budgets')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId);

        const budgetNumber = `ORÇ-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`;

        const { data, error } = await supabaseAdmin.from('budgets').insert({
            organization_id:         orgId,
            client_id:               client_id || null,
            client_name:             client_name.trim(),
            client_address:          client_address || null,
            budget_number:           budgetNumber,
            payment_type:            payment_type || 'both',
            prazo_entry_percent:     prazo_entry_percent ?? 30,
            prazo_installments:      prazo_installments ?? 12,
            avista_discount_percent: avista_discount_percent ?? 10,
            avista_entry_percent:    avista_entry_percent ?? 50,
            observations:            observations || null,
            created_by:              caller.id,
        }).select().single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

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

export async function POST(req: Request) {
    const profile = await getCallerProfile(req);
    if (!profile) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (!['owner', 'office', 'sysadmin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${profile.organization_id}/logo.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
        .from('org-logos')
        .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    // Adiciona cache-busting para forçar reload da imagem
    const { data: { publicUrl } } = supabaseAdmin.storage.from('org-logos').getPublicUrl(path);
    const logo_url = `${publicUrl}?t=${Date.now()}`;

    await supabaseAdmin
        .from('organizations')
        .update({ logo_url })
        .eq('id', profile.organization_id);

    return NextResponse.json({ logo_url });
}

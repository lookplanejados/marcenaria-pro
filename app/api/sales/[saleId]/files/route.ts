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

/** GET /api/sales/[saleId]/files — lista arquivos do projeto */
export async function GET(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const { data, error } = await supabaseAdmin
            .from('project_files')
            .select('*, profiles(full_name)')
            .eq('sale_id', params.saleId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Gera URLs assinadas (válidas por 1h) para cada arquivo
        const files = await Promise.all((data || []).map(async (f) => {
            const { data: signedUrl } = await supabaseAdmin.storage
                .from('project-files')
                .createSignedUrl(f.file_path, 3600);
            return { ...f, signed_url: signedUrl?.signedUrl || null };
        }));

        return NextResponse.json(files);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** POST /api/sales/[saleId]/files — faz upload de arquivo */
export async function POST(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });

        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `${caller.organization_id || 'global'}/${params.saleId}/${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        const { error: storageErr } = await supabaseAdmin.storage
            .from('project-files')
            .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });
        if (storageErr) throw storageErr;

        const fileType = file.type.startsWith('image/') ? 'image' : ext === 'pdf' ? 'pdf' : 'other';
        const { data, error } = await supabaseAdmin.from('project_files').insert({
            organization_id: caller.organization_id,
            sale_id: params.saleId,
            file_name: file.name,
            file_path: filePath,
            file_type: fileType,
            uploaded_by: caller.id,
        }).select('*, profiles(full_name)').single();
        if (error) throw error;

        const { data: signedUrl } = await supabaseAdmin.storage
            .from('project-files').createSignedUrl(filePath, 3600);

        return NextResponse.json({ ...data, signed_url: signedUrl?.signedUrl || null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** DELETE /api/sales/[saleId]/files?fileId=uuid — remove arquivo */
export async function DELETE(req: Request, { params }: { params: { saleId: string } }) {
    try {
        const caller = await getCallerProfile(req);
        if (!caller || !['sysadmin', 'owner', 'office'].includes(caller.role)) {
            return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }

        const url = new URL(req.url);
        const fileId = url.searchParams.get('fileId');
        if (!fileId) return NextResponse.json({ error: 'fileId é obrigatório.' }, { status: 400 });

        // Busca o path para remover do storage
        const { data: file, error: fetchErr } = await supabaseAdmin
            .from('project_files')
            .select('file_path')
            .eq('id', fileId)
            .single();

        if (fetchErr || !file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });

        // Remove do storage
        await supabaseAdmin.storage.from('project-files').remove([file.file_path]);

        // Remove do banco
        const { error } = await supabaseAdmin.from('project_files').delete().eq('id', fileId);
        if (error) throw error;

        return NextResponse.json({ message: 'Arquivo removido.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

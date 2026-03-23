"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRBAC } from "@/components/rbac-provider";
import { toast } from "sonner";
import { AuthService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BudgetEnvironmentEditor } from "@/components/budget-environment-editor";
import { BudgetPaymentSimulator } from "@/components/budget-payment-simulator";
import { generateBudgetPDF } from "@/lib/generate-budget-pdf";
import { ArrowLeft, FileText, Share2, CheckCircle2, LockOpen, Copy, RotateCcw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Budget {
    id: string;
    client_name: string;
    client_address: string;
    budget_number: string;
    payment_type: 'prazo' | 'avista' | 'both';
    total_prazo: number;
    total_avista: number;
    prazo_entry_percent: number;
    prazo_installments: number;
    avista_discount_percent: number;
    avista_entry_percent: number;
    observations: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected';
    public_token: string;
    sale_id: string | null;
    environments: any[];
}

const STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado",
};
const STATUS_COLORS: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-600",
};

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function BudgetDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isNew = searchParams.get('new') === 'true';
    const { isCarpenter, loading: rbacLoading } = useRBAC();

    const [budget, setBudget]     = useState<Budget | null>(null);
    const [loading, setLoading]   = useState(true);
    const [shareUrl, setShareUrl] = useState("");
    const [shareOpen, setShareOpen] = useState(false);
    const [orgData, setOrgData] = useState<{
        name: string; company_name?: string; cnpj?: string;
        phone?: string; email?: string; address?: string; owner_name?: string;
    }>({ name: "Marcenaria Pro" });
    const [selectedPayment, setSelectedPayment] = useState<'prazo' | 'avista' | null>(null);

    const obsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!rbacLoading && isCarpenter) router.replace("/dashboard");
    }, [rbacLoading, isCarpenter, router]);

    const authHeader = async () => {
        const tok = await AuthService.getAccessToken();
        return { Authorization: `Bearer ${tok}` };
    };

    const load = useCallback(async () => {
        try {
            const h = await authHeader();
            const res = await fetch(`/api/budgets/${id}`, { headers: h });
            if (!res.ok) { router.replace('/dashboard/budgets'); return; }
            const data = await res.json();
            setBudget(data);
            // pré-seleciona a condição já salva (se não for 'both')
            if (data.payment_type === 'prazo' || data.payment_type === 'avista') {
                setSelectedPayment(data.payment_type);
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { if (!isCarpenter) load(); }, [load, isCarpenter]);

    // carrega dados da org para o PDF
    useEffect(() => {
        supabase.from('organizations')
            .select('name, company_name, cnpj, phone, email, address, owner_name')
            .single()
            .then(({ data }) => { if (data) setOrgData(data); });
    }, []);

    const patch = async (updates: Partial<Budget>) => {
        const h = await authHeader();
        const res = await fetch(`/api/budgets/${id}`, {
            method: 'PUT',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        setBudget(prev => prev ? { ...prev, ...data } : null);
    };

    const handleObsChange = (val: string) => {
        setBudget(prev => prev ? { ...prev, observations: val } : null);
        if (obsRef.current) clearTimeout(obsRef.current);
        obsRef.current = setTimeout(() => patch({ observations: val }), 800);
    };

    const handlePaymentChange = (updates: any) => {
        setBudget(prev => prev ? { ...prev, ...updates } : null);
        if (obsRef.current) clearTimeout(obsRef.current);
        obsRef.current = setTimeout(() => patch(updates), 800);
    };

    const handleStatus = async (status: string, paymentType?: 'prazo' | 'avista') => {
        const updates: any = { status };
        if (paymentType) updates.payment_type = paymentType;
        await patch(updates);
        toast.success(`Orçamento marcado como "${STATUS_LABELS[status]}"`);
    };

    const handleApproveConfirm = async () => {
        if (!selectedPayment) { toast.error("Selecione uma condição de pagamento na seção abaixo."); return; }
        await handleStatus('approved', selectedPayment);
        toast.success("Contrato autorizado! Orçamento bloqueado para edição.");
    };

    const handleReopen = async () => {
        await handleStatus('sent');
        toast.success("Orçamento reaberto para edição.");
    };

    const handleShare = async () => {
        const h = await authHeader();
        const res = await fetch(`/api/budgets/${id}/share`, { headers: h });
        const { public_url } = await res.json();
        setShareUrl(public_url);
        setShareOpen(true);
        // marca como enviado automaticamente
        if (budget?.status === 'draft') {
            await patch({ status: 'sent' });
        }
    };

    const handleRegenerateToken = async () => {
        const h = await authHeader();
        const res = await fetch(`/api/budgets/${id}/share`, { method: 'POST', headers: h });
        const { public_url } = await res.json();
        setShareUrl(public_url);
        toast.success("Link regenerado!");
    };

    const handleGeneratePDF = () => {
        if (!budget) return;
        const activeEnvs = budget.environments.map((env: any) => ({
            name: env.name,
            items: env.items.filter((i: any) => i.is_active).map((i: any) => ({
                description: i.description,
                qty: i.qty,
                alt_cm: i.alt_cm,
                larg_cm: i.larg_cm,
                value_prazo: i.value_prazo,
                value_avista: i.value_avista,
                is_active: true,
            })),
        })).filter((e: any) => e.items.length > 0);

        const validity = new Date();
        validity.setDate(validity.getDate() + 30);

        generateBudgetPDF({
            orgName:        orgData.name,
            orgCompanyName: orgData.company_name,
            orgCNPJ:        orgData.cnpj,
            orgPhone:       orgData.phone,
            orgEmail:       orgData.email,
            orgAddress:     orgData.address,
            orgOwnerName:   orgData.owner_name,
            budgetNumber: budget.budget_number || budget.id.slice(0, 8).toUpperCase(),
            validityDate: validity.toLocaleDateString('pt-BR'),
            clientName:   budget.client_name,
            clientAddress: budget.client_address,
            paymentType:  budget.payment_type,
            totalPrazo:   budget.total_prazo,
            totalAvista:  budget.total_avista,
            prazoEntryPercent:     budget.prazo_entry_percent,
            prazoInstallments:     budget.prazo_installments,
            avistaDiscountPercent: budget.avista_discount_percent,
            avistaEntryPercent:    budget.avista_entry_percent,
            environments: activeEnvs,
            observations: budget.observations,
        });
    };

    if (loading) return <div className="text-sm text-slate-400 animate-pulse p-8">Carregando orçamento...</div>;
    if (!budget) return null;

    return (
        <div className="max-w-3xl space-y-5">
            {/* Navegação */}
            <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard/budgets')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />Voltar
                </Button>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{budget.budget_number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[budget.status]}`}>
                    {STATUS_LABELS[budget.status]}
                </span>
            </div>

            {/* Banner novo */}
            {isNew && (
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 text-sm text-indigo-700 dark:text-indigo-300">
                    ✅ Orçamento criado! Agora adicione os ambientes e itens abaixo.
                </div>
            )}

            {/* Cabeçalho */}
            <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="text-xl font-bold">{budget.client_name}</h2>
                        {budget.client_address && (
                            <p className="text-sm text-slate-500">{budget.client_address}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={handleGeneratePDF}>
                            <FileText className="h-4 w-4 mr-1" />Baixar PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-1" />Gerar Link
                        </Button>
                        {budget.status !== 'approved' ? (
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={handleApproveConfirm}>
                                <ShieldCheck className="h-4 w-4 mr-1" />Autorizar Contrato
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                onClick={handleReopen}>
                                <LockOpen className="h-4 w-4 mr-1" />Reabrir Orçamento
                            </Button>
                        )}
                    </div>
                </div>

            </div>

            {/* Banner contrato autorizado */}
            {budget.status === 'approved' && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-4 flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">Contrato Autorizado</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Este orçamento está bloqueado. Clique em "Reabrir Orçamento" para editar.</p>
                    </div>
                </div>
            )}

            {/* Ambientes e Itens */}
            <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 space-y-4">
                <h3 className="font-semibold text-sm">Ambientes e Móveis</h3>
                <BudgetEnvironmentEditor
                    budgetId={id}
                    avistaDiscountPercent={budget.avista_discount_percent}
                    onTotalsChange={load}
                    readOnly={budget.status === 'approved'}
                />
            </div>

            {/* Condições de Pagamento */}
            <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 space-y-3">
                <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm">Escolha a condição de pagamento:</h3>
                    {budget.status !== 'approved' && <span className="text-red-500 text-sm font-bold">*</span>}
                </div>
                <BudgetPaymentSimulator
                    budget={budget}
                    onChange={budget.status === 'approved' ? undefined : handlePaymentChange}
                    readOnly={budget.status === 'approved'}
                    selectedPayment={selectedPayment}
                    onSelectPayment={budget.status === 'approved' ? undefined : setSelectedPayment}
                />
            </div>

            {/* Observações */}
            <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 space-y-2">
                <h3 className="font-semibold text-sm">Observações</h3>
                <Textarea
                    className="text-sm resize-none"
                    rows={4}
                    disabled={budget.status === 'approved'}
                    placeholder="Ex: Incluso portas com amortecimento, gavetas telescópicas..."
                    value={budget.observations || ""}
                    onChange={e => handleObsChange(e.target.value)}
                />
                {budget.status !== 'approved' && (
                    <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Salvo automaticamente
                        </span>
                    </div>
                )}
            </div>

            {/* Modal Compartilhar */}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Link do Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Compartilhe este link com o cliente para que ele possa visualizar, simular condições de pagamento e aprovar o orçamento.
                        </p>
                        <div className="flex gap-2">
                            <input
                                readOnly value={shareUrl}
                                className="flex-1 text-xs rounded-md border px-3 py-2 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-700"
                            />
                            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copiado!"); }}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs text-slate-400" onClick={handleRegenerateToken}>
                            <RotateCcw className="h-3 w-3 mr-1" />Regenerar link
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

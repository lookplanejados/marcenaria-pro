"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BudgetEnvironmentEditor } from "@/components/budget-environment-editor";
import { BudgetPaymentSimulator } from "@/components/budget-payment-simulator";
import { generateBudgetPDF } from "@/lib/generate-budget-pdf";
import { ShieldCheck, LockOpen, User, FileDown, Printer, Clock, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgData {
    name: string;
    company_name?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    owner_name?: string;
    logo_url?: string;
    budget_validity_days?: number;
}

interface PublicBudget {
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
    status: string;
    created_at: string;
    environments: any[];
    org: OrgData | null;
}

const STATUS_INFO: Record<string, { text: string; icon: any; bg: string; border: string; text_c: string }> = {
    draft:    { text: "Aguardando envio",         icon: Clock,        bg: "bg-slate-50",   border: "border-slate-200",  text_c: "text-slate-500"  },
    sent:     { text: "Aguardando sua aprovação",  icon: Send,         bg: "bg-indigo-50",  border: "border-indigo-200", text_c: "text-indigo-600" },
    approved: { text: "Contrato autorizado!",       icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200",text_c: "text-emerald-600"},
    rejected: { text: "Orçamento recusado",         icon: Clock,        bg: "bg-red-50",     border: "border-red-200",   text_c: "text-red-500"    },
};

export default function PublicBudgetPage() {
    const { token } = useParams<{ token: string }>();
    const [budget, setBudget]           = useState<PublicBudget | null>(null);
    const [loading, setLoading]         = useState(true);
    const [acting, setActing]           = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<'prazo' | 'avista' | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/budget/${token}`);
            if (!res.ok) throw new Error("Orçamento não encontrado.");
            const data = await res.json();
            setBudget(data);
            if (data.payment_type === 'prazo' || data.payment_type === 'avista') {
                setSelectedPayment(data.payment_type);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (status: 'approved' | 'sent') => {
        if (status === 'approved' && !selectedPayment) {
            toast.error("Selecione uma condição de pagamento antes de autorizar.");
            return;
        }
        setActing(true);
        try {
            await fetch(`/api/public/budget/${token}/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_status', status, chosen_payment_type: selectedPayment }),
            });
            setBudget(prev => prev ? { ...prev, status } : null);
            if (status === 'approved') toast.success("Contrato autorizado! A marcenaria entrará em contato.");
            else toast.success("Orçamento reaberto.");
        } finally {
            setActing(false);
        }
    };

    const handlePaymentChange = async (updates: any) => {
        if (!budget) return;
        setBudget(prev => prev ? { ...prev, ...updates } : null);
        await fetch(`/api/public/budget/${token}/update`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_payment', ...updates }),
        });
    };

    const reloadTotals = async () => {
        const res = await fetch(`/api/public/budget/${token}`);
        const data = await res.json();
        setBudget(prev => prev ? {
            ...prev,
            total_prazo:   data.total_prazo,
            total_avista:  data.total_avista,
            environments:  data.environments,
        } : null);
    };

    const handleDownloadPDF = async () => {
        if (!budget) return;
        setGeneratingPDF(true);
        try {
            const org = budget.org;
            const validityDays = org?.budget_validity_days || 30;
            const validity = new Date();
            validity.setDate(validity.getDate() + validityDays);

            const activeEnvs = budget.environments.map((env: any) => ({
                name: env.name,
                items: env.items.filter((i: any) => i.is_active).map((i: any) => ({
                    description:   i.description,
                    qty:           i.qty,
                    alt_cm:        i.alt_cm,
                    larg_cm:       i.larg_cm,
                    value_prazo:   i.value_prazo,
                    value_avista:  i.value_avista,
                    is_active:     true,
                })),
            })).filter((e: any) => e.items.length > 0);

            // Se cliente escolheu uma modalidade, mostra só ela no PDF
            const pdfPaymentType = selectedPayment ?? budget.payment_type;

            await generateBudgetPDF({
                orgName:              org?.name        || "Marcenaria",
                orgCompanyName:       org?.company_name,
                orgCNPJ:              org?.cnpj,
                orgPhone:             org?.phone,
                orgEmail:             org?.email,
                orgAddress:           org?.address,
                orgOwnerName:         org?.owner_name,
                orgLogoUrl:           org?.logo_url,
                validityDate:         validity.toLocaleDateString('pt-BR'),
                clientName:           budget.client_name,
                clientAddress:        budget.client_address,
                paymentType:          pdfPaymentType,
                totalPrazo:           budget.total_prazo,
                totalAvista:          budget.total_avista,
                prazoEntryPercent:    budget.prazo_entry_percent,
                prazoInstallments:    budget.prazo_installments,
                avistaDiscountPercent:budget.avista_discount_percent,
                avistaEntryPercent:   budget.avista_entry_percent,
                environments:         activeEnvs,
                observations:         budget.observations,
                responsibleName:      org?.owner_name,
            });
        } finally {
            setGeneratingPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-400 animate-pulse">Carregando orçamento...</p>
            </div>
        );
    }

    if (!budget) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-slate-700">Orçamento não encontrado</p>
                    <p className="text-slate-400 text-sm">Este link pode ter expirado ou sido removido.</p>
                </div>
            </div>
        );
    }

    const org        = budget.org;
    const statusInfo = STATUS_INFO[budget.status] || STATUS_INFO.sent;
    const StatusIcon = statusInfo.icon;

    const infoLine = [
        org?.address,
        org?.phone ? `Tel: ${org.phone}` : null,
        org?.email,
    ].filter(Boolean).join("  ·  ");

    const validityDays = org?.budget_validity_days || 30;
    const validityDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + validityDays);
        return d.toLocaleDateString('pt-BR');
    })();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">

            {/* ── CABEÇALHO — estilo PDF, fundo branco ─────────── */}
            <div className="bg-white dark:bg-zinc-900 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-5">
                    <div className="flex items-start gap-4">

                        {/* Logo */}
                        <div className="shrink-0">
                            {org?.logo_url ? (
                                <img src={org.logo_url} alt="Logo"
                                    className="h-20 w-20 object-contain rounded-xl" />
                            ) : (
                                <div className="h-20 w-20 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-4xl font-black">
                                    {(org?.name || "M").charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Dados da empresa */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                {org?.name || "Marcenaria"}
                            </h1>
                            {(org?.company_name || org?.cnpj) && (
                                <p className="text-slate-500 text-xs mt-1">
                                    {[org?.company_name, org?.cnpj ? `CNPJ: ${org.cnpj}` : null].filter(Boolean).join("  ·  ")}
                                </p>
                            )}
                            {infoLine && (
                                <p className="text-slate-400 text-[11px] mt-1.5 leading-snug">{infoLine}</p>
                            )}
                        </div>

                        {/* Validade + Responsável */}
                        <div className="shrink-0 text-right hidden sm:block">
                            <p className="text-xl font-black text-indigo-600 leading-tight">ORÇAMENTO</p>
                            <p className="text-xs text-slate-500 mt-1.5">Válido até: <span className="font-semibold text-slate-700 dark:text-slate-200">{validityDate}</span></p>
                            {org?.owner_name && (
                                <p className="text-xs text-slate-500 mt-0.5">Resp.: <span className="font-semibold text-slate-700 dark:text-slate-200">{org.owner_name}</span></p>
                            )}
                        </div>
                    </div>

                    {/* Mobile: validade + resp */}
                    <div className="mt-3 sm:hidden flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2">
                        <p className="text-xs text-slate-500">Válido até: <span className="font-medium">{validityDate}</span></p>
                        {org?.owner_name && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <User className="h-3 w-3" />Resp.: <span className="font-medium">{org.owner_name}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Separador inferior */}
                <div className="border-t border-slate-200 dark:border-zinc-800" />
            </div>

            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

                {/* Card do cliente */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex overflow-hidden">
                    {/* Label PARA */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border-r border-slate-200 dark:border-zinc-700 flex items-center justify-center px-4 shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">PARA</span>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{budget.client_name}</p>
                        {budget.client_address && (
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{budget.client_address}</p>
                        )}
                    </div>
                </div>

                {/* Status + Ações de download — entre cabeçalho e itens */}
                <div className={`rounded-xl border ${statusInfo.bg} ${statusInfo.border} px-4 py-3 flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 shrink-0 ${statusInfo.text_c}`} />
                        <p className={`text-sm font-semibold ${statusInfo.text_c}`}>{statusInfo.text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                            onClick={handleDownloadPDF} disabled={generatingPDF}>
                            <FileDown className="h-3.5 w-3.5" />
                            {generatingPDF ? "Gerando..." : "Baixar PDF"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                            title="Imprimir" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Banner contrato autorizado */}
                {budget.status === 'approved' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                        <div>
                            <p className="font-semibold text-emerald-700 text-sm">Contrato Autorizado!</p>
                            <p className="text-xs text-emerald-600 mt-0.5">A marcenaria entrará em contato para prosseguir.</p>
                        </div>
                    </div>
                )}

                {/* Ambientes */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-3">
                    <h2 className="font-semibold text-sm">Itens do Orçamento</h2>
                    <BudgetEnvironmentEditor
                        token={token}
                        readOnly={budget.status === 'approved'}
                        avistaDiscountPercent={budget.avista_discount_percent}
                        onTotalsChange={reloadTotals}
                    />
                </div>

                {/* Condições de Pagamento */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-3">
                    <div className="flex items-center gap-1.5">
                        <h2 className="font-semibold text-sm">Escolha a condição de pagamento:</h2>
                        {budget.status !== 'approved' && <span className="text-red-500 text-sm font-bold">*</span>}
                    </div>
                    <BudgetPaymentSimulator
                        budget={budget}
                        onChange={budget.status === 'approved' ? undefined : handlePaymentChange}
                        readOnly={budget.status === 'approved'}
                        hideInputs={true}
                        selectedPayment={selectedPayment}
                        onSelectPayment={budget.status === 'approved' ? undefined : setSelectedPayment}
                    />
                </div>

                {/* Observações */}
                {budget.observations && (
                    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-2">
                        <h2 className="font-semibold text-sm">Observações</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{budget.observations}</p>
                    </div>
                )}

                {/* Ação principal */}
                {budget.status !== 'approved' ? (
                    <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-base font-semibold"
                        onClick={() => handleAction('approved')}
                        disabled={acting}
                    >
                        <ShieldCheck className="h-5 w-5 mr-2" />Autorizar Contrato
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 h-11"
                        onClick={() => handleAction('sent')}
                        disabled={acting}
                    >
                        <LockOpen className="h-4 w-4 mr-2" />Reabrir Orçamento
                    </Button>
                )}

                <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 pb-4">
                    Orçamento gerado pelo sistema Marcenaria Pro
                </p>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BudgetEnvironmentEditor } from "@/components/budget-environment-editor";
import { BudgetPaymentSimulator } from "@/components/budget-payment-simulator";
import { generateBudgetPDF } from "@/lib/generate-budget-pdf";
import { ShieldCheck, LockOpen, User, FileDown, Printer, Clock, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
    const [acting, setActing]               = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<'prazo' | 'avista' | null>(null);
    const [alertOpen, setAlertOpen]         = useState(false);

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
            setAlertOpen(true);
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
            // Busca dados frescos da API para garantir que itens desmarcados
            // e totais recalculados estejam corretos no PDF
            const res = await fetch(`/api/public/budget/${token}`);
            const data = await res.json();

            const org = data.org || budget.org;
            const validityDays = org?.budget_validity_days || 30;
            const validity = new Date();
            validity.setDate(validity.getDate() + validityDays);

            const activeEnvs = (data.environments || []).map((env: any) => ({
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

            // Usa a condição que o cliente selecionou na tela; senão, a do orçamento
            const pdfPaymentType = selectedPayment ?? data.payment_type;

            await generateBudgetPDF({
                orgName:              org?.name         || "Marcenaria",
                orgCompanyName:       org?.company_name,
                orgCNPJ:              org?.cnpj,
                orgPhone:             org?.phone,
                orgEmail:             org?.email,
                orgAddress:           org?.address,
                orgOwnerName:         org?.owner_name,
                orgLogoUrl:           org?.logo_url,
                validityDate:         validity.toLocaleDateString('pt-BR'),
                clientName:           data.client_name,
                clientAddress:        data.client_address,
                paymentType:          pdfPaymentType,
                totalPrazo:           data.total_prazo,
                totalAvista:          data.total_avista,
                prazoEntryPercent:    data.prazo_entry_percent,
                prazoInstallments:    data.prazo_installments,
                avistaDiscountPercent:data.avista_discount_percent,
                avistaEntryPercent:   data.avista_entry_percent,
                environments:         activeEnvs,
                observations:         data.observations,
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

            <div className="max-w-2xl mx-auto px-4 pt-5 pb-1">

                {/* ── CABEÇALHO — card da empresa ─────────── */}
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-5">
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
                                    <p className="text-slate-500 text-sm mt-1 leading-snug">
                                        {[org?.company_name, org?.cnpj ? `CNPJ: ${org.cnpj}` : null].filter(Boolean).join("  ·  ")}
                                    </p>
                                )}
                                {infoLine && (
                                    <p className="text-slate-400 text-xs mt-1.5 leading-snug">{infoLine}</p>
                                )}
                            </div>

                            {/* Validade + Responsável — desktop */}
                            <div className="shrink-0 text-right hidden sm:block">
                                <p className="text-xl font-black text-indigo-600 leading-tight">ORÇAMENTO</p>
                                <p className="text-sm text-slate-500 mt-1.5">Válido até: <span className="font-semibold text-slate-700 dark:text-slate-200">{validityDate}</span></p>
                                {org?.owner_name && (
                                    <p className="text-sm text-slate-500 mt-0.5">Resp.: <span className="font-semibold text-slate-700 dark:text-slate-200">{org.owner_name}</span></p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile: validade + resp — dentro do card */}
                    <div className="sm:hidden border-t border-slate-100 dark:border-zinc-800 px-5 py-3 flex flex-wrap gap-x-5 gap-y-1.5 bg-slate-50 dark:bg-zinc-800/40">
                        <p className="text-sm text-slate-500">
                            Válido até: <span className="font-semibold text-slate-700 dark:text-slate-200">{validityDate}</span>
                        </p>
                        {org?.owner_name && (
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                <span>Resp.: <span className="font-semibold text-slate-700 dark:text-slate-200">{org.owner_name}</span></span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

                {/* Card do cliente */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex overflow-hidden">
                    {/* Label PARA */}
                    <div className="bg-indigo-600 flex items-center justify-center px-4 shrink-0">
                        <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">PARA</span>
                    </div>
                    <div className="px-4 py-4">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{budget.client_name}</p>
                        {budget.client_address && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{budget.client_address}</p>
                        )}
                    </div>
                </div>

                {/* Status + Ações de download — entre cabeçalho e itens */}
                <div className={`rounded-xl border ${statusInfo.bg} ${statusInfo.border} px-4 py-3`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <StatusIcon className={`h-5 w-5 shrink-0 ${statusInfo.text_c}`} />
                            <p className={`text-base font-bold ${statusInfo.text_c}`}>{statusInfo.text}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-9 text-sm gap-1.5 px-3"
                                onClick={handleDownloadPDF} disabled={generatingPDF}>
                                <FileDown className="h-4 w-4" />
                                {generatingPDF ? "Gerando..." : "Baixar PDF"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-9 w-9 p-0"
                                title="Imprimir" onClick={() => window.print()}>
                                <Printer className="h-4 w-4" />
                            </Button>
                        </div>
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
                    <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">Itens do Orçamento</h2>
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
                        <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">Escolha a condição de pagamento</h2>
                        {budget.status !== 'approved' && <span className="text-red-500 text-base font-bold">*</span>}
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
                        <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">Observações</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{budget.observations}</p>
                    </div>
                )}

                {/* Ação principal */}
                {budget.status !== 'approved' ? (
                    <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white h-14 text-lg font-bold rounded-xl shadow-md"
                        onClick={() => handleAction('approved')}
                        disabled={acting}
                    >
                        <ShieldCheck className="h-6 w-6 mr-2" />Autorizar Contrato
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 h-12 text-base font-semibold rounded-xl"
                        onClick={() => handleAction('sent')}
                        disabled={acting}
                    >
                        <LockOpen className="h-5 w-5 mr-2" />Reabrir Orçamento
                    </Button>
                )}

                <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 pb-4">
                    Orçamento gerado pelo sistema Marcenaria Pro
                </p>
            </div>

            {/* Alerta: condição de pagamento não selecionada */}
            <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
                <DialogContent className="sm:max-w-xs text-center">
                    <DialogHeader>
                        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-amber-500" />
                        </div>
                        <DialogTitle className="text-center text-base">Escolha uma condição de pagamento</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 -mt-1">
                        Selecione <strong>A Prazo</strong> ou <strong>À Vista</strong> antes de autorizar o contrato.
                    </p>
                    <DialogFooter className="sm:justify-center mt-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => setAlertOpen(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

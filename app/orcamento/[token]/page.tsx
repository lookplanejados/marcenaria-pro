"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BudgetEnvironmentEditor } from "@/components/budget-environment-editor";
import { BudgetPaymentSimulator } from "@/components/budget-payment-simulator";
import { ShieldCheck, LockOpen, MapPin, Phone, Mail, User } from "lucide-react";
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
    environments: any[];
    org: OrgData | null;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_MESSAGES: Record<string, { text: string; color: string }> = {
    draft:    { text: "Aguardando envio",        color: "text-slate-500" },
    sent:     { text: "Aguardando sua aprovação", color: "text-indigo-600" },
    approved: { text: "Orçamento aprovado ✓",     color: "text-emerald-600" },
    rejected: { text: "Orçamento recusado",        color: "text-red-500" },
};

export default function PublicBudgetPage() {
    const { token } = useParams<{ token: string }>();
    const [budget, setBudget] = useState<PublicBudget | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(false);
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
            total_prazo: data.total_prazo,
            total_avista: data.total_avista,
            environments: data.environments,
        } : null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-400 animate-pulse">Carregando orçamento...</p>
            </div>
        );
    }

    if (!budget) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-slate-700">Orçamento não encontrado</p>
                    <p className="text-slate-400 text-sm">Este link pode ter expirado ou sido removido.</p>
                </div>
            </div>
        );
    }

    const org = budget.org;
    const statusInfo = STATUS_MESSAGES[budget.status] || STATUS_MESSAGES.sent;

    // Linha de info: endereço | tel | email
    const infoLine = [
        org?.address,
        org?.phone   ? `Tel: ${org.phone}` : null,
        org?.email,
    ].filter(Boolean).join("  ·  ");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
            {/* ── CABEÇALHO — fundo branco, clean ─────────────────── */}
            <div className="bg-white dark:bg-zinc-900 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-5">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <div className="shrink-0">
                            {org?.logo_url ? (
                                <img
                                    src={org.logo_url} alt="Logo"
                                    className="h-16 w-16 object-contain rounded-lg"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-black">
                                    {(org?.name || "M").charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Dados da empresa */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                {org?.name || "Marcenaria"}
                            </h1>
                            {(org?.company_name || org?.cnpj) && (
                                <p className="text-slate-500 text-xs mt-0.5">
                                    {[org?.company_name, org?.cnpj ? `CNPJ: ${org.cnpj}` : null].filter(Boolean).join("  ·  ")}
                                </p>
                            )}
                            {infoLine && (
                                <p className="text-slate-400 text-[11px] mt-1 leading-snug">{infoLine}</p>
                            )}
                        </div>

                        {/* Responsável */}
                        {org?.owner_name && (
                            <div className="shrink-0 text-right hidden sm:block border-l border-slate-100 dark:border-zinc-700 pl-4">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Responsável</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight mt-0.5">{org.owner_name}</p>
                            </div>
                        )}
                    </div>

                    {org?.owner_name && (
                        <div className="mt-2.5 flex items-center gap-1.5 sm:hidden border-t border-slate-100 dark:border-zinc-800 pt-2">
                            <User className="h-3 w-3 text-slate-400" />
                            <p className="text-xs text-slate-500">Resp.: {org.owner_name}</p>
                        </div>
                    )}
                </div>

                {/* Linha separadora */}
                <div className="border-t border-slate-200 dark:border-zinc-800" />

                {/* Faixa do cliente */}
                <div className="bg-slate-50 dark:bg-zinc-950 px-5 py-3">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Para</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{budget.client_name}</p>
                            {budget.client_address && (
                                <p className="text-slate-500 text-[11px] mt-0.5">{budget.client_address}</p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs font-mono text-indigo-500 font-semibold">{budget.budget_number}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${statusInfo.color}`}>{statusInfo.text}</p>
                        </div>
                    </div>
                </div>

                {/* Linha separadora inferior */}
                <div className="border-t border-slate-200 dark:border-zinc-800" />
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                {/* Banner contrato autorizado */}
                {budget.status === 'approved' && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-4 flex items-center gap-3">
                        <ShieldCheck className="h-7 w-7 text-emerald-500 shrink-0" />
                        <div>
                            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Contrato Autorizado!</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">A marcenaria entrará em contato para prosseguir.</p>
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

                {/* Ações */}
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

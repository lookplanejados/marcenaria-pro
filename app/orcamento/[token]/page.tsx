"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BudgetEnvironmentEditor } from "@/components/budget-environment-editor";
import { BudgetPaymentSimulator } from "@/components/budget-payment-simulator";
import { CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/public/budget/${token}`);
            if (!res.ok) throw new Error("Orçamento não encontrado.");
            const data = await res.json();
            setBudget(data);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (status: 'approved' | 'rejected') => {
        setActing(true);
        try {
            await fetch(`/api/public/budget/${token}/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_status', status }),
            });
            setBudget(prev => prev ? { ...prev, status } : null);
            toast.success(status === 'approved' ? "Orçamento aceito! A marcenaria entrará em contato." : "Orçamento recusado.");
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

    const statusInfo = STATUS_MESSAGES[budget.status] || STATUS_MESSAGES.sent;
    const isApprovedOrRejected = budget.status === 'approved' || budget.status === 'rejected';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-indigo-600 text-white py-5 px-4">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-tight">Marcenaria Pro</p>
                        <p className="text-indigo-200 text-xs">Orçamento Digital</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                {/* Info do cliente */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h1 className="text-xl font-bold">{budget.client_name}</h1>
                            {budget.client_address && (
                                <p className="text-sm text-slate-500">{budget.client_address}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">{budget.budget_number}</p>
                        </div>
                        <p className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.text}</p>
                    </div>

                    {/* Totais */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/10 p-3 text-center">
                            <p className="text-[10px] text-indigo-500 font-semibold">TOTAL A PRAZO</p>
                            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{fmt(budget.total_prazo)}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
                            <p className="text-[10px] text-emerald-600 font-semibold">TOTAL À VISTA</p>
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(budget.total_avista)}</p>
                        </div>
                    </div>
                </div>

                {/* Ambientes */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-3">
                    <div>
                        <h2 className="font-semibold text-sm">Itens do Orçamento</h2>
                        {!isApprovedOrRejected && (
                            <p className="text-xs text-slate-400 mt-0.5">Você pode marcar/desmarcar itens e ajustar quantidades.</p>
                        )}
                    </div>
                    <BudgetEnvironmentEditor
                        token={token}
                        readOnly={isApprovedOrRejected}
                        onTotalsChange={reloadTotals}
                    />
                </div>

                {/* Condições de Pagamento */}
                <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 space-y-3">
                    <div>
                        <h2 className="font-semibold text-sm">Simular Condições de Pagamento</h2>
                        {!isApprovedOrRejected && (
                            <p className="text-xs text-slate-400 mt-0.5">Ajuste entrada e parcelas para simular.</p>
                        )}
                    </div>
                    <BudgetPaymentSimulator
                        budget={budget}
                        onChange={isApprovedOrRejected ? undefined : handlePaymentChange}
                        readOnly={isApprovedOrRejected}
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
                {!isApprovedOrRejected && (
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                            onClick={() => handleAction('approved')}
                            disabled={acting}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />Aceitar Orçamento
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleAction('rejected')}
                            disabled={acting}
                        >
                            <XCircle className="h-4 w-4 mr-2" />Recusar
                        </Button>
                    </div>
                )}

                {budget.status === 'approved' && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">Orçamento Aceito!</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">A marcenaria entrará em contato para prosseguir com o contrato.</p>
                    </div>
                )}

                <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 pb-4">
                    Orçamento gerado pelo sistema Marcenaria Pro
                </p>
            </div>
        </div>
    );
}

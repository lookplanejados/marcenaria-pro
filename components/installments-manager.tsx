"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/services/authService";
import { Plus, Check, Calendar, DollarSign } from "lucide-react";

type Installment = {
    id: string;
    sale_id: string;
    description: string;
    amount: number;
    due_date: string;
    paid: boolean;
    paid_at: string | null;
};

interface InstallmentsManagerProps {
    saleId: string;
    totalValue: number;
}

export function InstallmentsManager({ saleId, totalValue }: InstallmentsManagerProps) {
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // Form
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");

    const fetchInstallments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("installments")
                .select("*")
                .eq("sale_id", saleId)
                .order("due_date", { ascending: true });

            if (error) throw error;
            setInstallments(data as Installment[]);
        } catch (err: any) {
            toast.error("Erro ao carregar parcelas", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (saleId) fetchInstallments();
    }, [saleId]);

    const handleAdd = async () => {
        try {
            const profile = await AuthService.getProfile();
            if (!profile?.organization_id) throw new Error("Organização não encontrada.");

            const val = parseFloat(amount.replace(/\D/g, "")) / 100 || 0;

            const { error } = await supabase.from("installments").insert({
                organization_id: profile.organization_id,
                sale_id: saleId,
                description: desc || "Parcela",
                amount: val,
                due_date: dueDate,
            });

            if (error) throw error;

            toast.success("Parcela adicionada!");
            setShowAdd(false);
            setDesc("");
            setAmount("");
            setDueDate("");
            fetchInstallments();
        } catch (err: any) {
            toast.error("Erro", { description: err.message });
        }
    };

    const togglePaid = async (inst: Installment) => {
        const newPaid = !inst.paid;
        const { error } = await supabase
            .from("installments")
            .update({ paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null })
            .eq("id", inst.id);

        if (error) {
            toast.error("Erro ao atualizar");
            return;
        }

        // Atualiza received_value na venda
        const { data: allInstallments } = await supabase
            .from("installments")
            .select("amount, paid")
            .eq("sale_id", saleId);

        if (allInstallments) {
            const totalPaid = allInstallments
                .filter((i: any) => i.paid || (i.id === inst.id && newPaid))
                .reduce((s: number, i: any) => s + (i.amount || 0), 0);

            await supabase.from("sales").update({ received_value: totalPaid }).eq("id", saleId);
        }

        fetchInstallments();
        toast.success(newPaid ? "Parcela marcada como paga!" : "Parcela desmarcada");
    };

    const formatBRL = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    const handleFormatAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, "");
        if (!raw) return setAmount("");
        const num = parseFloat(raw) / 100;
        setAmount(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num));
    };

    const totalInstallments = installments.reduce((s, i) => s + i.amount, 0);
    const totalPaid = installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const remaining = totalValue - totalInstallments;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <h3 className="font-semibold text-sm">Parcelas de Recebimento</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" /> Parcela
                </Button>
            </div>

            {/* Resumo rápido */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-zinc-900 rounded-md p-2">
                    <p className="text-[10px] text-slate-400">Total Parcelas</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatBRL(totalInstallments)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-md p-2">
                    <p className="text-[10px] text-emerald-600">Recebido</p>
                    <p className="text-xs font-bold text-emerald-600">{formatBRL(totalPaid)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-md p-2">
                    <p className="text-[10px] text-amber-600">Falta Parcelar</p>
                    <p className="text-xs font-bold text-amber-600">{formatBRL(remaining > 0 ? remaining : 0)}</p>
                </div>
            </div>

            {/* Form de Adicionar */}
            {showAdd && (
                <div className="bg-slate-50 dark:bg-zinc-900 rounded-lg p-3 space-y-3 border border-slate-100 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input className="h-8 text-xs" placeholder="Ex: Sinal" value={desc} onChange={(e) => setDesc(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Valor</Label>
                            <Input className="h-8 text-xs" placeholder="R$ 0,00" value={amount} onChange={handleFormatAmount} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Vencimento</Label>
                        <Input className="h-8 text-xs" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd} disabled={!amount || !dueDate}>
                        Adicionar
                    </Button>
                </div>
            )}

            {/* Lista de Parcelas */}
            {loading ? (
                <p className="text-xs text-slate-400 animate-pulse">Carregando...</p>
            ) : installments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Nenhuma parcela cadastrada.</p>
            ) : (
                <div className="space-y-2">
                    {installments.map((inst) => (
                        <div
                            key={inst.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-xs ${inst.paid
                                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                                    : "bg-white border-slate-100 dark:bg-zinc-950 dark:border-zinc-800"
                                }`}
                        >
                            <button
                                onClick={() => togglePaid(inst)}
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${inst.paid
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-slate-300 dark:border-zinc-600 hover:border-indigo-400"
                                    }`}
                            >
                                {inst.paid && <Check className="h-3 w-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${inst.paid ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>
                                    {inst.description}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Venc: {new Date(inst.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                            <p className={`font-bold shrink-0 ${inst.paid ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"}`}>
                                {formatBRL(inst.amount)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

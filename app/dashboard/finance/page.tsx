"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AuthService } from "@/services/authService";
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";
import { FinanceCharts } from "@/components/finance-charts";

type Expense = {
    id: string;
    description: string;
    amount: number;
    expense_type: "Fixed" | "Direct";
    date_incurred: string;
    sale_id: string | null;
    sales?: { client_name: string } | null;
};

type Sale = {
    id: string;
    client_name: string;
    total_value: number;
    received_value: number;
    status: string;
};

export default function FinancePage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Form State
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [expenseType, setExpenseType] = useState<"Fixed" | "Direct">("Fixed");
    const [saleId, setSaleId] = useState<string>("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [expRes, salesRes] = await Promise.all([
                supabase.from("expenses").select("*, sales(client_name)").order("date_incurred", { ascending: false }),
                supabase.from("sales").select("*").order("created_at", { ascending: false }),
            ]);

            if (expRes.error) throw expRes.error;
            if (salesRes.error) throw salesRes.error;

            setExpenses(expRes.data as Expense[]);
            setSales(salesRes.data as Sale[]);
        } catch (err: any) {
            toast.error("Erro ao carregar dados financeiros", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddExpense = async () => {
        try {
            setFormLoading(true);
            const profile = await AuthService.getProfile();
            if (!profile?.organization_id) throw new Error("Organização não encontrada.");

            const val = parseFloat(amount.replace(/\D/g, "")) / 100 || 0;

            const { error } = await supabase.from("expenses").insert({
                organization_id: profile.organization_id,
                description,
                amount: val,
                expense_type: expenseType,
                sale_id: saleId || null,
                date_incurred: new Date().toISOString().split("T")[0],
            });

            if (error) throw error;

            toast.success("Despesa registrada!");
            setDialogOpen(false);
            setDescription("");
            setAmount("");
            setSaleId("");
            fetchData();
        } catch (err: any) {
            toast.error("Erro ao salvar despesa", { description: err.message });
        } finally {
            setFormLoading(false);
        }
    };

    const formatBRL = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    const handleFormatValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, "");
        if (!raw) return setAmount("");
        const num = parseFloat(raw) / 100;
        setAmount(
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
        );
    };

    // KPIs
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_value || 0), 0);
    const totalReceived = sales.reduce((sum, s) => sum + (s.received_value || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const fixedExpenses = expenses.filter((e) => e.expense_type === "Fixed").reduce((s, e) => s + e.amount, 0);
    const directExpenses = expenses.filter((e) => e.expense_type === "Direct").reduce((s, e) => s + e.amount, 0);
    const netProfit = totalReceived - totalExpenses;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visão geral de receitas, despesas e lucro líquido</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="h-4 w-4 mr-2" /> Nova Despesa
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Despesa</DialogTitle>
                            <DialogDescription>Lance uma despesa fixa ou vinculada a um projeto.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input placeholder="Ex: Aluguel do galpão" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor</Label>
                                <Input placeholder="R$ 0,00" value={amount} onChange={handleFormatValue} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={expenseType} onValueChange={(v: any) => setExpenseType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Fixed">Fixa (Geral)</SelectItem>
                                        <SelectItem value="Direct">Direta (Projeto)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {expenseType === "Direct" && (
                                <div className="space-y-2">
                                    <Label>Vincular a Projeto (Opcional)</Label>
                                    <Select value={saleId} onValueChange={setSaleId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                                        <SelectContent>
                                            {sales.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.client_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddExpense} disabled={formLoading || !description || !amount}>
                                {formLoading ? "Salvando..." : "Registrar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><DollarSign className="h-4 w-4 text-blue-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Faturamento Total</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatBRL(totalRevenue)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><ArrowUpCircle className="h-4 w-4 text-emerald-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Já Recebido</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{formatBRL(totalReceived)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><ArrowDownCircle className="h-4 w-4 text-red-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Total Despesas</span>
                    </div>
                    <p className="text-lg font-bold text-red-500">{formatBRL(totalExpenses)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><Wallet className="h-4 w-4 text-indigo-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Lucro Líquido</span>
                    </div>
                    <p className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatBRL(netProfit)}</p>
                </div>
            </div>

            {/* Split: Fixas vs Diretas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Despesas Fixas</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Aluguel, Energia, Internet, Funcionários</p>
                    <p className="text-2xl font-bold text-orange-500">{formatBRL(fixedExpenses)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Custos Diretos (Vinculados)</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Insumos e refeições de projetos específicos</p>
                    <p className="text-2xl font-bold text-cyan-500">{formatBRL(directExpenses)}</p>
                </div>
            </div>

            {/* Gráficos Financeiros */}
            <FinanceCharts sales={sales} expenses={expenses} />

            {/* Tabela de Despesas */}
            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-black/5 dark:border-white/5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Histórico de Despesas</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Carregando...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhuma despesa registrada ainda. Clique em "Nova Despesa".</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Projeto</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map((exp) => (
                                <TableRow key={exp.id}>
                                    <TableCell className="font-medium">{exp.description}</TableCell>
                                    <TableCell>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${exp.expense_type === "Fixed" ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20" : "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20"}`}>
                                            {exp.expense_type === "Fixed" ? "Fixa" : "Direta"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">{exp.sales?.client_name || "—"}</TableCell>
                                    <TableCell className="text-slate-500 text-sm">{new Date(exp.date_incurred).toLocaleDateString("pt-BR")}</TableCell>
                                    <TableCell className="text-right font-semibold text-red-500">{formatBRL(exp.amount)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={async () => {
                                                const { error } = await supabase.from("expenses").delete().eq("id", exp.id);
                                                if (error) { toast.error("Erro ao excluir"); return; }
                                                toast.success("Despesa excluída");
                                                fetchData();
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

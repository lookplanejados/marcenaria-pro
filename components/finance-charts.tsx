"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

interface FinanceChartsProps {
    sales: Array<{
        id: string;
        client_name: string;
        total_value: number;
        received_value: number;
        status: string;
    }>;
    expenses: Array<{
        id: string;
        description: string;
        amount: number;
        expense_type: "Fixed" | "Direct";
        date_incurred: string;
    }>;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function FinanceCharts({ sales, expenses }: FinanceChartsProps) {
    const formatBRL = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    // Dados para gráfico de barras: Receita vs Custo por projeto
    const projectChartData = sales.map((s) => {
        const projectExpenses = expenses
            .filter((e) => e.expense_type === "Direct")
            .reduce((sum, e) => sum + e.amount, 0);

        return {
            name: s.client_name.length > 20 ? s.client_name.substring(0, 20) + "..." : s.client_name,
            receita: s.total_value,
            recebido: s.received_value,
        };
    });

    // Dados para gráfico de pizza: Status dos projetos
    const statusCount: Record<string, number> = {};
    sales.forEach((s) => {
        statusCount[s.status] = (statusCount[s.status] || 0) + 1;
    });
    const statusChartData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    // Dados para gráfico de pizza: Despesas fixas vs diretas
    const fixedTotal = expenses.filter((e) => e.expense_type === "Fixed").reduce((s, e) => s + e.amount, 0);
    const directTotal = expenses.filter((e) => e.expense_type === "Direct").reduce((s, e) => s + e.amount, 0);
    const expenseTypeData = [
        { name: "Fixas", value: fixedTotal },
        { name: "Diretas", value: directTotal },
    ].filter((d) => d.value > 0);

    // Dados para gráfico de área: Fluxo de caixa ao longo do tempo
    const dateMap = new Map<string, { receita: number; despesa: number }>();

    sales.forEach((s) => {
        const date = new Date().toLocaleDateString("pt-BR");
        const entry = dateMap.get(date) || { receita: 0, despesa: 0 };
        entry.receita += s.received_value;
        dateMap.set(date, entry);
    });

    expenses.forEach((e) => {
        const date = new Date(e.date_incurred).toLocaleDateString("pt-BR");
        const entry = dateMap.get(date) || { receita: 0, despesa: 0 };
        entry.despesa += e.amount;
        dateMap.set(date, entry);
    });

    const cashFlowData = Array.from(dateMap.entries())
        .map(([date, values]) => ({
            date,
            receita: values.receita,
            despesa: values.despesa,
            saldo: values.receita - values.despesa,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const hasData = sales.length > 0 || expenses.length > 0;

    if (!hasData) {
        return (
            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-8 shadow-sm text-center">
                <p className="text-slate-400">Adicione projetos e despesas para visualizar os gráficos.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Receita por Projeto */}
            {sales.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-4">Receita por Projeto</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={projectChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: any) => formatBRL(value)} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="receita" name="Valor Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Status dos Projetos */}
            {statusChartData.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-4">Projetos por Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                label={({ name, value }: any) => `${name} (${value})`}
                            >
                                {statusChartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Composição de Despesas */}
            {expenseTypeData.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-4">Composição de Despesas</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={expenseTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                label={({ name, value }: any) => `${name}: ${formatBRL(value)}`}
                            >
                                <Cell fill="#f97316" />
                                <Cell fill="#06b6d4" />
                            </Pie>
                            <Tooltip formatter={(value: any) => formatBRL(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Fluxo de Caixa */}
            {cashFlowData.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-5 shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-4">Fluxo de Caixa</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={cashFlowData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: any) => formatBRL(value)} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" fill="#10b98133" />
                            <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" fill="#ef444433" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

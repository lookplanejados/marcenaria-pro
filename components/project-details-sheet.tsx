"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Save, Wallet, Percent, Truck, PackageOpen, Trash2, FileText, AlertTriangle } from "lucide-react";
import { generateContractPDF } from "@/lib/generate-contract-pdf";
import { InstallmentsManager } from "./installments-manager";
import { StockLinker } from "./stock-linker";
import { useRBAC } from "./rbac-provider";

export type SaleProject = {
    id: string;
    client_name: string;
    status: 'Orçamento' | 'Produção' | 'Montagem' | 'Concluído';
    total_value: number;
    received_value: number;
    raw_material_cost: number;
    freight_cost: number;
    commission_seller_percent: number;
    commission_carpenter_percent: number;
    rt_architect_percent: number;
};

interface ProjectDetailsSheetProps {
    project: SaleProject | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: () => void;
}

export function ProjectDetailsSheet({ project, open, onOpenChange, onUpdated }: ProjectDetailsSheetProps) {
    const { isCarpenter } = useRBAC();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<SaleProject>>({});

    useEffect(() => {
        if (project && open) {
            setFormData({
                total_value: project.total_value,
                received_value: project.received_value,
                raw_material_cost: project.raw_material_cost,
                freight_cost: project.freight_cost,
                commission_seller_percent: project.commission_seller_percent,
                commission_carpenter_percent: project.commission_carpenter_percent,
                rt_architect_percent: project.rt_architect_percent,
            });
        }
    }, [project, open]);

    const handleChange = (field: keyof SaleProject, value: string) => {
        // Apenas extrai números para salvar no formData
        const rawVal = parseFloat(value.replace(/\D/g, "")) / 100 || 0;
        setFormData(prev => ({ ...prev, [field]: rawVal }));
    };

    const handlePercentChange = (field: keyof SaleProject, value: string) => {
        const rawVal = parseFloat(value) || 0;
        setFormData(prev => ({ ...prev, [field]: rawVal }));
    };

    const handleSave = async () => {
        if (!project) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update(formData)
                .eq('id', project.id);

            if (error) throw error;

            toast.success("Projeto atualizado", { description: "As informações financeiras foram salvas." });
            onUpdated();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Erro ao salvar", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const formatBRL = (value: number = 0) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    // Calcula o lucro em tempo real no form
    const currentTotal = formData.total_value || 0;
    const currentCosts = (formData.raw_material_cost || 0) + (formData.freight_cost || 0);
    const currentCommissionsPercent = (formData.commission_seller_percent || 0) + (formData.commission_carpenter_percent || 0) + (formData.rt_architect_percent || 0);
    const currentCommissionsValue = (currentTotal * currentCommissionsPercent) / 100;
    const currentProfit = currentTotal - currentCosts - currentCommissionsValue;
    const marginPercent = currentTotal > 0 ? ((currentProfit / currentTotal) * 100).toFixed(0) : "0";

    if (!project) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl">{project.client_name}</SheetTitle>
                    <SheetDescription>
                        Edite os valores financeiros, custos de insumo e margens do projeto.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Card Resumo Lucro - Apenas Admins/Owners */}
                    {!isCarpenter && (
                        <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-slate-500 mb-2">Resumo em Tempo Real</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400">Lucro Bruto</p>
                                    <p className={`text-lg font-bold ${currentProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {formatBRL(currentProfit)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Margem</p>
                                    <p className={`text-lg font-bold ${parseFloat(marginPercent) >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {marginPercent}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inputs Financeiros - Apenas Admins/Owners */}
                    {!isCarpenter && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <Wallet className="h-4 w-4 text-indigo-500" />
                                <h3 className="font-semibold text-sm">Receitas e Pagamentos</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor Total (Venda)</Label>
                                    <Input
                                        value={formatBRL(formData.total_value)}
                                        onChange={(e) => handleChange('total_value', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Já Recebido (Sinal)</Label>
                                    <Input
                                        value={formatBRL(formData.received_value)}
                                        onChange={(e) => handleChange('received_value', e.target.value)}
                                        className="border-emerald-200 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-b pb-2 mt-6">
                                <PackageOpen className="h-4 w-4 text-indigo-500" />
                                <h3 className="font-semibold text-sm">Custos Diretos (Insumos)</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Material (MDF, Ferragem)</Label>
                                    <Input
                                        value={formatBRL(formData.raw_material_cost)}
                                        onChange={(e) => handleChange('raw_material_cost', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frete / Refeições</Label>
                                    <Input
                                        value={formatBRL(formData.freight_cost)}
                                        onChange={(e) => handleChange('freight_cost', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-b pb-2 mt-6">
                                <Percent className="h-4 w-4 text-indigo-500" />
                                <h3 className="font-semibold text-sm">Comissões e RT (%)</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">Marceneiro</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={formData.commission_carpenter_percent}
                                            onChange={(e) => handlePercentChange('commission_carpenter_percent', e.target.value)}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Vendedor</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={formData.commission_seller_percent}
                                            onChange={(e) => handlePercentChange('commission_seller_percent', e.target.value)}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Arquiteto</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={formData.rt_architect_percent}
                                            onChange={(e) => handlePercentChange('rt_architect_percent', e.target.value)}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Divisor */}
                    {!isCarpenter && <div className="border-t border-slate-200 dark:border-zinc-800" />}

                    {/* Parcelas de Recebimento */}
                    {!isCarpenter && <InstallmentsManager saleId={project.id} totalValue={formData.total_value || 0} />}

                    {/* Divisor */}
                    {!isCarpenter && <div className="border-t border-slate-200 dark:border-zinc-800" />}

                    {/* Materiais do Estoque */}
                    <StockLinker saleId={project.id} projectName={project.client_name} />

                    <div className="pt-6 space-y-3">
                        {!isCarpenter && (
                            <Button onClick={handleSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        )}
                        {!isCarpenter && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    generateContractPDF({
                                        clientName: project.client_name,
                                        totalValue: formData.total_value || 0,
                                        receivedValue: formData.received_value || 0,
                                        rawMaterialCost: formData.raw_material_cost || 0,
                                        freightCost: formData.freight_cost || 0,
                                        commissionCarpenter: formData.commission_carpenter_percent || 0,
                                        commissionSeller: formData.commission_seller_percent || 0,
                                        rtArchitect: formData.rt_architect_percent || 0,
                                        status: project.status,
                                    });
                                    toast.success("PDF gerado!", { description: "O contrato foi baixado." });
                                }}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Contrato PDF
                            </Button>
                        )}
                        {!isCarpenter && (
                            <Button
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
                                onClick={async () => {
                                    if (!confirm(`Tem certeza que deseja excluir "${project.client_name}"? Esta ação não pode ser desfeita.`)) return;
                                    const { error } = await supabase.from('sales').delete().eq('id', project.id);
                                    if (error) { toast.error('Erro ao excluir', { description: error.message }); return; }
                                    toast.success('Projeto excluído com sucesso');
                                    onUpdated();
                                    onOpenChange(false);
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Projeto
                            </Button>
                        )}

                        {isCarpenter && (
                            <Button
                                variant="outline"
                                className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900 dark:hover:bg-amber-900/20 mt-4"
                                onClick={() => {
                                    toast.success('Gestor notificado com sucesso!', {
                                        description: 'O proprietário foi avisado sobre a falta de material/insumo para este projeto.'
                                    });
                                }}
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Relatar Falta de Material / Problema
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

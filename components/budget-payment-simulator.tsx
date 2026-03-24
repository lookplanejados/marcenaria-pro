"use client";

import { useState, useEffect } from "react";
import { CreditCard, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Budget {
    total_prazo: number;
    total_avista: number;
    payment_type: 'prazo' | 'avista' | 'both';
    prazo_entry_percent: number;
    prazo_installments: number;
    avista_discount_percent: number;
    avista_entry_percent: number;
}

interface Props {
    budget: Budget;
    onChange?: (updates: Partial<Budget>) => void;
    readOnly?: boolean;
    hideInputs?: boolean;
    selectedPayment?: 'prazo' | 'avista' | null;
    onSelectPayment?: (type: 'prazo' | 'avista') => void;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function BudgetPaymentSimulator({ budget, onChange, readOnly = false, hideInputs = false, selectedPayment, onSelectPayment }: Props) {
    const [local, setLocal] = useState({ ...budget });

    useEffect(() => { setLocal({ ...budget }); }, [budget]);

    const update = (field: keyof Budget, value: any) => {
        const next = { ...local, [field]: value };
        setLocal(next);
        onChange?.({ [field]: value });
    };

    const showPrazo  = local.payment_type === 'prazo'  || local.payment_type === 'both';
    const showAvista = local.payment_type === 'avista' || local.payment_type === 'both';

    const prazoEntry       = local.total_prazo * (local.prazo_entry_percent / 100);
    const prazoRemainder   = local.total_prazo - prazoEntry;
    const prazoInstallment = local.prazo_installments > 0
        ? prazoRemainder / local.prazo_installments : 0;

    const avistaTotal     = local.total_prazo * (1 - local.avista_discount_percent / 100);
    const avistaEntry     = avistaTotal * (local.avista_entry_percent / 100);
    const avistaRemainder = avistaTotal - avistaEntry;

    const isSelectable = !!onSelectPayment;

    // Modo compacto (lado a lado) para página pública
    if (hideInputs) {
        return (
            <div className={`${showPrazo && showAvista ? 'grid grid-cols-2 gap-3' : ''}`}>
                {showPrazo && (
                    <div
                        onClick={() => onSelectPayment?.('prazo')}
                        className={`rounded-xl border overflow-hidden transition-all ${isSelectable ? 'cursor-pointer active:scale-[0.98]' : ''} ${
                            selectedPayment === 'prazo'
                                ? 'border-indigo-400 ring-2 ring-indigo-300'
                                : isSelectable
                                    ? 'border-slate-200 hover:border-indigo-300'
                                    : 'border-indigo-200'
                        }`}
                    >
                        {/* Header do card */}
                        <div className="bg-indigo-600 px-3 py-2.5 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-semibold text-indigo-200 uppercase tracking-widest leading-none mb-0.5">Cartão de Crédito</p>
                                <p className="text-sm font-black text-white leading-tight">A Prazo</p>
                            </div>
                            {isSelectable && (
                                <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                    selectedPayment === 'prazo' ? 'border-white bg-white' : 'border-indigo-300'
                                }`}>
                                    {selectedPayment === 'prazo' && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                                </div>
                            )}
                        </div>
                        {/* Valor */}
                        <div className="bg-white px-3 py-4 text-center space-y-2">
                            <p className="text-2xl font-black text-slate-800 leading-none">{fmt(local.total_prazo)}</p>
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                                <p className="text-xs text-slate-500 leading-snug">
                                    Entrada <span className="font-bold text-slate-700">{fmt(prazoEntry)}</span>
                                    <span className="text-slate-400"> ({local.prazo_entry_percent}%)</span>
                                </p>
                                <p className="text-base font-black text-indigo-600 leading-none">
                                    {local.prazo_installments}x {fmt(prazoInstallment)}
                                </p>
                                <p className="text-[11px] text-slate-400">saldo restante parcelado</p>
                            </div>
                        </div>
                    </div>
                )}

                {showAvista && (
                    <div
                        onClick={() => onSelectPayment?.('avista')}
                        className={`rounded-xl border overflow-hidden transition-all ${isSelectable ? 'cursor-pointer active:scale-[0.98]' : ''} ${
                            selectedPayment === 'avista'
                                ? 'border-emerald-400 ring-2 ring-emerald-300'
                                : isSelectable
                                    ? 'border-slate-200 hover:border-emerald-300'
                                    : 'border-emerald-200'
                        }`}
                    >
                        {/* Header do card */}
                        <div className="bg-emerald-600 px-3 py-2.5 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-semibold text-emerald-200 uppercase tracking-widest leading-none mb-0.5">PIX / Dinheiro</p>
                                <p className="text-sm font-black text-white leading-tight">À Vista</p>
                            </div>
                            {isSelectable && (
                                <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                    selectedPayment === 'avista' ? 'border-white bg-white' : 'border-emerald-300'
                                }`}>
                                    {selectedPayment === 'avista' && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                                </div>
                            )}
                        </div>
                        {/* Valor */}
                        <div className="bg-white px-3 py-4 text-center space-y-2">
                            <div>
                                <p className="text-2xl font-black text-slate-800 leading-none">{fmt(avistaTotal)}</p>
                                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{local.avista_discount_percent}% de desconto</p>
                            </div>
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                                <p className="text-xs text-slate-500 leading-snug">
                                    Entrada <span className="font-bold text-slate-700">{fmt(avistaEntry)}</span>
                                    <span className="text-slate-400"> ({local.avista_entry_percent}%)</span>
                                </p>
                                <p className="text-base font-black text-emerald-600 leading-none">
                                    Saldo {fmt(avistaRemainder)}
                                </p>
                                <p className="text-[11px] text-slate-400">na entrega via PIX</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Modo completo (dashboard)
    return (
        <div className="space-y-3">
            {showPrazo && (
                <div
                    className={`rounded-xl border p-4 space-y-3 transition-all ${
                        isSelectable ? 'cursor-pointer select-none' : ''
                    } ${
                        selectedPayment === 'prazo'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-400'
                            : isSelectable
                                ? 'border-slate-200 dark:border-zinc-700 hover:border-indigo-300 bg-white dark:bg-zinc-900'
                                : 'border-indigo-100 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-900/30'
                    }`}
                    onClick={() => onSelectPayment?.('prazo')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-500" />
                            <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">A Prazo — Cartão de Crédito</span>
                        </div>
                        {isSelectable && (
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                selectedPayment === 'prazo' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-zinc-600'
                            }`}>
                                {selectedPayment === 'prazo' && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-slate-500">Total:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(local.total_prazo)}</span>

                        <span className="text-slate-500">Entrada ({local.prazo_entry_percent}%):</span>
                        <span className="font-semibold text-indigo-600">{fmt(prazoEntry)}</span>

                        <span className="text-slate-500">Parcelas:</span>
                        <span className="font-semibold">{local.prazo_installments}x de {fmt(prazoInstallment)}</span>
                    </div>

                    {!readOnly && !hideInputs && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400">Entrada (%)</Label>
                                <Input
                                    type="number" min={0} max={100} className="h-7 text-xs"
                                    value={local.prazo_entry_percent}
                                    onChange={e => update('prazo_entry_percent', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400">Nº de Parcelas</Label>
                                <Input
                                    type="number" min={1} max={60} className="h-7 text-xs"
                                    value={local.prazo_installments}
                                    onChange={e => update('prazo_installments', parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showAvista && (
                <div
                    className={`rounded-xl border p-4 space-y-3 transition-all ${
                        isSelectable ? 'cursor-pointer select-none' : ''
                    } ${
                        selectedPayment === 'avista'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-400'
                            : isSelectable
                                ? 'border-slate-200 dark:border-zinc-700 hover:border-emerald-300 bg-white dark:bg-zinc-900'
                                : 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                    }`}
                    onClick={() => onSelectPayment?.('avista')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-emerald-600" />
                            <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">À Vista — PIX</span>
                        </div>
                        {isSelectable && (
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                selectedPayment === 'avista' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-zinc-600'
                            }`}>
                                {selectedPayment === 'avista' && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-slate-500">Total ({local.avista_discount_percent}% desc.):</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{fmt(avistaTotal)}</span>

                        <span className="text-slate-500">Entrada ({local.avista_entry_percent}%):</span>
                        <span className="font-semibold text-emerald-600">{fmt(avistaEntry)}</span>

                        <span className="text-slate-500">Saldo na entrega:</span>
                        <span className="font-semibold">{fmt(avistaRemainder)}</span>
                    </div>

                    {!readOnly && !hideInputs && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400">Desconto (%)</Label>
                                <Input
                                    type="number" min={0} max={100} className="h-7 text-xs"
                                    value={local.avista_discount_percent}
                                    onChange={e => update('avista_discount_percent', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400">Entrada (%)</Label>
                                <Input
                                    type="number" min={0} max={100} className="h-7 text-xs"
                                    value={local.avista_entry_percent}
                                    onChange={e => update('avista_entry_percent', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

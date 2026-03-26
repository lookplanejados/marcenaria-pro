"use client";

import { useState, useEffect } from "react";
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
    const prazoInstallment = local.prazo_installments > 0 ? prazoRemainder / local.prazo_installments : 0;

    const avistaTotal     = local.total_prazo * (1 - local.avista_discount_percent / 100);
    const avistaEntry     = avistaTotal * (local.avista_entry_percent / 100);
    const avistaRemainder = avistaTotal - avistaEntry;

    const isSelectable = !!onSelectPayment;

    return (
        <div className={`${showPrazo && showAvista ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}`}>

            {/* ── PRAZO ─────────────────────────────── */}
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
                    {/* Header */}
                    <div className="bg-indigo-600 px-3 py-2.5 flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-semibold text-indigo-200 uppercase tracking-widest leading-none mb-0.5">Cartão de Crédito</p>
                            <p className="text-sm font-black text-white leading-tight">A Prazo</p>
                        </div>
                        {isSelectable && (
                            <div className={`print:hidden h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                selectedPayment === 'prazo' ? 'border-white bg-white' : 'border-indigo-300'
                            }`}>
                                {selectedPayment === 'prazo' && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div className="bg-white dark:bg-zinc-900 px-3 py-4 space-y-3">
                        <div className="text-center space-y-2">
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-200 leading-none">{fmt(local.total_prazo)}</p>
                            <div className="space-y-1 border-t border-slate-100 dark:border-zinc-800 pt-2">
                                <p className="text-xs text-slate-500 leading-snug">
                                    Entrada <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(prazoEntry)}</span>
                                    <span className="text-slate-400"> ({local.prazo_entry_percent}%)</span>
                                </p>
                                <p className="text-base font-black text-indigo-600 leading-none">
                                    {local.prazo_installments}x {fmt(prazoInstallment)}
                                </p>
                                <p className="text-[11px] text-slate-400">saldo restante parcelado</p>
                            </div>
                        </div>

                        {!readOnly && !hideInputs && (
                            <div
                                className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800"
                                onClick={e => e.stopPropagation()}
                            >
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
                </div>
            )}

            {/* ── AVISTA ────────────────────────────── */}
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
                    {/* Header */}
                    <div className="bg-emerald-600 px-3 py-2.5 flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-semibold text-emerald-200 uppercase tracking-widest leading-none mb-0.5">PIX / Dinheiro</p>
                            <p className="text-sm font-black text-white leading-tight">À Vista</p>
                        </div>
                        {isSelectable && (
                            <div className={`print:hidden h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                selectedPayment === 'avista' ? 'border-white bg-white' : 'border-emerald-300'
                            }`}>
                                {selectedPayment === 'avista' && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div className="bg-white dark:bg-zinc-900 px-3 py-4 space-y-3">
                        <div className="text-center space-y-2">
                            <div>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 leading-none">{fmt(avistaTotal)}</p>
                                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{local.avista_discount_percent}% de desconto</p>
                            </div>
                            <div className="space-y-1 border-t border-slate-100 dark:border-zinc-800 pt-2">
                                <p className="text-xs text-slate-500 leading-snug">
                                    Entrada <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(avistaEntry)}</span>
                                    <span className="text-slate-400"> ({local.avista_entry_percent}%)</span>
                                </p>
                                <p className="text-base font-black text-emerald-600 leading-none">
                                    Saldo {fmt(avistaRemainder)}
                                </p>
                                <p className="text-[11px] text-slate-400">na entrega via PIX</p>
                            </div>
                        </div>

                        {!readOnly && !hideInputs && (
                            <div
                                className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800"
                                onClick={e => e.stopPropagation()}
                            >
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
                </div>
            )}
        </div>
    );
}

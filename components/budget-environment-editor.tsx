"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthService } from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

interface PriceTableItem {
    id: string;
    position: number;
    name: string;
    price_prazo: number;
    is_active: boolean;
}

interface BudgetItem {
    id: string;
    environment_id: string;
    description: string;
    qty: number;
    alt_cm: number;
    larg_cm: number;
    prof_cm: number;
    price_prazo_m2: number;
    price_avista_m2: number;
    value_prazo: number;
    value_avista: number;
    is_active: boolean;
    position: number;
}

interface Environment {
    id: string;
    name: string;
    position: number;
    items: BudgetItem[];
}

interface Props {
    budgetId?: string;
    token?: string;       // modo público: usa token em vez de budgetId
    readOnly?: boolean;
    avistaDiscountPercent?: number;
    onTotalsChange?: () => void;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const calcPreview = (alt: number, larg: number, price: number, qty: number) =>
    Math.round((alt * larg / 10000) * price * qty * 100) / 100;

export function BudgetEnvironmentEditor({ budgetId, token, readOnly = false, avistaDiscountPercent = 0, onTotalsChange }: Props) {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [priceItems, setPriceItems]     = useState<PriceTableItem[]>([]);
    const [collapsed, setCollapsed]       = useState<Record<string, boolean>>({});
    const [loading, setLoading]           = useState(true);

    // form novo ambiente
    const [addingEnv, setAddingEnv]     = useState(false);
    const [newEnvName, setNewEnvName]   = useState("");

    // edição do nome do ambiente
    const [editEnvId, setEditEnvId]     = useState<string | null>(null);
    const [editEnvName, setEditEnvName] = useState("");

    // form novo item (por ambiente)
    const [addingItemEnv, setAddingItemEnv] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({
        price_table_item_id: "", description: "",
        qty: 1, alt_cm: 0, larg_cm: 0, prof_cm: 0,
        price_prazo_m2: 0, price_avista_m2: 0,
    });

    // edição inline de item
    const [editItemId, setEditItemId] = useState<string | null>(null);
    const [editItem, setEditItem]     = useState<Partial<BudgetItem>>({});

    const isPublic = !!token;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (isPublic) {
                const res = await fetch(`/api/public/budget/${token}`);
                if (!res.ok) throw new Error("Orçamento não encontrado");
                const data = await res.json();
                setEnvironments(data.environments || []);
            } else if (budgetId) {
                const tok = await AuthService.getAccessToken();
                const res = await fetch(`/api/budgets/${budgetId}`, {
                    headers: { Authorization: `Bearer ${tok}` },
                });
                const data = await res.json();
                setEnvironments(data.environments || []);

                // carrega tabela de preços
                const pr = await fetch('/api/price-table', {
                    headers: { Authorization: `Bearer ${tok}` },
                });
                const prData = await pr.json();
                setPriceItems(prData || []);
            }
        } catch (e: any) {
            toast.error("Erro ao carregar", { description: e.message });
        } finally {
            setLoading(false);
        }
    }, [budgetId, token, isPublic]);

    useEffect(() => { load(); }, [load]);

    const authHeaders = async () => {
        const tok = await AuthService.getAccessToken();
        return { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
    };

    // ── Ambiente ──────────────────────────────────────────
    const handleAddEnv = async () => {
        if (!newEnvName.trim() || !budgetId) return;
        const res = await fetch(`/api/budgets/${budgetId}/environments`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({ name: newEnvName.trim() }),
        });
        if (!res.ok) { toast.error("Erro ao adicionar ambiente"); return; }
        const env = await res.json();
        setEnvironments(prev => [...prev, env]);
        setNewEnvName("");
        setAddingEnv(false);
        toast.success("Ambiente adicionado!");
    };

    const handleDeleteEnv = async (envId: string) => {
        if (!budgetId) return;
        if (!confirm("Remover ambiente e todos os seus itens?")) return;
        await fetch(`/api/budgets/${budgetId}/environments/${envId}`, {
            method: "DELETE", headers: await authHeaders(),
        });
        setEnvironments(prev => prev.filter(e => e.id !== envId));
        onTotalsChange?.();
        toast.success("Ambiente removido!");
    };

    const handleSaveEnvName = async (envId: string) => {
        if (!budgetId || !editEnvName.trim()) return;
        await fetch(`/api/budgets/${budgetId}/environments/${envId}`, {
            method: "PUT",
            headers: await authHeaders(),
            body: JSON.stringify({ name: editEnvName.trim() }),
        });
        setEnvironments(prev => prev.map(e => e.id === envId ? { ...e, name: editEnvName.trim() } : e));
        setEditEnvId(null);
        toast.success("Ambiente renomeado!");
    };

    // ── Item ──────────────────────────────────────────────
    const handlePriceItemSelect = (itemId: string) => {
        const found = priceItems.find(p => p.id === itemId);
        if (found) {
            setNewItem(prev => ({
                ...prev,
                price_table_item_id: itemId,
                description:         found.name,
                price_prazo_m2:      found.price_prazo,
                price_avista_m2:     0,
            }));
        } else {
            setNewItem(prev => ({ ...prev, price_table_item_id: "", description: "", price_prazo_m2: 0, price_avista_m2: 0 }));
        }
    };

    const handleAddItem = async (envId: string) => {
        if (!budgetId || !newItem.description.trim()) {
            toast.error("Preencha a descrição do item");
            return;
        }
        const res = await fetch(`/api/budgets/${budgetId}/items`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({ ...newItem, environment_id: envId }),
        });
        if (!res.ok) { toast.error("Erro ao adicionar item"); return; }
        const item = await res.json();
        setEnvironments(prev => prev.map(e =>
            e.id === envId ? { ...e, items: [...e.items, item] } : e
        ));
        setNewItem({ price_table_item_id: "", description: "", qty: 1, alt_cm: 0, larg_cm: 0, prof_cm: 0, price_prazo_m2: 0, price_avista_m2: 0 });
        setAddingItemEnv(null);
        onTotalsChange?.();
        toast.success("Item adicionado!");
    };

    const handleDeleteItem = async (envId: string, itemId: string) => {
        if (!budgetId) return;
        await fetch(`/api/budgets/${budgetId}/items/${itemId}`, {
            method: "DELETE", headers: await authHeaders(),
        });
        setEnvironments(prev => prev.map(e =>
            e.id === envId ? { ...e, items: e.items.filter(i => i.id !== itemId) } : e
        ));
        onTotalsChange?.();
        toast.success("Item removido!");
    };

    const handleSaveEditItem = async (envId: string, itemId: string) => {
        if (!budgetId) return;
        const res = await fetch(`/api/budgets/${budgetId}/items/${itemId}`, {
            method: "PUT",
            headers: await authHeaders(),
            body: JSON.stringify(editItem),
        });
        if (!res.ok) { toast.error("Erro ao salvar"); return; }
        const updated = await res.json();
        setEnvironments(prev => prev.map(e =>
            e.id === envId ? { ...e, items: e.items.map(i => i.id === itemId ? { ...i, ...updated } : i) } : e
        ));
        setEditItemId(null);
        onTotalsChange?.();
        toast.success("Item atualizado!");
    };

    // ── Modo público: toggle ativo / qty ──────────────────
    const handlePublicToggle = async (item: BudgetItem) => {
        const res = await fetch(`/api/public/budget/${token}/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: item.id, is_active: !item.is_active }),
        });
        if (!res.ok) return;
        const { totals } = await res.json();
        setEnvironments(prev => prev.map(e => ({
            ...e,
            items: e.items.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i),
        })));
        onTotalsChange?.();
    };

    const handlePublicQty = async (item: BudgetItem, qty: number) => {
        if (qty < 1) return;
        const res = await fetch(`/api/public/budget/${token}/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: item.id, qty }),
        });
        if (!res.ok) return;
        setEnvironments(prev => prev.map(e => ({
            ...e,
            items: e.items.map(i => i.id === item.id ? { ...i, qty } : i),
        })));
        onTotalsChange?.();
    };

    if (loading) return <p className="text-xs text-slate-400 animate-pulse">Carregando ambientes...</p>;

    return (
        <div className="space-y-4">
            {environments.map(env => {
                const isCollapsed = collapsed[env.id];
                const subPrazo  = env.items.filter(i => i.is_active).reduce((s, i) => s + (i.value_prazo || 0), 0);
                const subAvista = subPrazo * (1 - avistaDiscountPercent / 100);

                return (
                    <div key={env.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        {/* cabeçalho ambiente */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900">
                            <button onClick={() => setCollapsed(prev => ({ ...prev, [env.id]: !prev[env.id] }))}>
                                {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>

                            {editEnvId === env.id ? (
                                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                    <Input
                                        className="h-6 text-sm font-semibold flex-1"
                                        value={editEnvName}
                                        onChange={e => setEditEnvName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEnvName(env.id); if (e.key === 'Escape') setEditEnvId(null); }}
                                        autoFocus
                                    />
                                    <button onClick={() => handleSaveEnvName(env.id)} className="text-indigo-500 hover:text-indigo-700">
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setEditEnvId(null)} className="text-slate-400 hover:text-slate-600">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <span
                                    className="font-semibold text-sm flex-1 cursor-pointer"
                                    onClick={() => setCollapsed(prev => ({ ...prev, [env.id]: !prev[env.id] }))}
                                >{env.name}</span>
                            )}

                            {!readOnly && !isPublic && (
                                <>
                                    <button
                                        onClick={e => { e.stopPropagation(); setEditEnvId(env.id); setEditEnvName(env.name); }}
                                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteEnv(env.id); }}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {!isCollapsed && (
                            <div className="p-3 space-y-1.5">
                                {/* cabeçalho tabela */}
                                <div className="grid text-[10px] text-slate-400 font-semibold px-1" style={{ gridTemplateColumns: isPublic ? '2rem 1fr 4rem 4.5rem 4.5rem' : '2rem 1fr 4rem 4.5rem 4.5rem 3rem' }}>
                                    <span>Qtd</span>
                                    <span>Descrição</span>
                                    <span className="text-right">Alt×Larg</span>
                                    <span className="text-right">A Prazo</span>
                                    <span className="text-right">À Vista</span>
                                    {!isPublic && <span />}
                                </div>

                                {env.items.map(item => (
                                    <div key={item.id}>
                                        {editItemId === item.id ? (
                                            <div className="bg-slate-50 dark:bg-zinc-900 rounded-lg p-2 space-y-2 border border-indigo-200 text-xs">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px]">Descrição</Label>
                                                        <Input className="h-7 text-xs" value={editItem.description ?? item.description}
                                                            onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">Qtd</Label>
                                                        <Input type="number" className="h-7 text-xs" value={editItem.qty ?? item.qty}
                                                            onChange={e => setEditItem(p => ({ ...p, qty: parseFloat(e.target.value) || 1 }))} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['alt_cm', 'larg_cm', 'prof_cm'].map(f => (
                                                        <div key={f}>
                                                            <Label className="text-[10px]">{f === 'alt_cm' ? 'Alt (cm)' : f === 'larg_cm' ? 'Larg (cm)' : 'Prof (cm)'}</Label>
                                                            <Input type="number" className="h-7 text-xs"
                                                                value={(editItem as any)[f] ?? (item as any)[f]}
                                                                onChange={e => setEditItem(p => ({ ...p, [f]: parseFloat(e.target.value) || 0 }))} />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleSaveEditItem(env.id, item.id)}>
                                                        <Check className="h-3 w-3 mr-1" />Salvar
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setEditItemId(null)}>
                                                        <X className="h-3 w-3 mr-1" />Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`grid items-center text-xs px-1 py-1 rounded transition-colors ${
                                                    !item.is_active ? 'opacity-50 line-through' : ''
                                                } ${isPublic ? 'hover:bg-slate-50 dark:hover:bg-zinc-900' : ''}`}
                                                style={{ gridTemplateColumns: isPublic ? '2rem 1fr 4rem 4.5rem 4.5rem' : '2rem 1fr 4rem 4.5rem 4.5rem 3rem' }}
                                            >
                                                {isPublic ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={item.is_active}
                                                        onChange={() => handlePublicToggle(item)}
                                                        className="h-4 w-4 accent-indigo-500"
                                                    />
                                                ) : (
                                                    <span className="text-slate-500">{String(item.qty % 1 === 0 ? Math.round(item.qty) : item.qty).padStart(2, '0')}</span>
                                                )}

                                                {isPublic ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate">{item.description}</span>
                                                    </div>
                                                ) : (
                                                    <span className="truncate">{item.description}</span>
                                                )}

                                                {isPublic ? (
                                                    <input
                                                        type="number" min={1}
                                                        className="w-full text-right bg-transparent border-b border-slate-200 outline-none text-xs"
                                                        value={item.qty}
                                                        onChange={e => handlePublicQty(item, parseFloat(e.target.value) || 1)}
                                                    />
                                                ) : (
                                                    <span className="text-right text-slate-400">{item.alt_cm}×{item.larg_cm}</span>
                                                )}

                                                <span className="text-right font-medium">{fmt(item.value_prazo)}</span>
                                                <span className="text-right text-emerald-600 font-medium">{fmt(item.value_prazo * (1 - avistaDiscountPercent / 100))}</span>

                                                {!isPublic && (
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <button onClick={() => { setEditItemId(item.id); setEditItem({}); }}
                                                            className="text-slate-300 hover:text-indigo-500 transition-colors">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(env.id, item.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* subtotal */}
                                <div className="flex justify-end gap-4 text-xs font-bold border-t pt-1.5 mt-1">
                                    <span className="text-slate-400">Sub Total =&gt;</span>
                                    <span className="text-indigo-600">{fmt(subPrazo)}</span>
                                    <span className="text-emerald-600">{fmt(subAvista)}</span>
                                </div>

                                {/* form adicionar item */}
                                {!readOnly && !isPublic && (
                                    <>
                                        {addingItemEnv === env.id ? (
                                            <div className="bg-slate-50 dark:bg-zinc-900 rounded-lg p-2 space-y-2 border border-slate-200 dark:border-zinc-700 text-xs mt-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px]">Da tabela de preços</Label>
                                                        <select
                                                            className="w-full h-7 text-xs rounded border border-input bg-background px-2"
                                                            value={newItem.price_table_item_id}
                                                            onChange={e => handlePriceItemSelect(e.target.value)}
                                                        >
                                                            <option value="">-- selecione --</option>
                                                            {priceItems.filter(p => p.is_active).map(p => (
                                                                <option key={p.id} value={p.id}>[{p.position + 1}] {p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">Descrição</Label>
                                                        <Input className="h-7 text-xs" placeholder="Descrição do móvel"
                                                            value={newItem.description}
                                                            onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div>
                                                        <Label className="text-[10px]">Qtd</Label>
                                                        <Input type="number" min={1} className="h-7 text-xs" value={newItem.qty}
                                                            onChange={e => setNewItem(p => ({ ...p, qty: parseFloat(e.target.value) || 1 }))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">Alt (cm)</Label>
                                                        <Input type="number" className="h-7 text-xs" value={newItem.alt_cm}
                                                            onChange={e => setNewItem(p => ({ ...p, alt_cm: parseFloat(e.target.value) || 0 }))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">Larg (cm)</Label>
                                                        <Input type="number" className="h-7 text-xs" value={newItem.larg_cm}
                                                            onChange={e => setNewItem(p => ({ ...p, larg_cm: parseFloat(e.target.value) || 0 }))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">Prof (cm)</Label>
                                                        <Input type="number" className="h-7 text-xs" value={newItem.prof_cm}
                                                            onChange={e => setNewItem(p => ({ ...p, prof_cm: parseFloat(e.target.value) || 0 }))} />
                                                    </div>
                                                </div>
                                                {newItem.price_prazo_m2 > 0 && (
                                                    <div className="text-[10px] text-slate-400 flex gap-3">
                                                        <span>Preço/m²: {fmt(newItem.price_prazo_m2)}</span>
                                                        <span className="font-bold text-indigo-600">
                                                            A Prazo: {fmt(calcPreview(newItem.alt_cm, newItem.larg_cm, newItem.price_prazo_m2, newItem.qty))}
                                                        </span>
                                                        {avistaDiscountPercent > 0 && (
                                                            <span className="font-bold text-emerald-600">
                                                                À Vista: {fmt(calcPreview(newItem.alt_cm, newItem.larg_cm, newItem.price_prazo_m2, newItem.qty) * (1 - avistaDiscountPercent / 100))}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleAddItem(env.id)}>
                                                        <Check className="h-3 w-3 mr-1" />Adicionar
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingItemEnv(null)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-slate-400 mt-1"
                                                onClick={() => { setAddingItemEnv(env.id); setNewItem({ price_table_item_id: "", description: "", qty: 1, alt_cm: 0, larg_cm: 0, prof_cm: 0, price_prazo_m2: 0, price_avista_m2: 0 }); }}>
                                                <Plus className="h-3 w-3 mr-1" />Adicionar Item
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Adicionar ambiente */}
            {!readOnly && !isPublic && (
                <div>
                    {addingEnv ? (
                        <div className="flex gap-2">
                            <Input className="h-8 text-sm" placeholder="Nome do ambiente (ex: QUARTO LARA)"
                                value={newEnvName} onChange={e => setNewEnvName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddEnv(); if (e.key === 'Escape') setAddingEnv(false); }}
                                autoFocus />
                            <Button size="sm" className="h-8" onClick={handleAddEnv}>Adicionar</Button>
                            <Button size="sm" variant="outline" className="h-8" onClick={() => setAddingEnv(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => setAddingEnv(true)}>
                            <Plus className="h-4 w-4 mr-2" />Adicionar Ambiente
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

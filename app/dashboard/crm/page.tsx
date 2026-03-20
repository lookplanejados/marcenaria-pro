"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AuthService } from "@/services/authService";
import { Plus, Users, Search, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";

type Client = {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    created_at: string;
};

export default function CRMPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Form
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    // Contagem de projetos por client_name
    const [projectCounts, setProjectCounts] = useState<Record<string, { count: number; revenue: number }>>({});

    const fetchClients = async () => {
        try {
            setLoading(true);
            const [clientsRes, salesRes] = await Promise.all([
                supabase.from("clients").select("*").order("name"),
                supabase.from("sales").select("client_name, total_value"),
            ]);

            if (clientsRes.error) throw clientsRes.error;
            setClients(clientsRes.data as Client[]);

            // Conta projetos por nome de cliente
            const counts: Record<string, { count: number; revenue: number }> = {};
            (salesRes.data || []).forEach((s: any) => {
                const key = s.client_name?.toLowerCase().trim();
                if (!key) return;
                if (!counts[key]) counts[key] = { count: 0, revenue: 0 };
                counts[key].count += 1;
                counts[key].revenue += s.total_value || 0;
            });
            setProjectCounts(counts);
        } catch (err: any) {
            toast.error("Erro ao carregar clientes", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClients(); }, []);

    const openEditDialog = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setPhone(client.phone || "");
        setEmail(client.email || "");
        setAddress(client.address || "");
        setNotes(client.notes || "");
        setDialogOpen(true);
    };

    const resetForm = () => {
        setEditingClient(null);
        setName(""); setPhone(""); setEmail(""); setAddress(""); setNotes("");
    };

    const handleSave = async () => {
        try {
            setFormLoading(true);
            const profile = await AuthService.getProfile();
            if (!profile?.organization_id) throw new Error("Organização não encontrada.");

            if (editingClient) {
                const { error } = await supabase.from("clients")
                    .update({ name, phone, email, address, notes })
                    .eq("id", editingClient.id);
                if (error) throw error;
                toast.success("Cliente atualizado!");
            } else {
                const { error } = await supabase.from("clients").insert({
                    organization_id: profile.organization_id,
                    name, phone, email, address, notes,
                });
                if (error) throw error;
                toast.success("Cliente cadastrado!");
            }

            setDialogOpen(false);
            resetForm();
            fetchClients();
        } catch (err: any) {
            toast.error("Erro", { description: err.message });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja excluir esse cliente?")) return;
        const { error } = await supabase.from("clients").delete().eq("id", id);
        if (error) { toast.error("Erro ao excluir"); return; }
        toast.success("Cliente excluído");
        fetchClients();
    };

    const formatBRL = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    const filtered = clients.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || "").includes(search) ||
            (c.email || "").toLowerCase().includes(search.toLowerCase())
    );

    const totalClients = clients.length;
    const totalProjectRevenue = Object.values(projectCounts).reduce((s, c) => s + c.revenue, 0);

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CRM - Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cadastro completo, contatos e histórico de projetos</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingClient ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
                            <DialogDescription>Preencha os dados de contato do cliente.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input placeholder="Ex: Maria da Silva" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Endereço</Label>
                                <Input placeholder="Rua, número, bairro, cidade" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Observações</Label>
                                <Input placeholder="Ex: Cliente indicou vizinha" value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={formLoading || !name}>
                                {formLoading ? "Salvando..." : editingClient ? "Salvar" : "Cadastrar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg"><Users className="h-4 w-4 text-violet-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Total de Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalClients}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><Users className="h-4 w-4 text-emerald-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Receita dos Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalProjectRevenue)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Ticket Médio</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {formatBRL((() => { const total = Object.values(projectCounts).reduce((s, c) => s + c.count, 0); return total > 0 ? totalProjectRevenue / total : 0; })())}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Agenda de Clientes</h3>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Buscar por nome, telefone ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Carregando...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhum cliente encontrado. Cadastre pelo botão acima.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead className="text-center">Projetos</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right w-24">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((client) => {
                                const stats = projectCounts[client.name.toLowerCase().trim()] || { count: 0, revenue: 0 };
                                return (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-violet-700 dark:text-violet-400">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{client.name}</p>
                                                    {client.notes && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{client.notes}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {client.phone && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Phone className="h-3 w-3" /> {client.phone}
                                                    </div>
                                                )}
                                                {client.email && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Mail className="h-3 w-3" /> {client.email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {client.address ? (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{client.address}</span>
                                                </div>
                                            ) : <span className="text-xs text-slate-300">—</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-md">
                                                {stats.count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(stats.revenue)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => openEditDialog(client)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDelete(client.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

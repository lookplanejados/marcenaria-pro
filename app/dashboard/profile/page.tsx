"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRBAC } from "@/components/rbac-provider";
import { Save, User, Building2, Shield } from "lucide-react";

export default function ProfilePage() {
    const { profile } = useRBAC();
    const [fullName, setFullName] = useState("");
    const [orgName, setOrgName] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setEmail(user.email || "");

            if (profile?.full_name) setFullName(profile.full_name);

            if (profile?.organization_id) {
                const { data: org } = await supabase
                    .from("organizations")
                    .select("name")
                    .eq("id", profile.organization_id)
                    .single();
                if (org) setOrgName(org.name);
            }
        };
        loadData();
    }, [profile]);

    const handleSave = async () => {
        try {
            setLoading(true);

            // Atualizar nome do perfil
            if (profile?.id) {
                const { error } = await supabase
                    .from("profiles")
                    .update({ full_name: fullName })
                    .eq("id", profile.id);
                if (error) throw error;
            }

            // Atualizar nome da organização
            if (profile?.organization_id && orgName) {
                const { error } = await supabase
                    .from("organizations")
                    .update({ name: orgName })
                    .eq("id", profile.organization_id);
                if (error) throw error;
            }

            toast.success("Perfil atualizado!", { description: "As alterações foram salvas." });
        } catch (err: any) {
            toast.error("Erro ao salvar", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const roleLabels: Record<string, { label: string; color: string; desc: string }> = {
        sysadmin: {
            label: "Admin Geral",
            color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            desc: "Acesso e gerenciamento global do sistema. Controle completo sobre todas as organizações e funções.",
        },
        admin: {
            label: "Administrador",
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            desc: "Acesso a todos os módulos. Pode gerenciar usuários e configurações dentro de sua organização.",
        },
        carpenter: {
            label: "Marceneiro",
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            desc: "Acesso limitado ao Kanban de produção e configurações pessoais.",
        },
    };

    const currentRole = profile?.role ? roleLabels[profile.role] : undefined;

    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meu Perfil</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seus dados pessoais e da sua marcenaria</p>
            </header>

            {/* Card de Informações */}
            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 shadow-sm p-6 space-y-6">
                {/* Avatar e Role */}
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-white">
                            {fullName ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "MP"}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{fullName || "Usuário"}</h2>
                        <p className="text-xs text-slate-400">{email}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${currentRole?.color || "bg-slate-100 text-slate-700"}`}>
                            {currentRole?.label || "Perfil Desconhecido"}
                        </span>
                    </div>
                </div>

                {/* Role Description */}
                <div className="bg-slate-50 dark:bg-zinc-900 rounded-lg p-3 flex items-start gap-3">
                    <Shield className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nível de Acesso: {currentRole?.label || "N/A"}</p>
                        <p className="text-[10px] text-slate-500">{currentRole?.desc || "Não foi possível carregar as propriedades deste perfil."}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Nome Completo</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Nome da Marcenaria</Label>
                        <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Ex: Look Planejados" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">E-mail (não editável)</Label>
                        <Input value={email} disabled className="bg-slate-50 dark:bg-zinc-900" />
                    </div>
                </div>

                <Button onClick={handleSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
            </div>
        </div>
    );
}

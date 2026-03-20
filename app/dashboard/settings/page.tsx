"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Monitor, Save } from "lucide-react";
import { useRBAC } from "@/components/rbac-provider";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { TeamManager } from "@/components/team-manager";


export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { profile, isSysadmin, isAdmin } = useRBAC();

    const [loading, setLoading] = useState(false);
    const [companyData, setCompanyData] = useState({
        name: "",
        cnpj: "",
        phone: "",
        email: "",
    });

    useEffect(() => {
        const fetchOrg = async () => {
            if (!profile?.organization_id) return;
            const { data, error } = await supabase
                .from("organizations")
                .select("name, cnpj, phone, email")
                .eq("id", profile.organization_id)
                .single();

            if (data && !error) {
                setCompanyData({
                    name: data.name || "",
                    cnpj: data.cnpj || "",
                    phone: data.phone || "",
                    email: data.email || "",
                });
            }
        };
        fetchOrg();
    }, [profile]);

    const handleSaveCompanyInfo = async () => {
        if (!profile?.organization_id) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from("organizations")
                .update({
                    name: companyData.name,
                    cnpj: companyData.cnpj,
                    phone: companyData.phone,
                    email: companyData.email,
                })
                .eq("id", profile.organization_id);

            if (error) throw error;
            toast.success("Configurações salvas", { description: "Os dados da sua marcenaria foram atualizados com sucesso." });
        } catch (error: any) {
            toast.error("Erro ao salvar", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const isCompanyEditable = isSysadmin || isAdmin;

    return (
        <div className="flex flex-col gap-8 max-w-2xl">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Personalize o visual e as preferências do sistema</p>
            </header>

            {/* Aparência */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-indigo-500" />
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Aparência</h2>
                </div>

                <div>
                    <Label className="text-sm text-slate-500 mb-3 block">Tema do Sistema</Label>
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            variant={theme === "light" ? "default" : "outline"}
                            className="flex flex-col items-center gap-2 h-auto py-4"
                            onClick={() => setTheme("light")}
                        >
                            <Sun className="h-5 w-5" />
                            <span className="text-xs">Claro</span>
                        </Button>
                        <Button
                            variant={theme === "dark" ? "default" : "outline"}
                            className="flex flex-col items-center gap-2 h-auto py-4"
                            onClick={() => setTheme("dark")}
                        >
                            <Moon className="h-5 w-5" />
                            <span className="text-xs">Escuro</span>
                        </Button>
                        <Button
                            variant={theme === "system" ? "default" : "outline"}
                            className="flex flex-col items-center gap-2 h-auto py-4"
                            onClick={() => setTheme("system")}
                        >
                            <Monitor className="h-5 w-5" />
                            <span className="text-xs">Sistema</span>
                        </Button>
                    </div>
                </div>

            </section>

            {/* Dados da Marcenaria */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Save className="h-5 w-5 text-indigo-500" />
                        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Dados da Marcenaria</h2>
                    </div>
                    {!isCompanyEditable && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Somente leitura</span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input
                            value={companyData.name}
                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                            disabled={!isCompanyEditable}
                            placeholder="Nome da sua marcenaria"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input
                            value={companyData.cnpj}
                            onChange={(e) => setCompanyData({ ...companyData, cnpj: e.target.value })}
                            disabled={!isCompanyEditable}
                            placeholder="00.000.000/0000-00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                            value={companyData.phone}
                            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                            disabled={!isCompanyEditable}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>E-mail Comercial</Label>
                        <Input
                            value={companyData.email}
                            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                            disabled={!isCompanyEditable}
                            placeholder="contato@suamarcenaria.com.br"
                        />
                    </div>
                </div>

                {isCompanyEditable && (
                    <Button onClick={handleSaveCompanyInfo} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                )}
            </section>

            {/* Gestão de Equipe (Apenas Admins/Owners) */}
            {isCompanyEditable && <TeamManager />}

            {/* Informações */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm">
                <h2 className="font-semibold text-sm text-slate-400 mb-2">Sobre o Sistema</h2>
                <p className="text-xs text-slate-500">Marcenaria Pro v0.1.0 • Construído para gestões de alto desempenho</p>
                <p className="text-xs text-slate-400 mt-1">© {new Date().getFullYear()} Look Planejados. Todos os direitos reservados.</p>
            </section>
        </div>
    );
}

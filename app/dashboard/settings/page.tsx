"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Monitor, Palette } from "lucide-react";

const ACCENT_COLORS = [
    { name: "Índigo", value: "indigo", bg: "bg-indigo-500", ring: "ring-indigo-500" },
    { name: "Violeta", value: "violet", bg: "bg-violet-500", ring: "ring-violet-500" },
    { name: "Esmeralda", value: "emerald", bg: "bg-emerald-500", ring: "ring-emerald-500" },
    { name: "Azul", value: "blue", bg: "bg-blue-500", ring: "ring-blue-500" },
    { name: "Rosa", value: "rose", bg: "bg-rose-500", ring: "ring-rose-500" },
    { name: "Âmbar", value: "amber", bg: "bg-amber-500", ring: "ring-amber-500" },
];

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

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

                <div>
                    <Label className="text-sm text-slate-500 mb-3 block">Cor de Destaque</Label>
                    <div className="flex flex-wrap gap-3">
                        {ACCENT_COLORS.map((color) => (
                            <button
                                key={color.value}
                                className={`h-10 w-10 rounded-full ${color.bg} hover:scale-110 transition-transform ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 ring-transparent hover:${color.ring} focus:${color.ring}`}
                                title={color.name}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Em breve: as cores vão se aplicar em todo o sistema.</p>
                </div>
            </section>

            {/* Dados da Marcenaria */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-indigo-500" />
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Dados da Marcenaria</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input defaultValue="Look Planejados" />
                    </div>
                    <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                        <Label>E-mail Comercial</Label>
                        <Input defaultValue="lookplanejados@gmail.com" />
                    </div>
                </div>

                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Salvar Configurações
                </Button>
            </section>

            {/* Informações */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm">
                <h2 className="font-semibold text-sm text-slate-400 mb-2">Sobre o Sistema</h2>
                <p className="text-xs text-slate-500">Marcenaria Pro v0.1.0 • Construído com Next.js, Supabase e Shadcn UI</p>
                <p className="text-xs text-slate-400 mt-1">© 2026 Look Planejados. Todos os direitos reservados.</p>
            </section>
        </div>
    );
}

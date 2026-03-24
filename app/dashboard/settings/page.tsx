"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sun, Moon, Monitor, Save, Building2, CreditCard, Smartphone, FileText } from "lucide-react";
import { useRBAC } from "@/components/rbac-provider";
import { AuthService } from "@/services/authService";
import { toast } from "sonner";
import { TeamManager } from "@/components/team-manager";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { profile, isSysadmin, isOwner, isOffice } = useRBAC();

    const [loadingCompany, setLoadingCompany] = useState(false);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [loadingObs, setLoadingObs] = useState(false);

    const [companyData, setCompanyData] = useState({
        name: "", company_name: "", cnpj: "", state_registration: "",
        phone: "", email: "", address: "",
        owner_name: "", owner_cpf: "", owner_phone: "",
        budget_validity_days: 30,
    });
    const [logoUrl, setLogoUrl] = useState("");
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [paymentDefaults, setPaymentDefaults] = useState({
        default_payment_type: "both",
        default_prazo_entry_percent: 30,
        default_prazo_installments: 12,
        default_avista_discount_percent: 10,
        default_avista_entry_percent: 50,
    });

    const [defaultObs, setDefaultObs] = useState("");

    const authHeader = async () => {
        const tok = await AuthService.getAccessToken();
        return { Authorization: `Bearer ${tok}` };
    };

    useEffect(() => {
        const fetchOrg = async () => {
            if (!profile?.organization_id) return;
            const h = await authHeader();
            const res = await fetch('/api/settings', { headers: h });
            if (!res.ok) return;
            const data = await res.json();
            setLogoUrl(data.logo_url || "");
            setCompanyData({
                name:               data.name               || "",
                company_name:       data.company_name       || "",
                cnpj:               data.cnpj               || "",
                state_registration: data.state_registration || "",
                phone:              data.phone              || "",
                email:              data.email              || "",
                address:            data.address            || "",
                owner_name:           data.owner_name           || "",
                owner_cpf:            data.owner_cpf            || "",
                owner_phone:          data.owner_phone          || "",
                budget_validity_days: data.budget_validity_days ?? 30,
            });
            setPaymentDefaults({
                default_payment_type:           data.default_payment_type           ?? "both",
                default_prazo_entry_percent:     data.default_prazo_entry_percent     ?? 30,
                default_prazo_installments:      data.default_prazo_installments      ?? 12,
                default_avista_discount_percent: data.default_avista_discount_percent ?? 10,
                default_avista_entry_percent:    data.default_avista_entry_percent    ?? 50,
            });
            setDefaultObs(data.default_budget_observations || "");
        };
        fetchOrg();
    }, [profile]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const h = await authHeader();
            const form = new FormData();
            form.append('file', file);
            const res = await fetch('/api/settings/logo', { method: 'POST', headers: h, body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLogoUrl(data.logo_url);
            toast.success("Logo atualizado!");
        } catch (e: any) {
            toast.error("Erro ao enviar logo", { description: e.message });
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    };

    const handleSaveCompany = async () => {
        setLoadingCompany(true);
        try {
            const h = await authHeader();
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify(companyData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Dados da marcenaria salvos!");
        } catch (e: any) {
            toast.error("Erro ao salvar", { description: e.message });
        } finally {
            setLoadingCompany(false);
        }
    };

    const handleSavePayment = async () => {
        setLoadingPayment(true);
        try {
            const h = await authHeader();
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentDefaults),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Preferências de pagamento salvas!", {
                description: "Novos orçamentos já usarão esses valores.",
            });
        } catch (e: any) {
            toast.error("Erro ao salvar", { description: e.message });
        } finally {
            setLoadingPayment(false);
        }
    };

    const handleSaveObs = async () => {
        setLoadingObs(true);
        try {
            const h = await authHeader();
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ default_budget_observations: defaultObs }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Observações padrão salvas!", {
                description: "Novos orçamentos já virão com esse texto.",
            });
        } catch (e: any) {
            toast.error("Erro ao salvar", { description: e.message });
        } finally {
            setLoadingObs(false);
        }
    };

    const isCompanyEditable = isSysadmin || isOwner || isOffice;
    const showPrazo  = paymentDefaults.default_payment_type === 'prazo'  || paymentDefaults.default_payment_type === 'both';
    const showAvista = paymentDefaults.default_payment_type === 'avista' || paymentDefaults.default_payment_type === 'both';

    return (
        <div className="flex flex-col gap-8 max-w-2xl">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Dados da marcenaria e preferências do sistema</p>
            </header>

            {/* Aparência */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-indigo-500" />
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Aparência</h2>
                </div>
                <div>
                    <Label className="text-sm text-slate-500 mb-3 block">Tema do Sistema</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: "light", icon: <Sun className="h-5 w-5" />, label: "Claro" },
                            { value: "dark",  icon: <Moon className="h-5 w-5" />, label: "Escuro" },
                            { value: "system", icon: <Monitor className="h-5 w-5" />, label: "Sistema" },
                        ].map(t => (
                            <Button key={t.value}
                                variant={theme === t.value ? "default" : "outline"}
                                className="flex flex-col items-center gap-2 h-auto py-4"
                                onClick={() => setTheme(t.value)}
                            >
                                {t.icon}
                                <span className="text-xs">{t.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dados da Marcenaria */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-500" />
                        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Dados da Marcenaria</h2>
                    </div>
                    {!isCompanyEditable && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Somente leitura</span>
                    )}
                </div>

                {/* Logo */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Logo da Empresa</p>
                <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-zinc-900 shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                            <Building2 className="h-8 w-8 text-slate-300" />
                        )}
                    </div>
                    {isCompanyEditable && (
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">PNG, JPG ou SVG — máx. 2MB</Label>
                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-zinc-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                                {uploadingLogo ? "Enviando..." : "Escolher arquivo"}
                                <input
                                    type="file" accept="image/*" className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={uploadingLogo}
                                />
                            </label>
                            {logoUrl && (
                                <p className="text-[10px] text-emerald-500 font-medium">✓ Logo cadastrado</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Dados da empresa */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dados da Empresa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Razão Social</Label>
                        <Input value={companyData.company_name} disabled={!isCompanyEditable}
                            placeholder="Razão Social Ltda."
                            onChange={e => setCompanyData(p => ({ ...p, company_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input value={companyData.name} disabled={!isCompanyEditable}
                            placeholder="Nome da sua marcenaria"
                            onChange={e => setCompanyData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input value={companyData.cnpj} disabled={!isCompanyEditable}
                            placeholder="00.000.000/0000-00"
                            onChange={e => setCompanyData(p => ({ ...p, cnpj: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Inscrição Estadual</Label>
                        <Input value={companyData.state_registration} disabled={!isCompanyEditable}
                            placeholder="000.000.000.000"
                            onChange={e => setCompanyData(p => ({ ...p, state_registration: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone da Empresa</Label>
                        <Input value={companyData.phone} disabled={!isCompanyEditable}
                            placeholder="(00) 00000-0000"
                            onChange={e => setCompanyData(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>E-mail da Empresa</Label>
                        <Input value={companyData.email} disabled={!isCompanyEditable}
                            placeholder="contato@suamarcenaria.com.br"
                            onChange={e => setCompanyData(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Endereço da Empresa</Label>
                        <Input value={companyData.address} disabled={!isCompanyEditable}
                            placeholder="Rua, número, bairro, cidade - UF"
                            onChange={e => setCompanyData(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Validade do Orçamento (dias)</Label>
                        <Input type="number" min={1} max={365} value={companyData.budget_validity_days}
                            disabled={!isCompanyEditable}
                            placeholder="30"
                            onChange={e => setCompanyData(p => ({ ...p, budget_validity_days: parseInt(e.target.value) || 30 }))} />
                    </div>
                </div>

                {/* Dados do proprietário */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Dados do Proprietário</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Nome Completo</Label>
                        <Input value={companyData.owner_name} disabled={!isCompanyEditable}
                            placeholder="Nome completo do proprietário"
                            onChange={e => setCompanyData(p => ({ ...p, owner_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input value={companyData.owner_cpf} disabled={!isCompanyEditable}
                            placeholder="000.000.000-00"
                            onChange={e => setCompanyData(p => ({ ...p, owner_cpf: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone do Proprietário</Label>
                        <Input value={companyData.owner_phone} disabled={!isCompanyEditable}
                            placeholder="(00) 00000-0000"
                            onChange={e => setCompanyData(p => ({ ...p, owner_phone: e.target.value }))} />
                    </div>
                </div>

                {isCompanyEditable && (
                    <Button onClick={handleSaveCompany} disabled={loadingCompany} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        {loadingCompany ? "Salvando..." : "Salvar Dados"}
                    </Button>
                )}
            </section>

            {/* Preferências de Pagamento */}
            {isCompanyEditable && (
                <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-500" />
                        <div>
                            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Preferências de Pagamento</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Valores padrão usados ao criar novos orçamentos. Podem ser alterados em cada orçamento.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Modalidade padrão</Label>
                        <Select
                            value={paymentDefaults.default_payment_type}
                            onValueChange={v => setPaymentDefaults(p => ({ ...p, default_payment_type: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="both">A Prazo e À Vista</SelectItem>
                                <SelectItem value="prazo">Somente A Prazo</SelectItem>
                                <SelectItem value="avista">Somente À Vista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {showPrazo && (
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-900/30 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">A Prazo — Cartão de Crédito</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Entrada padrão (%)</Label>
                                    <Input type="number" min={0} max={100}
                                        value={paymentDefaults.default_prazo_entry_percent}
                                        onChange={e => setPaymentDefaults(p => ({ ...p, default_prazo_entry_percent: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Nº de parcelas padrão</Label>
                                    <Input type="number" min={1} max={60}
                                        value={paymentDefaults.default_prazo_installments}
                                        onChange={e => setPaymentDefaults(p => ({ ...p, default_prazo_installments: parseInt(e.target.value) || 1 }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    {showAvista && (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">À Vista — PIX</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Desconto padrão (%)</Label>
                                    <Input type="number" min={0} max={100}
                                        value={paymentDefaults.default_avista_discount_percent}
                                        onChange={e => setPaymentDefaults(p => ({ ...p, default_avista_discount_percent: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Entrada padrão (%)</Label>
                                    <Input type="number" min={0} max={100}
                                        value={paymentDefaults.default_avista_entry_percent}
                                        onChange={e => setPaymentDefaults(p => ({ ...p, default_avista_entry_percent: parseFloat(e.target.value) || 0 }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    <Button onClick={handleSavePayment} disabled={loadingPayment} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        {loadingPayment ? "Salvando..." : "Salvar Preferências"}
                    </Button>
                </section>
            )}

            {/* Observações Padrão para Orçamento */}
            {isCompanyEditable && (
                <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        <div>
                            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Observações Padrão para Orçamento</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Texto pré-preenchido no campo de observações de todo novo orçamento. Editável por orçamento.</p>
                        </div>
                    </div>
                    <Textarea
                        rows={5}
                        className="resize-none text-sm"
                        placeholder={"Ex: Incluso portas com amortecimento e gavetas telescópicas.\nGarantia de 1 ano contra defeitos de fabricação.\nPrazo de entrega: 45 dias úteis após aprovação."}
                        value={defaultObs}
                        onChange={e => setDefaultObs(e.target.value)}
                    />
                    <Button onClick={handleSaveObs} disabled={loadingObs} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        {loadingObs ? "Salvando..." : "Salvar Observações"}
                    </Button>
                </section>
            )}

            {/* Gestão de Equipe */}
            {isCompanyEditable && <TeamManager />}

            {/* Sobre */}
            <section className="bg-white dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 p-6 shadow-sm">
                <h2 className="font-semibold text-sm text-slate-400 mb-2">Sobre o Sistema</h2>
                <p className="text-xs text-slate-500">Marcenaria Pro v0.1.0 • Construído para gestões de alto desempenho</p>
                <p className="text-xs text-slate-400 mt-1">© {new Date().getFullYear()} Marcenaria Pro. Todos os direitos reservados.</p>
            </section>
        </div>
    );
}

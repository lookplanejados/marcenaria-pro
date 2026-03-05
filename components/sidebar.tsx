"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRBAC } from "./rbac-provider";
import {
    LayoutDashboard,
    Wallet,
    Package,
    Users,
    Settings,
    Hammer,
    Lock,
    Ruler,
    BarChart3,
    Building2,
} from "lucide-react";

type MenuItem = {
    name: string;
    href: string;
    icon: any;
    requiredPermission?: 'sysadmin' | 'admin' | 'finance' | 'sales' | 'inventory';
};

export const menuItems: MenuItem[] = [
    { name: "Painel de Controle", href: "/dashboard/admin", icon: LayoutDashboard, requiredPermission: 'sysadmin' },
    { name: "Marcenarias", href: "/dashboard/organizations", icon: Building2, requiredPermission: 'sysadmin' },
    { name: "Kanban (Projetos)", href: "/dashboard", icon: LayoutDashboard },
    { name: "Usuários", href: "/dashboard/users", icon: Users, requiredPermission: 'admin' },
    { name: "Financeiro", href: "/dashboard/finance", icon: Wallet, requiredPermission: 'finance' },
    { name: "Estoque", href: "/dashboard/inventory", icon: Package, requiredPermission: 'inventory' },
    { name: "CRM (Clientes)", href: "/dashboard/crm", icon: Users, requiredPermission: 'finance' },
    { name: "Arquitetos", href: "/dashboard/architects", icon: Ruler, requiredPermission: 'finance' },
    { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3, requiredPermission: 'finance' },
    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { canViewFinance, canManageInventory, isSysadmin, isAdmin, isCarpenter, profile, loading } = useRBAC();

    const isItemVisible = (item: MenuItem) => {
        // Regra estrita para Admin Geral do Sistema: só vê os 4 módulos essenciais
        if (isSysadmin) {
            const allowedForSysadmin = ["/dashboard/admin", "/dashboard/organizations", "/dashboard/users", "/dashboard/settings"];
            return allowedForSysadmin.includes(item.href);
        }

        // Regras para Admin da Marcenaria e Marceneiro
        if (item.requiredPermission === 'sysadmin') return false; // Ninguém além do sysadmin vê marcenarias
        if (item.requiredPermission === 'admin') return isAdmin; // Apenas admin gerencia usuários localmente (o sysadmin já caiu no if acima)

        if (!item.requiredPermission) return true;
        if (item.requiredPermission === 'finance') return canViewFinance;
        if (item.requiredPermission === 'inventory') return canManageInventory;
        return true;
    };

    const visibleItems = menuItems.filter(isItemVisible);

    const getRoleBadge = () => {
        if (!profile) return null;
        const roleMap: Record<string, { label: string; color: string }> = {
            sysadmin: { label: "Admin Geral", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
            admin: { label: "Admin", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
            carpenter: { label: "Marceneiro", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        };
        const role = roleMap[profile.role] || roleMap.carpenter;
        return (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${role.color}`}>
                {role.label}
            </span>
        );
    };

    return (
        <aside className={cn("h-full py-6 flex flex-col", className)}>
            <div className="px-6 mb-2 flex items-center gap-2">
                <div className="h-8 w-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
                    <Hammer className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                    Marcenaria Pro
                </span>
            </div>

            {/* Role Badge */}
            <div className="px-6 mb-6">
                {getRoleBadge()}
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800/50"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.name}
                        </Link>
                    );
                })}

                {/* Aviso para Marceneiros */}
                {isCarpenter && (
                    <div className="mt-4 px-3 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">ACESSO LIMITADO</span>
                        </div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500">
                            Módulos financeiros são visíveis apenas para proprietários.
                        </p>
                    </div>
                )}
            </nav>

            <div className="px-6 mt-auto">
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {loading ? "Marcenaria Pro" : (profile?.full_name || "Proprietário")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Plano Profissional
                    </p>
                </div>
            </div>
        </aside>
    );
}

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { menuItems } from "./sidebar";
import { useRBAC } from "./rbac-provider";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, Moon, Sun, Monitor, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { AuthService } from "@/services/authService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function Header() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { profile, canViewFinance, canManageInventory } = useRBAC();

    const getInitials = () => {
        if (!profile?.full_name) return "MP";
        return profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const visibleMenuItems = menuItems.filter((item) => {
        if (!item.requiredPermission) return true;
        if (item.requiredPermission === 'finance') return canViewFinance;
        if (item.requiredPermission === 'inventory') return canManageInventory;
        return true;
    });

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        await AuthService.logout();
        toast.info("Você saiu do sistema.");
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center gap-4 bg-white px-4 border-b dark:bg-zinc-950 dark:border-zinc-800 shadow-sm md:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 pt-10">
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                        {visibleMenuItems.map((item) => {
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
                    </nav>
                </SheetContent>
            </Sheet>

            <div className="flex-1">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 hidden md:flex">
                    {pathname === "/dashboard" && "Kanban de Projetos"}
                    {pathname === "/dashboard/finance" && "Financeiro"}
                    {pathname === "/dashboard/inventory" && "Estoque"}
                    {pathname === "/dashboard/crm" && "CRM - Clientes"}
                    {pathname === "/dashboard/architects" && "Arquitetos Parceiros"}
                    {pathname === "/dashboard/settings" && "Configurações"}
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Toggle Theme / Dark Mode */}
                {mounted && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Mudar tema</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="mr-2 h-4 w-4" /> Claro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="mr-2 h-4 w-4" /> Escuro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                                <Monitor className="mr-2 h-4 w-4" /> Sistema
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800">
                            <Avatar className="h-9 w-9 border border-indigo-100 dark:border-zinc-800">
                                <AvatarImage src="/avatars/user.png" alt="User" />
                                <AvatarFallback className="bg-indigo-600 text-white text-xs">{getInitials()}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">{profile?.full_name || "Carregando..."}</p>
                                <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                                    {profile?.role === 'owner' ? 'Proprietário' : profile?.role === 'admin' ? 'Administrador' : 'Marceneiro'}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">Meu Perfil</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Assinatura</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer dark:text-red-400">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair do sistema</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

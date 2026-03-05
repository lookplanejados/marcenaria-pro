"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService, UserProfile } from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

interface RBACContextType {
    profile: UserProfile | null;
    loading: boolean;
    isSysadmin: boolean;
    isAdmin: boolean;
    isCarpenter: boolean;
    canViewFinance: boolean;
    canManageSales: boolean;
    canManageInventory: boolean;
}

const RBACContext = createContext<RBACContextType>({
    profile: null,
    loading: true,
    isSysadmin: false,
    isAdmin: false,
    isCarpenter: false,
    canViewFinance: false,
    canManageSales: false,
    canManageInventory: false,
});

export function RBACProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Primeiro tenta buscar do profiles
                const p = await AuthService.getCurrentUserProfile();

                if (p) {
                    setProfile(p);
                } else {
                    // Fallback: pega dados do auth e assume permissão mínima (ou admin se for logado)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setProfile({
                            id: user.id,
                            organization_id: user.user_metadata?.organization_id || "",
                            role: "carpenter",
                            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
                        });
                    }
                }
            } catch {
                // Se deu erro mas tem sessão, assume carpenter para não liberar acessos extras à toa
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setProfile({
                        id: user.id,
                        organization_id: "",
                        role: "carpenter",
                        full_name: user.email?.split("@")[0] || "Usuário",
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadProfile();
        });

        loadProfile();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Se não tem profile ou está carregando, assume restrito (carpenter) até carregar
    const role = profile?.role || "carpenter";

    const value: RBACContextType = {
        profile,
        loading,
        isSysadmin: role === "sysadmin",
        isAdmin: role === "admin",
        isCarpenter: role === "carpenter",
        canViewFinance: role === "sysadmin" || role === "admin",
        canManageSales: role === "sysadmin" || role === "admin",
        canManageInventory: role === "sysadmin" || role === "admin",
    };

    return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
    return useContext(RBACContext);
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService, UserProfile } from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

interface RBACContextType {
    profile: UserProfile | null;
    loading: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isCarpenter: boolean;
    canViewFinance: boolean;
    canManageSales: boolean;
    canManageInventory: boolean;
}

const RBACContext = createContext<RBACContextType>({
    profile: null,
    loading: true,
    isOwner: true,
    isAdmin: false,
    isCarpenter: false,
    canViewFinance: true,
    canManageSales: true,
    canManageInventory: true,
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
                    // Fallback: pega dados do auth e assume owner
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setProfile({
                            id: user.id,
                            organization_id: user.user_metadata?.organization_id || "",
                            role: "owner",
                            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
                        });
                    }
                }
            } catch {
                // Se deu erro mas tem sessão, assume owner
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setProfile({
                        id: user.id,
                        organization_id: "",
                        role: "owner",
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

    // Se não tem profile ou está carregando, assume owner (full access)
    const role = profile?.role || "owner";

    const value: RBACContextType = {
        profile,
        loading,
        isOwner: role === "owner",
        isAdmin: role === "admin",
        isCarpenter: role === "carpenter",
        canViewFinance: role === "owner" || role === "admin",
        canManageSales: role === "owner" || role === "admin",
        canManageInventory: role === "owner" || role === "admin",
    };

    return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
    return useContext(RBACContext);
}

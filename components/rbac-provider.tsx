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
    isOwner: false,
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
                const p = await AuthService.getCurrentUserProfile();
                setProfile(p);
            } catch {
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        // Escuta mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadProfile();
        });

        loadProfile();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const role = profile?.role || "carpenter";

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

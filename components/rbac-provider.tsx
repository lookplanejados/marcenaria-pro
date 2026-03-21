"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthService, UserProfile } from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

interface ImpersonatedOrg {
    id: string;
    name: string;
}

interface RBACContextType {
    profile: UserProfile | null;
    loading: boolean;
    // Role flags
    isSysadmin: boolean;
    isOwner: boolean;
    isOffice: boolean;
    isSeller: boolean;
    isCarpenter: boolean;
    // Permission flags
    canViewFinance: boolean;
    canManageSales: boolean;
    canManageInventory: boolean;
    canManageUsers: boolean;
    canViewReports: boolean;
    canViewAudit: boolean;
    canViewCommissions: boolean;
    canManageKanban: boolean;
    canManageSuppliers: boolean;
    canManageBudgets: boolean;
    // Impersonation (sysadmin only)
    impersonatedOrg: ImpersonatedOrg | null;
    impersonate: (org: ImpersonatedOrg | null) => void;
    effectiveOrgId: string | null;
}

const RBACContext = createContext<RBACContextType>({
    profile: null,
    loading: true,
    isSysadmin: false,
    isOwner: false,
    isOffice: false,
    isSeller: false,
    isCarpenter: false,
    canViewFinance: false,
    canManageSales: false,
    canManageInventory: false,
    canManageUsers: false,
    canViewReports: false,
    canViewAudit: false,
    canViewCommissions: false,
    canManageKanban: false,
    canManageSuppliers: false,
    canManageBudgets: false,
    impersonatedOrg: null,
    impersonate: () => {},
    effectiveOrgId: null,
});

export function RBACProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [impersonatedOrg, setImpersonatedOrg] = useState<ImpersonatedOrg | null>(null);

    const loadProfile = useCallback(async () => {
        try {
            const p = await AuthService.getCurrentUserProfile();
            if (p) {
                setProfile(p);
            } else {
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
    }, []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadProfile();
        });
        loadProfile();
        return () => subscription.unsubscribe();
    }, [loadProfile]);

    const role = profile?.role || "carpenter";

    const isSysadmin  = role === "sysadmin";
    const isOwner     = role === "owner";
    const isOffice    = role === "office";
    const isSeller    = role === "seller";
    const isCarpenter = role === "carpenter";

    const effectiveOrgId = impersonatedOrg?.id ?? profile?.organization_id ?? null;

    const value: RBACContextType = {
        profile,
        loading,
        isSysadmin,
        isOwner,
        isOffice,
        isSeller,
        isCarpenter,
        canViewFinance:      isSysadmin || isOwner || isOffice,
        canManageSales:      isSysadmin || isOwner || isOffice,
        canManageInventory:  isSysadmin || isOwner || isOffice,
        canManageUsers:      isSysadmin || isOwner || isOffice,
        canViewReports:      isSysadmin || isOwner || isOffice,
        canViewAudit:        isSysadmin || isOwner || isOffice,
        canViewCommissions:  isSysadmin || isOwner || isOffice || isSeller || isCarpenter,
        canManageKanban:     isSysadmin || isOwner || isOffice || isCarpenter,
        canManageSuppliers:  isSysadmin || isOwner || isOffice,
        canManageBudgets:    isSysadmin || isOwner || isOffice || isSeller,
        impersonatedOrg,
        impersonate: setImpersonatedOrg,
        effectiveOrgId,
    };

    return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
    return useContext(RBACContext);
}

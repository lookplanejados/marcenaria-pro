import { supabase } from '../lib/supabaseClient';

export type UserRole = 'sysadmin' | 'admin' | 'carpenter';

export interface UserProfile {
    id: string;
    organization_id: string;
    role: UserRole;
    full_name: string;
}

export const AuthService = {
    /**
     * Realiza o login utilizando email e senha.
     */
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Realiza o logout do usuário atual.
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Busca o Perfil Completo do usuário logado e sua Role (RBAC).
     * Se não existe perfil/organização, cria automaticamente (auto-provisioning).
     */
    async getCurrentUserProfile(): Promise<UserProfile | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        // 1. Tenta buscar perfil existente
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            return profile as UserProfile;
        }

        // Se o perfil não foi retornado do public.profiles, usamos o fallback da sessão.
        // O sysadmin será responsável por cadastrar a conta na base corretamente.
        return this._fallbackProfile(user);
    },

    /**
     * Fallback quando não consegue buscar perfil do banco
     */
    _fallbackProfile(user: any, orgId?: string): UserProfile {
        return {
            id: user.id,
            organization_id: orgId || '',
            role: 'carpenter',
            full_name: user.email?.split('@')[0] || 'Usuário',
        };
    },

    /**
     * Hook para pegar a Sessão / JWT token atual
     */
    async getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    },

    /**
     * Alias para getCurrentUserProfile, usado nos forms de criação.
     */
    async getProfile(): Promise<UserProfile | null> {
        return this.getCurrentUserProfile();
    }
};

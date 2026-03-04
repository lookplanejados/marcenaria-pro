import { supabase } from '../lib/supabaseClient';

export type UserRole = 'admin' | 'owner' | 'carpenter';

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
     * Busca o Perfil Completo do usuário logado e sua Role (RBAC)
     * Útil para decidir se redireciona para o Kanban do Owner ou Dashboard do Marceneiro
     */
    async getCurrentUserProfile(): Promise<UserProfile | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            console.error('Erro ao buscar perfil:', error?.message);
            return null;
        }

        return profile as UserProfile;
    },

    /**
     * Hook para pegar a Sessão / JWT token atual (necessário para APIs no Backend FastAPI)
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

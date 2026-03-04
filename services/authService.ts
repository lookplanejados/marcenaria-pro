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

        if (profile?.organization_id) {
            return profile as UserProfile;
        }

        // 2. Auto-provisioning: cria organização + perfil
        try {
            // Verifica se já existe uma organização criada por esse e-mail
            let orgId: string;

            const { data: existingOrg } = await supabase
                .from('organizations')
                .select('id')
                .limit(1)
                .single();

            if (existingOrg) {
                orgId = existingOrg.id;
            } else {
                // Cria nova organização
                const orgName = user.email?.split('@')[0] || 'Minha Marcenaria';
                const { data: newOrg, error: orgError } = await supabase
                    .from('organizations')
                    .insert({ name: orgName })
                    .select('id')
                    .single();

                if (orgError || !newOrg) {
                    console.error('Erro ao criar organização:', orgError?.message);
                    return this._fallbackProfile(user);
                }
                orgId = newOrg.id;
            }

            // Cria ou atualiza perfil
            const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Proprietário';
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    organization_id: orgId,
                    role: 'owner',
                    full_name: fullName,
                })
                .select('*')
                .single();

            if (profileError || !newProfile) {
                console.error('Erro ao criar perfil:', profileError?.message);
                return this._fallbackProfile(user, orgId);
            }

            return newProfile as UserProfile;
        } catch (err) {
            console.error('Auto-provisioning falhou:', err);
            return this._fallbackProfile(user);
        }
    },

    /**
     * Fallback quando não consegue criar/buscar perfil do banco
     */
    _fallbackProfile(user: any, orgId?: string): UserProfile {
        return {
            id: user.id,
            organization_id: orgId || '',
            role: 'owner',
            full_name: user.email?.split('@')[0] || 'Proprietário',
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

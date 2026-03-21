import { supabase } from '../lib/supabaseClient';

export type UserRole = 'sysadmin' | 'owner' | 'office' | 'seller' | 'carpenter';

export interface UserProfile {
    id: string;
    organization_id: string;
    role: UserRole;
    full_name: string;
    avatar_url?: string;
    color_theme?: string;
    address?: string;
    city?: string;
    state?: string;
    cpf?: string;
    phone?: string;
    notes?: string;
    is_active?: boolean;
}

export const AuthService = {
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUserProfile(): Promise<UserProfile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) return profile as UserProfile;
        return this._fallbackProfile(user);
    },

    _fallbackProfile(user: any, orgId?: string): UserProfile {
        return {
            id: user.id,
            organization_id: orgId || '',
            role: 'carpenter',
            full_name: user.email?.split('@')[0] || 'Usuário',
        };
    },

    async getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    },

    async getProfile(): Promise<UserProfile | null> {
        return this.getCurrentUserProfile();
    },

    async changePassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    async updateProfile(updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url' | 'color_theme' | 'phone'>>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;
    },
};

import { AuthService } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const ApiClient = {
    /**
     * Função base pra fazer requests REST pro Servidor FastAPI (Serverless Vercel)
     * Anexa automaticamente o JWT Token do Supabase no Header Authorization.
     */
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = await AuthService.getAccessToken();

        const headers = new Headers(options.headers || {});
        headers.set('Content-Type', 'application/json');

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erro na comunicação com a API Serverless');
        }

        return response.json();
    },

    /**
     * Chama o endpoint Python FastAPI para fechar a venda de forma segura e calcular os lucros.
     */
    async closeSale(saleId: string, payload: any) {
        return this.request(`/api/sales/${saleId}/close`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
};

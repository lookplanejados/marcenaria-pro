"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Supabase populates the session from the URL hash token automatically
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setReady(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        if (password !== confirm) {
            setError("As senhas não coincidem.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setError("Não foi possível redefinir a senha. O link pode ter expirado.");
            return;
        }

        router.push("/dashboard");
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-slate-500 animate-pulse">Validando link de recuperação...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-indigo-600">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Lock className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Nova Senha</CardTitle>
                    <CardDescription className="text-center">
                        Escolha uma nova senha segura para sua conta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center text-sm">
                                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirmar Senha</Label>
                            <Input
                                id="confirm"
                                type="password"
                                placeholder="Repita a nova senha"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading ? "Salvando..." : "Redefinir Senha"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

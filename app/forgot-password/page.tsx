"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, KeyRound, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);

        if (error) {
            setError("Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.");
            return;
        }

        setSent(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-indigo-600">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <KeyRound className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
                    <CardDescription className="text-center">
                        Informe seu e-mail para receber o link de redefinição
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="text-center text-sm text-slate-600">
                                E-mail enviado para <b>{email}</b>. Verifique sua caixa de entrada e siga o link para criar uma nova senha.
                            </p>
                            <Link href="/login" className="text-sm text-indigo-600 font-medium hover:underline">
                                Voltar ao Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center text-sm">
                                    <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                                {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                            </Button>
                            <p className="text-center text-xs text-slate-400">
                                Lembrou a senha?{" "}
                                <Link href="/login" className="text-indigo-600 font-medium hover:underline">
                                    Voltar ao Login
                                </Link>
                            </p>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

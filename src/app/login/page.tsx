"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/Page-container";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Credenciais invalidas. Tente novamente.");
        return;
      }

      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
      }

      toast.success("Acesso autorizado!");

      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (data.user?.role === "USER") {
        router.push("/conta");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-10 px-4">
      <PageContainer className="max-w-md w-full mx-auto">
        {/* Voltar para Home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para a Loja
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
          {/* Header colorido */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-7 pb-6 text-white relative overflow-hidden">
            <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div>
                <div className="relative w-32 h-9 mb-1">
                  <Image
                    src="/img/logo-pink.svg"
                    alt="Pink Music"
                    fill
                    className="object-contain object-left brightness-0 invert"
                    priority
                  />
                </div>
                <p className="text-white/65 text-[13px]">
                  Acesso restrito ao sistema interno
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="usuario@pinkmusic.com.br"
                  autoComplete="email"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg text-sm font-bold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Acessar o Sistema"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Acesso disponivel apenas para usuarios cadastrados pelo administrador.
            </p>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center" />}>
      <LoginForm />
    </Suspense>
  );
}

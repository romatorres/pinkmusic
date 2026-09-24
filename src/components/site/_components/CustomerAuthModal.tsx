"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, UserPlus, Eye, EyeOff, Music2, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

interface CustomerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback chamado após login ou cadastro bem-sucedido */
  onSuccess?: () => void;
  /** Se true, o modal não pode ser fechado sem autenticar */
  required?: boolean;
}

type AuthTab = "login" | "register";

export function CustomerAuthModal({
  open,
  onOpenChange,
  onSuccess,
  required = false,
}: CustomerAuthModalProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Campos de login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Campos de cadastro
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegName("");
    setRegPhone("");
    setRegEmail("");
    setRegPassword("");
    setShowPassword(false);
  };

  const handleClose = (value: boolean) => {
    if (!value && required) return; // Bloqueia fechar se obrigatório
    if (!value) resetForms();
    onOpenChange(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao fazer login.");
        return;
      }

      // Busca dados do usuário
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const user = await meRes.json();
        setUser(user);
      }

      toast.success("Login realizado! Bem-vindo de volta 🎵");
      resetForms();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao criar conta.");
        return;
      }

      // Busca dados do usuário recém-criado
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const user = await meRes.json();
        setUser(user);
      }

      toast.success("Conta criada com sucesso! Bem-vindo à Pink Music 🎸");
      resetForms();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl"
        onInteractOutside={required ? (e) => e.preventDefault() : undefined}
      >
        {/* Header gradiente */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Music2 className="h-5 w-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Pink Music</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {tab === "login" ? "Acesse sua conta" : "Crie sua conta"}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm">
              {tab === "login"
                ? "Entre para finalizar sua compra com seus dados já preenchidos."
                : "Cadastre-se gratuitamente e acompanhe seus pedidos."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Abas */}
        <div className="flex border-b border-border/50 bg-muted/30">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              tab === "login"
                ? "text-primary border-b-2 border-primary bg-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              tab === "register"
                ? "text-primary border-b-2 border-primary bg-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Criar Conta
          </button>
        </div>

        {/* Formulário de Login */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Entrando..." : "Entrar na minha conta"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => setTab("register")}
                className="text-primary font-medium hover:underline"
              >
                Cadastre-se grátis
              </button>
            </p>
          </form>
        )}

        {/* Formulário de Cadastro */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name" className="text-sm font-medium">
                Nome completo
              </Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="Seu nome"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                autoComplete="name"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-phone" className="text-sm font-medium">
                WhatsApp{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder="(99) 99999-9999"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  autoComplete="tel"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="seu@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Criando conta..." : "Criar minha conta"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Ao criar uma conta, você concorda com nossos termos de uso.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

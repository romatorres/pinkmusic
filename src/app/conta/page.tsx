"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingBag,
  LogOut,
  ChevronRight,
  User as UserIcon,
  Phone,
  Mail,
  ArrowLeft,
  Store,
} from "lucide-react";
import { PageContainer } from "@/components/ui/Page-container";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function ContaPage() {
  const router = useRouter();
  const { user, isAuth, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      logout();
      toast.success("Você saiu da conta.");
      router.push("/");
    }
  };

  const initials = user?.name
    ? user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "C"
    : "C";

  if (!isAuth) {
    return (
      <div className="min-h-[75vh] flex flex-col justify-center py-12">
        <PageContainer className="max-w-md w-full mx-auto">
          <div className="rounded-3xl border border-border/80 bg-card p-8 text-center shadow-card">
            <div className="size-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 text-primary">
              <UserIcon className="size-8" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Minha Conta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse sua conta para ver seus pedidos, acompanhamento de entregas e dados cadastrais.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="h-11 rounded-xl font-bold">
                <Link href="/login">Entrar ou Criar Conta</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href="/products-all">Explorar Produtos</Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  const items = [
    {
      icon: Package,
      label: "Meus pedidos",
      description: "Acompanhe pagamentos e status de entrega",
      href: "/meus-pedidos",
    },
    {
      icon: ShoppingBag,
      label: "Explorar catálogo",
      description: "Confira instrumentos, ofertas e novidades",
      href: "/products-all",
    },
  ];

  return (
    <div className="min-h-[80vh] py-8 md:py-12">
      <PageContainer className="max-w-xl mx-auto">
        {/* Navegação de volta */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Voltar para a Loja
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold md:text-4xl font-display text-foreground">
          Minha Conta
        </h1>

        {/* Card do Perfil estilo Lovable */}
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-secondary p-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold text-secondary-foreground truncate">
              {user?.name || "Cliente Pink Music"}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {user?.email || ""}
            </div>
            {user?.phone && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="size-3" />
                {user.phone}
              </div>
            )}
          </div>
        </div>

        {/* Menu de Ações estilo Lovable */}
        <ul className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          {items.map((it) => (
            <li key={it.label}>
              <Link
                href={it.href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <it.icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-base font-bold text-foreground">
                    {it.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {it.description}
                  </span>
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}

          {/* Sair da Conta */}
          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-destructive/5 text-destructive transition-colors cursor-pointer"
            >
              <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 text-destructive">
                <LogOut className="size-5" />
              </div>
              <div className="flex-1">
                <span className="block text-base font-bold">
                  Sair da Conta
                </span>
                <span className="block text-xs text-muted-foreground">
                  Desconectar seu acesso neste dispositivo
                </span>
              </div>
              <ChevronRight className="size-5 text-muted-foreground shrink-0" />
            </button>
          </li>
        </ul>
      </PageContainer>
    </div>
  );
}

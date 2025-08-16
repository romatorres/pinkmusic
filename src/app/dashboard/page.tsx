"use client";

import { useAuthStore } from "@/store/authStore";

export default function OverviewPage() {
  const { user } = useAuthStore();

  return (
    <div className="md:px-8 px-0 md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">
        Painel de controle
      </h1>
      {user && (
        <div className="text-foreground flex gap-1">
          <p>Olá,</p>
          <span className="font-bold"> {user.name},</span>
          <p>seja bem-vindo ao dashboard.</p>
        </div>
      )}

      {user?.role === "ADMIN" && (
        <div className="mt-8 p-4 border border-foreground rounded-md">
          <h2 className="text-2xl font-bold text-foreground">
            Área do Administrador
          </h2>
          <p>Conteúdo exclusivo para administradores.</p>
        </div>
      )}
    </div>
  );
}

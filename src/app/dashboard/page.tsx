"use client";

import { useAuthStore } from "@/store/authStore";

export default function OverviewPage() {
  const { user } = useAuthStore();

  return (
    <div className="md:px-8 px-0 md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">
        Painel de controle
      </h1>
      <p>Sejá bem vindo ao dashboard.</p>

      {user?.role === "ADMIN" && (
        <div className="mt-8 p-4 border border-foreground rounded-md">
          <h2 className="text-2xl font-bold text-foreground">
            Área doS Administrador
          </h2>
          <p>Conteúdo exclusivo para administradores.</p>
        </div>
      )}
    </div>
  );
}

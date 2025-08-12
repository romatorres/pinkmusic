"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function OverviewPage() {
  const { role, clearToken } = useAuthStore();
  const router = useRouter();

  return (
    <div className="md:px-8 px-0 md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Visão Geral</h1>
      <p>Esta é a página de visão geral da dashboard.</p>

      {role === "ADMIN" && (
        <div className="mt-8 p-4 border border-foreground rounded-md">
          <h2 className="text-2xl font-bold text-foreground">
            Área de Administrador
          </h2>
          <p>Conteúdo exclusivo para administradores.</p>
        </div>
      )}
    </div>
  );
}

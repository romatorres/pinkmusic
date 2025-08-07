"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function OverviewPage() {
  const { role, clearToken } = useAuthStore();
  const router = useRouter();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Visão Geral</h1>
      <p>Esta é a página de visão geral da dashboard.</p>

      {role === "ADMIN" && (
        <div className="mt-8 p-4 border border-blue-700 rounded-md">
          <h2 className="text-2xl font-bold text-blue-700">
            Área de Administrador
          </h2>
          <p>Conteúdo exclusivo para administradores.</p>
        </div>
      )}
    </div>
  );
}

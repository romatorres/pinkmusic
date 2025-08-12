"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function OverviewPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="md:px-8 px-0 md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Visão Geral</h1>
      <p>Esta é a página de visão geral da dashboard.</p>

      {user?.role === "ADMIN" && (
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

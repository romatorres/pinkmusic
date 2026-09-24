"use client";

import { Sidebar } from "@/app/dashboard/_components/sidebar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { setUser, isAuth } = useAuthStore();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === "USER") {
            router.replace("/meus-pedidos");
            return;
          }
          setUser(userData);
        } else {
          setUser(null);
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUser(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [setUser, router]);

  if (loading || !isAuth) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <aside className="hidden w-64 border-r border-border/60 bg-muted/40 p-4 lg:block" />

        <main className="flex-1 p-4 lg:p-8">
          <LoadingState
            label="Verificando sessão..."
            size="lg"
            fullHeight
            className="bg-background"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:p-8 p-4">{children}</main>
    </div>
  );
}

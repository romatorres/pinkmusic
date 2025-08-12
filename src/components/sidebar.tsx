"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path: string) => {
    return pathname.startsWith(path) ? "bg-blue-700" : "";
  };

  const isSettingsActive = () => {
    return pathname.startsWith("/dashboard/settings") ? true : false;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const MobileMenuButton = () => (
    <button
      onClick={toggleMobileMenu}
      className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-white"
      aria-label="Menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isMobileMenuOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );

  return (
    <>
      <MobileMenuButton />

      <div
        className={cn(
          "h-screen bg-primary text-white flex flex-col",
          "fixed md:static z-40 transition-all duration-300 ease-in-out",
          isMobile
            ? isMobileMenuOpen
              ? "w-64 left-0"
              : "-left-64 w-64"
            : "w-64",
          isMobileMenuOpen && "shadow-xl"
        )}
      >
        <div className="p-4 border-b border-foreground flex flex-col md:items-start items-end">
          <h2 className="text-xl font-bold">Painel de Controle</h2>
          {user && (
            <p className="text-xs text-emerald-200 flex flex-col md:items-start items-end">
              <span>{user.name}</span>
              <span>{user.role}</span>
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard"
                className={`block p-2 rounded hover:bg-[#469D3F] transition ${
                  isActive("/dashboard") && pathname === "/dashboard"
                    ? "bg-[#45973E]"
                    : ""
                }`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/partners"
                className={`block p-2 rounded hover:bg-[#469D3F] transition ${
                  isActive("/dashboard/partners") ? "bg-[#45973E]" : ""
                }`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                Parceiros
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/products"
                className={`block p-2 rounded hover:bg-[#469D3F] transition ${
                  isActive("/dashboard/products") ? "bg-[#45973E]" : ""
                }`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                Produtos
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/categories"
                className={`block p-2 rounded hover:bg-[#469D3F] transition ${
                  isActive("/dashboard/categories") ? "bg-[#45973E]" : ""
                }`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                Categorias
              </Link>
            </li>

            <li>
              <div className="space-y-1">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`w-full flex items-center justify-between p-2 rounded hover:bg-[#469D3F] transition ${
                    isSettingsActive() ? "bg-primary" : ""
                  }`}
                >
                  <span>Configurações</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${
                      settingsOpen || isSettingsActive() ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  className={`pl-4 space-y-1 ${
                    settingsOpen || isSettingsActive() ? "block" : "hidden"
                  }`}
                >
                  <Link
                    href="/dashboard/settings"
                    className={`block p-2 rounded hover:bg-[#469D3F] transition ${
                      pathname === "/dashboard/settings" ? "bg-[#45973E]" : ""
                    }`}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  >
                    Configurações Gerais
                  </Link>
                  <Link
                    href="/dashboard/settings/profile"
                    className={`block p-2 rounded bg-[#45973E] transition ${
                      pathname === "/dashboard/settings/profile"
                        ? "bg-emerald-600"
                        : ""
                    }`}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  >
                    Meu Perfil
                  </Link>
                </div>
              </div>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-foreground">
          <Button
            onClick={handleLogout}
            variant={"destructive"}
            className="w-full"
          >
            Sair
          </Button>
        </div>
      </div>

      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

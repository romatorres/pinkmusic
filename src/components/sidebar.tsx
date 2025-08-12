"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ChartBarStacked,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingCart,
  User,
  UserPen,
  Users,
  Menu,
  X,
} from "lucide-react";

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
    return pathname.startsWith(path) ? "bg-secondary" : "";
  };

  const isSettingsActive = () => {
    return pathname.startsWith("/dashboard/settings") ? true : false;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-primary rounded-md md:hidden"
        onClick={toggleMobileMenu}
        aria-label="Menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "bg-primary text-white w-64 flex flex-col z-40",
          // Mobile: fixed com slide animation e transform
          "fixed top-0 left-0 h-full transform transition-transform duration-200 ease-in-out",
          // Desktop: static sem transform
          "md:static md:h-screen md:transform-none",
          // Mobile slide control
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop sempre visível
          "md:translate-x-0"
        )}
      >
        {/* Header do Sidebar */}
        <div className="p-4 border-b border-foreground">
          <div className="flex flex-col md:items-start items-end">
            <h2 className="text-xl font-bold">Painel de Controle</h2>
            {user && (
              <p className="text-xs text-emerald-200 flex flex-col md:items-start items-end">
                <span>{user.name}</span>
                <span>{user.role}</span>
              </p>
            )}
          </div>
        </div>

        {/* Navigation Menu - usando flex-1 para ocupar espaço disponível */}
        <div className="flex-1 p-4">
          <nav>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                    isActive("/dashboard") && pathname === "/dashboard"
                      ? "bg-secondary"
                      : ""
                  }`}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/dashboard/partners"
                  className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                    isActive("/dashboard/partners") ? "bg-secondary" : ""
                  }`}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <Users size={20} />
                  <span>Parceiros</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/dashboard/products"
                  className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                    isActive("/dashboard/products") ? "bg-secondary" : ""
                  }`}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <ShoppingCart size={20} />
                  <span>Produtos</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/dashboard/categories"
                  className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                    isActive("/dashboard/categories") ? "bg-secondary" : ""
                  }`}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <ChartBarStacked size={20} />
                  <span>Categorias</span>
                </Link>
              </li>

              <li>
                <div className="space-y-1">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-full flex items-center justify-between p-2 rounded hover:bg-secondary/50 transition ${
                      isSettingsActive() ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Settings size={20} />
                      <span>Configurações</span>
                    </span>
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
                      href="/dashboard/register"
                      className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                        pathname === "/dashboard/settings" ? "bg-secondary" : ""
                      }`}
                      onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    >
                      <User size={20} />
                      <span>Novo Usuario</span>
                    </Link>

                    <Link
                      href="/dashboard/profile"
                      className={`flex items-center space-x-2 p-2 rounded hover:bg-secondary/50 transition ${
                        pathname === "/dashboard/profile" ? "bg-secondary" : ""
                      }`}
                      onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    >
                      <UserPen size={20} />
                      <span>Meu Perfil</span>
                    </Link>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>

        {/* Logout Button fixo no bottom - sempre visível */}
        <div className="p-4 border-t border-foreground">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-white hover:text-emerald-200 w-full p-2 rounded hover:bg-secondary/50 transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

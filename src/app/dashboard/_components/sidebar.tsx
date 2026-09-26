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
  ShoppingCart,
  UserPen,
  Users,
  Menu,
  X,
  Bandage,
  ClipboardList,
  ShieldCheck,
  Building2,
} from "lucide-react";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuButtonOpacity, setMenuButtonOpacity] = useState(1);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || isMobileMenuOpen) {
      setMenuButtonOpacity(1);
      return;
    }

    const timer = window.setTimeout(() => {
      setMenuButtonOpacity(0.6);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [isMobile, isMobileMenuOpen]);

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

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return pathname === path ? "bg-white/20 font-semibold shadow-sm" : "hover:bg-white/10";
    }
    return pathname.startsWith(path) ? "bg-white/20 font-semibold shadow-sm" : "hover:bg-white/10";
  };

  const toggleMobileMenu = () => {
    setMenuButtonOpacity(1);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobile = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE" || user?.role === "FUNCIONARIO";

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 right-4 z-50 p-2 bg-primary/90 rounded-md md:hidden shadow-lg border border-white/20 transition-all duration-500 ease-out hover:opacity-100"
        style={{ opacity: menuButtonOpacity }}
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
          "bg-primary text-white w-64 flex flex-col z-40 shadow-xl",
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
        <div className="p-5 border-b border-white/15">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight">Pink Music</span>
            </div>
            {user && (
              <div className="mt-2 text-xs flex flex-col gap-0.5">
                <span className="font-semibold text-white/95 truncate">{user.name}</span>
                <div>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                      <ShieldCheck className="w-3 h-3" />
                      Administrador
                    </span>
                  ) : isEmployee ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                      <ClipboardList className="w-3 h-3" />
                      Funcionário
                    </span>
                  ) : (
                    <span className="text-white/70 text-[10px]">{user.role}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Seção 1: Operações & Vendas */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
              Operações & Vendas
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive("/dashboard", true)
                  )}
                  onClick={closeMobile}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
              </li>

              {/* Pedidos e Vendas: liberado para Admin e Funcionário */}
              <li>
                <Link
                  href="/dashboard/orders"
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive("/dashboard/orders")
                  )}
                  onClick={closeMobile}
                >
                  <ClipboardList size={18} />
                  <span>Pedidos & Vendas</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção 2: Pessoas & Acessos (Separação Clientes vs Usuários do Sistema) */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
              Gestão de Pessoas
            </p>
            <ul className="space-y-1">
              {/* Clientes: liberado para Admin e Funcionário */}
              <li>
                <Link
                  href="/dashboard/customers"
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive("/dashboard/customers")
                  )}
                  onClick={closeMobile}
                >
                  <Users size={18} />
                  <span>Clientes</span>
                </Link>
              </li>

              {/* Usuários do Sistema (Equipe): exclusivo para Admin */}
              {isAdmin && (
                <li>
                  <Link
                    href="/dashboard/users"
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive("/dashboard/users") || isActive("/dashboard/register")
                    )}
                    onClick={closeMobile}
                  >
                    <ShieldCheck size={18} />
                    <span>Usuários do Sistema</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Seção 3: Catálogo da Loja (Exclusivo Admin) */}
          {isAdmin && (
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
                Catálogo da Loja
              </p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/dashboard/products"
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive("/dashboard/products")
                    )}
                    onClick={closeMobile}
                  >
                    <ShoppingCart size={18} />
                    <span>Produtos</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard/categories"
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive("/dashboard/categories")
                    )}
                    onClick={closeMobile}
                  >
                    <ChartBarStacked size={18} />
                    <span>Categorias</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard/brands"
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive("/dashboard/brands")
                    )}
                    onClick={closeMobile}
                  >
                    <Bandage size={18} />
                    <span>Marcas</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard/partners"
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive("/dashboard/partners")
                    )}
                    onClick={closeMobile}
                  >
                    <Building2 size={18} />
                    <span>Parceiros</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Seção 4: Minha Conta */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
              Minha Conta
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/dashboard/profile"
                  className={cn(
                    "flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive("/dashboard/profile")
                  )}
                  onClick={closeMobile}
                >
                  <UserPen size={18} />
                  <span>Meu Perfil</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Logout Button fixo no bottom */}
        <div className="p-4 border-t border-white/15">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2.5 cursor-pointer text-white/90 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-destructive/80 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

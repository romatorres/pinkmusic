import React from "react";
import Link from "next/link";
import { Home, ShoppingBag, Disc3, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/Page-container";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-gradient-to-b from-background via-muted/20 to-background">
      <PageContainer>
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Ilustração / Ícone Musical */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-primary/20 via-pink-500/10 to-purple-600/20 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
              <Disc3 className="w-14 h-14 sm:w-18 sm:h-18 text-primary animate-[spin_8s_linear_infinite]" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
              <Headphones className="w-5 h-5" />
            </div>
          </div>

          {/* Código 404 e Título */}
          <div className="space-y-10">
            <div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-primary uppercase px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                Erro 404 · Solo Desafinado
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
              Ops! Essa página saiu do repertório.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              O acorde que você tentou tocar ou o produto que você estava procurando não foi encontrado, foi descontinuado ou mudou de palco.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              variant="default"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold shadow-md gap-2"
            >
              <Link href="/">
                <Home className="w-4 h-4" />
                Voltar para o Início
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto hover:bg-muted font-semibold gap-2"
            >
              <Link href="/products-all">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Ver Todos os Instrumentos
              </Link>
            </Button>
          </div>

          {/* Sugestões Rápidas */}
          <div className="pt-8 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-3 font-medium">
              Ou explore diretamente por categoria:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { name: "Cordas & Violões", href: "/products-all" },
                { name: "Teclados & Pianos", href: "/products-all" },
                { name: "Baterias & Percussão", href: "/products-all" },
                { name: "Áudio & Microfones", href: "/products-all" },
                { name: "Acessórios", href: "/products-all" },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground border border-border/60"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

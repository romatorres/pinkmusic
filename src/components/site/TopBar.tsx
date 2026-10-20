import { MapPin, Phone, Truck } from "lucide-react";

export default function TopBar() {
  return (
    <div className="bg-primary">
      <div className="flex mx-auto w-full container px-4 sm:px-6 lg:px-8 py-2 items-center justify-between text-background text-center ">
        {/* Aviso de delivery — visível em telas maiores */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-background/90">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>
            Delivery: Seg–Sex 8h–17h · Sáb 8h–13h · Dom Fechado
          </span>
        </div>
        {/* Em mobile, mantém o boas-vindas */}
        <div className="flex sm:hidden text-sm">
          <p>Olá! Seja bem vindo!</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="https://wa.me/5575999661614"
            target="_blank"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="flex">(75) 99966-1614</span>
          </a>
          <span className="hidden md:flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Feira de Santana, BA
          </span>
        </div>
      </div>
    </div>
  );
}

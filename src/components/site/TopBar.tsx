import { MapPin, Phone } from "lucide-react";

export default function TopBar() {
  return (
    <div className="bg-primary">
      <div className="flex mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-2 items-center justify-between text-background text-center ">
        <div className="text-sm">
          <p>Olá! Seja bem vindo!</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="tel:+5575999661614"
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

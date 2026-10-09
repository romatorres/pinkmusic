"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Store,
  MapPin,
  Truck,
  Headphones,
  Mail,
  Phone,
  Clock,
  Navigation,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  const address = {
    street1: "Loja 01 | Rua JJ Seabra, 31",
    street2: "Loja 02 | Rua JJ Seabra, 163",
    district: "Centro",
    city: "Feira de Santana",
    state: "BA",
    full: "Rua JJ Seabra, 31, Centro, Feira de Santana - BA, 44002-000",
  };

  const openGoogleMaps = () => {
    window.open(
      "https://www.google.com/maps/place/Pink+Music/@-12.2568785,-38.9668729,17z/data=!3m1!4b1!4m6!3m5!1s0x7143793755d3343:0xb0521fd81d69892b!8m2!3d-12.2568785!4d-38.964298!16s%2Fg%2F11krpgm6pw?entry=ttu&g_ep=EgoyMDI1MDgwNi4wIKXMDSoASAFQAw%3D%3D",
      "_blank"
    );
  };

  const openWaze = () => {
    const encodedAddress = encodeURIComponent(address.full);
    window.open(`https://www.waze.com/ul?q=${encodedAddress}`, "_blank");
  };

  return (
    <section id="about" className="container-page py-16 md:py-24 space-y-16">
      {/* ── 1. Banner Principal Estilo Lovable (Compra online. Atendimento de verdade.) ── */}
      <div className="grid overflow-hidden rounded-3xl bg-hero text-hero-foreground shadow-lift lg:grid-cols-2">
        <div className="p-7 md:p-12 lg:p-14 flex flex-col justify-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-ml font-display">
            Feira de Santana — Bahia
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl lg:text-5xl font-display leading-[1.08]">
            Compra online. Atendimento de verdade.
          </h2>
          <p className="mt-4 text-hero-foreground/85 text-base md:text-lg leading-relaxed">
            Com mais de 30 anos de tradição em Feira de Santana, a Pink Music une a
            praticidade da compra online com o acolhimento, a segurança e a consultoria de músicos experientes que você só encontra na loja física.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <Button
              variant="hero"
              size="lg"
              className="rounded-xl px-6 h-12 font-bold"
              onClick={openGoogleMaps}
            >
              <span>Venha nos visitar</span>
              <Navigation className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl px-6 h-12 font-semibold text-white border-hero-foreground/30 hover:bg-hero-foreground/15 bg-transparent"
              asChild
            >
              <a
                href="https://wa.me/5575999661614"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <span>Falar no WhatsApp</span>
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Grade de 4 diferenciais */}
        <ul className="grid grid-cols-2 gap-px bg-hero-foreground/15 border-t lg:border-t-0 lg:border-l border-hero-foreground/15">
          {[
            {
              icon: Store,
              title: "Duas Lojas Físicas",
              desc: "Venha testar instrumentos e amplificadores antes de levar.",
            },
            {
              icon: MapPin,
              title: "Retirada Grátis",
              desc: "Compre online e retire no balcão da loja em poucas horas.",
            },
            {
              icon: Truck,
              title: "Entrega Local Rápida",
              desc: "Entregamos na sua casa ou estúdio em toda Feira de Santana.",
            },
            {
              icon: Headphones,
              title: "Atendimento de Músico",
              desc: "Equipe especializada pronta para tirar qualquer dúvida técnica.",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <li key={idx} className="bg-hero p-6 md:p-8 flex flex-col justify-between">
                <Icon className="size-7 text-ml mb-3" />
                <div>
                  <div className="font-display text-lg md:text-xl font-bold text-hero-foreground">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs md:text-sm text-hero-foreground/75 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── 2. Sobre a Nossa História + Imagem ── */}
      <div className="grid lg:grid-cols-2 gap-10 items-center pt-4">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1 text-xs font-bold text-secondary-foreground">
            Tradição Musical
          </div>
          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-display">
            Mais do que uma loja, uma paixão pela música.
          </h3>
          <p className="text-base text-muted-foreground leading-relaxed">
            A Pink Music nasceu do amor pela arte e pela sonoridade. Estamos presentes no dia a dia de igrejas, bandas, estúdios e iniciantes que buscam o seu primeiro instrumento.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Trabalhamos com marcas consagradas mundiais e nacionais, garantindo procedência, nota fiscal, garantia e o melhor custo-benefício para Feira de Santana e toda a Bahia.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/products-all"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Conferir catálogo completo <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30 border border-border/80 shadow-card">
          <Image
            src="/img/about.png"
            alt="Fachada e instrumentos da Pink Music"
            fill
            className="object-contain p-4"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* ── 3. Nossos Contatos e Unidades ── */}
      <div className="pt-6 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Fale com a gente ou venha tomar um café
          </h3>
          <p className="text-sm md:text-base text-muted-foreground">
            Nossos canais oficiais de atendimento e localizações no centro de Feira de Santana.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* WhatsApp */}
          <div className="bg-card rounded-2xl p-6 border border-border/80 shadow-card flex flex-col justify-between hover:shadow-lift transition-all">
            <div>
              <div className="size-11 rounded-xl bg-secondary text-primary grid place-items-center mb-4">
                <Phone className="size-5" />
              </div>
              <h4 className="font-display font-bold text-base text-foreground mb-1">
                WhatsApp
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Atendimento direto com nossos vendedores
              </p>
            </div>
            <div className="space-y-1.5 text-sm font-medium">
              <a
                href="https://wa.me/5575999661614"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-primary transition-colors text-foreground"
              >
                Loja 01: (75) 99966-1614
              </a>
              <a
                href="https://wa.me/5575991988685"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-primary transition-colors text-foreground"
              >
                Loja 02: (75) 99198-8685
              </a>
            </div>
          </div>

          {/* E-mail */}
          <div className="bg-card rounded-2xl p-6 border border-border/80 shadow-card flex flex-col justify-between hover:shadow-lift transition-all">
            <div>
              <div className="size-11 rounded-xl bg-secondary text-primary grid place-items-center mb-4">
                <Mail className="size-5" />
              </div>
              <h4 className="font-display font-bold text-base text-foreground mb-1">
                E-mail
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Orçamentos corporativos e suporte
              </p>
            </div>
            <div className="space-y-1.5 text-sm font-medium">
              <a
                href="mailto:vendas@pinkmusic.com.br"
                className="block hover:text-primary transition-colors text-foreground truncate"
              >
                vendas@pinkmusic.com.br
              </a>
              <a
                href="mailto:contato@pinkmusic.com.br"
                className="block hover:text-primary transition-colors text-foreground truncate"
              >
                contato@pinkmusic.com.br
              </a>
            </div>
          </div>

          {/* Horários */}
          <div className="bg-card rounded-2xl p-6 border border-border/80 shadow-card flex flex-col justify-between hover:shadow-lift transition-all">
            <div>
              <div className="size-11 rounded-xl bg-secondary text-primary grid place-items-center mb-4">
                <Clock className="size-5" />
              </div>
              <h4 className="font-display font-bold text-base text-foreground mb-1">
                Funcionamento
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Horário de funcionamento das lojas
              </p>
            </div>
            <div className="space-y-1 text-sm text-foreground">
              <p>Seg a Sex: 8h às 18h</p>
              <p>Sábado: 8h às 13h</p>
              <p className="text-muted-foreground text-xs">Domingos: Fechado</p>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-card rounded-2xl p-6 border border-border/80 shadow-card flex flex-col justify-between hover:shadow-lift transition-all">
            <div>
              <div className="size-11 rounded-xl bg-secondary text-primary grid place-items-center mb-4">
                <MapPin className="size-5" />
              </div>
              <h4 className="font-display font-bold text-base text-foreground mb-1">
                Onde Estamos
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Centro de Feira de Santana — BA
              </p>
            </div>
            <div className="space-y-1 text-sm text-foreground">
              <p className="font-semibold">{address.street1}</p>
              <p className="font-semibold">{address.street2}</p>
              <p className="text-xs text-muted-foreground">Centro, Feira de Santana</p>
            </div>
          </div>
        </div>

        {/* ── 4. Mapa Interativo e Rotas ── */}
        <div className="bg-card rounded-3xl overflow-hidden border border-border/80 shadow-card">
          <div className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60">
            <div>
              <h4 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                Como chegar na Pink Music
              </h4>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Rua JJ Seabra, Centro — Feira de Santana, Bahia
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="default"
                size="sm"
                className="rounded-xl flex-1 sm:flex-initial"
                onClick={openGoogleMaps}
              >
                <Navigation className="size-4" />
                <span>Google Maps</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl flex-1 sm:flex-initial"
                onClick={openWaze}
              >
                <Navigation className="size-4" />
                <span>Waze</span>
              </Button>
            </div>
          </div>

          <div className="relative w-full h-[360px] md:h-[420px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.721234567890!2d-38.9668729!3d-12.2568785!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7143793755d3343%3A0xb0521fd81d69892b!2sPink%20Music!5e0!3m2!1spt-BR!2sbr!4v1723334567890!5m2!1spt-BR!2sbr"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa das lojas Pink Music em Feira de Santana"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

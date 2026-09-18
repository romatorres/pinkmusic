"use client";

import Link from "next/link";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "../ui/button";

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
    <section className="bg-sidebar-primary">
      <PageContainer>
        {/* About */}
        <div className="flex flex-col">
          {/* Div Textos e Imagem */}
          <div className="flex md:flex-row flex-col w-full md:justify-between justify-center items-center gap-2 mt-8">
            {/* Testos */}
            <div className="flex-1 max-w-[640px]">
              <div className="flex items-center gap-2 whitespace-nowrap font-tanker text-3xl text-foreground lg:whitespace-initial">
                <div className="my-auto h-7 w-2 shrink-0 self-stretch bg-secondary" />
                <h2 className="my-auto self-stretch font-normal">Sobre</h2>
              </div>
              <h3 className="mb-0 mt-2.5 font-tanker text-4xl font-normal text-primary lg:max-w-full lg:text-[52px]">
                Mais do que uma loja, uma paixão pela música.
              </h3>
              <p className="mt-6 font-inter text-lg leading-[22px] tracking-[0.36px] text-foreground lg:max-w-full">
                Localizada em Feira de Santana, na Bahia, a Pink Music é uma
                loja física com mais de 30 anos de tradição no mercado de
                instrumentos musicais e equipamentos de áudio. Nosso compromisso
                é oferecer qualidade, atendimento especializado e uma verdadeira
                experiência para músicos, produtores e apaixonados por som.
              </p>
            </div>
            {/* Imagem */}
            <div className="relative md:w-[449px] md:h-[355px] w-[358px] max-h-[283px] md:max-h-full aspect-[0.83] flex-1 justify-center items-center">
              <Image
                src="/img/about.png"
                alt="Sobre Pink Music"
                fill
                className="object-contain object-center"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex md:flex-row flex-col gap-6 my-10 md:w-auto w-full">
            <div className="w-full md:w-auto">
              <Link
                href="https://www.mercadolivre.com.br/pagina/pinkmusic"
                passHref
                target="_blank"
              >
                <button className="flex w-full md:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-7 py-3 text-lg font-semibold text-white transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-secondary lg:px-10 lg:py-4">
                  <Image
                    src="/img/icon-store.svg"
                    alt="E-commerce Icon"
                    width={22}
                    height={22}
                    className="aspect-square object-contain"
                  />
                  E-commerce
                </button>
              </Link>
            </div>
            <div className="w-full md:w-auto">
              <Link href="#contact">
                <button className="flex w-full md:w-auto items-center justify-center gap-2 whitespace-nowrap border-primary border-[1px] rounded-full bg-white px-7 py-3 text-lg font-semibold text-primary transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-background lg:px-10 lg:py-4">
                  <Image
                    src="/img/icon-location.svg"
                    alt="Store Localização"
                    width={22}
                    height={22}
                    className="aspect-square object-contain"
                  />
                  Loja Física
                </button>
              </Link>
            </div>
          </div>
        </div>
        {/* Contacts */}
        <div className="text-center sm:mb-12 mb-8 mt-20">
          <h2 className="text-3xl md:text-5xl font-tanker text-primary mt-3">
            Fale com a gente
          </h2>
          <p className="text-foreground mt-4 max-w-2xl mx-auto">
            Tire suas dúvidas, peça orçamentos ou venha nos visitar. Estamos
            prontos para ajudar você a encontrar o instrumento perfeito.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center md:py-6 py-2 px-4 w-full">
          {/* Informações de Contato */}
          <div className="space-y-8 w-full">
            <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-8 w-full">
              {/* EMAIL */}
              <div className="group bg-card rounded-2xl flex flex-col space-y-2 justify-center items-center p-6 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 text-center">
                <div className="mb-4">
                  <Image
                    src="/img/icon-email_contacts.svg"
                    alt="Email"
                    width={56}
                    height={56}
                    className="aspect-square object-contain object-center w-14 self-stretch flex-shrink-0 my-auto"
                  />
                </div>
                <h3 className="text-foreground sm:text-2xl text-xl font-semibold">
                  E-MAIL
                </h3>
                <p className="text-foreground flex flex-col">
                  <a href="mailto:vendas@pinkmusic.com.br">
                    vendas@pinkmusic.com.br
                  </a>
                  <a href="mailto:contato@pinkmusic.com.br">
                    contato@pinkmusic.com.br
                  </a>
                </p>
              </div>
              {/* WHATSAPP */}
              <div className="group bg-card rounded-2xl flex flex-col space-y-2 justify-center items-center p-6 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 text-center">
                <div className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-whats_contacts.svg"
                    alt="Localização"
                    width={56}
                    height={56}
                    className="aspect-square object-contain object-center w-14 self-stretch flex-shrink-0 my-auto"
                  />
                </div>
                <h3 className="text-foreground sm:text-2xl text-xl font-semibold">
                  WHATSAPP
                </h3>
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-foreground">
                      <a href="https://wa.me/5575999661614" target="_blank">
                        Loja 01 | (75) 99966-1614
                      </a>
                    </p>
                    <p className="text-foreground">
                      <a href="https://wa.me/5575991988685" target="_blank">
                        Loja 02 | (75) 99198-8685
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              {/* HORARIOS */}
              <div className="group bg-card rounded-2xl flex flex-col space-y-2 justify-center items-center p-6 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 text-center">
                <div className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-horario_contacts.svg"
                    alt="Localização"
                    width={56}
                    height={56}
                    className="aspect-square object-contain object-center w-14 self-stretch flex-shrink-0 my-auto"
                  />
                </div>
                <h3 className="text-foreground sm:text-2xl text-xl font-semibold">
                  HORÁRIOS
                </h3>
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-foreground">
                      Segunda a Sexta: 8h às 18h
                    </p>
                    <p className="text-foreground">Sábado: 8h às 13h</p>
                    <p className="text-foreground">Domingo: Fechado</p>
                  </div>
                </div>
              </div>
              {/* LOCALIZAÇAO */}
              <div className="group bg-card rounded-2xl flex flex-col space-y-2 justify-center items-center p-6 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-location_contacts.svg"
                    alt="Localização"
                    width={56}
                    height={56}
                    className="aspect-square object-contain object-center w-14 self-stretch flex-shrink-0 my-auto"
                  />
                </h2>
                <h3 className="text-foreground sm:text-2xl text-xl font-semibold">
                  ENDEREÇO
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div>
                      <p className="text-foreground">{address.street1}</p>
                      <p className="text-foreground">{address.street2}</p>
                      <p className="text-primary">{address.district}</p>
                      <p className="text-primary">
                        {address.city} - {address.state}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa */}
            <div className="space-y-6 md:my-16 my-8">
              {/* Mapa interativo alternativo */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-sidebar-primary h-[500px]">
                <div className="bg-card p-4">
                  <h3 className="flex gap-2 items-center text-lg font-bold text-foreground">
                    <MapPin size={20} />
                    Mapa Interativo
                  </h3>
                </div>

                <div className="relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.721234567890!2d-38.9668729!3d-12.2568785!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7143793755d3343%3A0xb0521fd81d69892b!2sPink%20Music!5e0!3m2!1spt-BR!2sbr!4v1723334567890!5m2!1spt-BR!2sbr"
                    width="100%"
                    height="500"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mapa interativo da Pink Music Instrumentos"
                  ></iframe>
                </div>
              </div>

              {/* Botões de Navegação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button onClick={openGoogleMaps} variant="default">
                  <Navigation size={20} />
                  <span>Abrir no Google Maps</span>
                </Button>

                <Button onClick={openWaze} variant="secondary">
                  <Navigation size={20} />
                  <span>Abrir no Waze</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

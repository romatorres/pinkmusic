"use client";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/Page-container";
import { MapPin, Navigation } from "lucide-react";
import Image from "next/image";

export default function Contact() {
  const address = {
    street1: "Loja 01 | Rua JJ Seabra, 31",
    street2: "Loja 02 | Rua JJ Seabra, 163",
    district: "Centro",
    city: "Feira de Santana",
    state: "BA",
    zipCode: "44002-000",
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
    <div className="min-h-screen">
      <PageContainer>
        <div className="flex items-center gap-2 whitespace-nowrap font-tanker text-3xl text-foreground lg:whitespace-initial pt-12">
          <div className="my-auto h-7 w-2 shrink-0 self-stretch bg-secondary" />
          <h2 className="my-auto self-stretch font-normal">Contatos</h2>
        </div>
        <div className="flex flex-col items-center justify-center md:py-6 py-2 px-4 w-full">
          <div className="w-full md:mb-16 mb-8 border border-b-[1px] border-b-ring">
            <div className="flex flex-col items-center justify-center w-full gap-2 md:p-6 p-4 ">
              <div>
                <Image
                  src="/img/icon-email_contacts.svg"
                  alt="Email"
                  width={64}
                  height={64}
                  className="aspect-square object-contain object-center sm:w-16 w-12 self-stretch flex-shrink-0 my-auto"
                />
              </div>
              <h3 className="text-primary sm:text-xl text-lg font-normal">
                E-MAIL
              </h3>
              <p className="text-foreground font-medium sm:text-2xl text-xl md:mb-10 mb-6">
                <a href="mailto:vendas@pinkmusic.com.br">
                  VENDAS@PINKMUSIC.COM.BR
                </a>
              </p>
            </div>
          </div>
          {/* Informações de Contato */}
          <div className="space-y-8 w-full">
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-8 w-full">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-location_contacts.svg"
                    alt="Localização"
                    width={48}
                    height={48}
                    className="aspect-square object-contain object-center sm:w-12 w-10 self-stretch flex-shrink-0 my-auto"
                  />
                  Nossa Localização
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {address.street1}
                      </p>
                      <p className="font-semibold text-foreground">
                        {address.street2}
                      </p>
                      <p className="text-primary">{address.district}</p>
                      <p className="text-primary">
                        {address.city} - {address.state}
                      </p>
                      <p className="text-primary">CEP: {address.zipCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-whats_contacts.svg"
                    alt="Localização"
                    width={48}
                    height={48}
                    className="aspect-square object-contain object-center sm:w-12 w-10 self-stretch flex-shrink-0 my-auto"
                  />
                  Nosso Whatsapp
                </h2>
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      <a href="https://wa.me/5575999661614" target="_blank">
                        Loja 01 | (75) 99966-1614
                      </a>
                    </p>
                    <p className="font-semibold text-foreground">
                      <a href="https://wa.me/5575991988685" target="_blank">
                        Loja 02 | (75) 99198-8685
                      </a>
                    </p>
                    <p className="text-sm text-primary">WhatsApp disponível</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-4">
                  <Image
                    src="/img/icon-horario_contacts.svg"
                    alt="Localização"
                    width={48}
                    height={48}
                    className="aspect-square object-contain object-center sm:w-12 w-10 self-stretch flex-shrink-0 my-auto"
                  />
                  Nossos Horários
                </h2>
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      Horário de Funcionamento
                    </p>
                    <p className="text-primary">Segunda a Sexta: 8h às 18h</p>
                    <p className="text-primary">Sábado: 8h às 13h</p>
                    <p className="text-primary">Domingo: Fechado</p>
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
    </div>
  );
}

"use client";

import { PageContainer } from "../ui/Page-container";
import Image from "next/image";

export default function About() {
  return (
    <section className="bg-sidebar-primary pt-10 mt-10">
      <PageContainer>
        <div className="flex w-full flex-col items-center lg:flex-row lg:justify-between">
          <div className="flex w-full flex-col items-start text-left lg:max-w-2xl">
            <div className="flex items-center gap-2 whitespace-nowrap font-tanker text-3xl text-foreground lg:whitespace-initial">
              <div className="my-auto h-7 w-2 shrink-0 self-stretch bg-secondary" />
              <h2 className="my-auto self-stretch font-normal">Sobre</h2>
            </div>

            <h3 className="mb-0 mt-2.5 font-tanker text-4xl font-normal text-primary lg:max-w-full lg:text-[52px]">
              Mais do que uma loja, uma paixão pela música.
            </h3>

            <p className="mt-6 font-inter text-lg leading-[22px] tracking-[0.36px] text-foreground lg:max-w-full">
              Localizada em Feira de Santana, na Bahia, a Pink Music é uma loja
              física com mais de 30 anos de tradição no mercado de instrumentos
              musicais e equipamentos de áudio. Nosso compromisso é oferecer
              qualidade, atendimento especializado e uma verdadeira experiência
              para músicos, produtores e apaixonados por som.
            </p>

            <div className="mt-10 flex w-full flex-wrap items-center justify-start gap-6 font-inter text-xl font-medium lg:mt-[60px] lg:max-w-full">
              <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-7 py-3 text-lg font-semibold text-white transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-secondary sm:w-auto lg:px-10 lg:py-4">
                <Image
                  src="/img/icon-store.svg"
                  alt="E-commerce Icon"
                  width={22}
                  height={22}
                  className="aspect-square object-contain"
                />
                E-commerce
              </button>
              <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap border-primary border-[1px] rounded-full bg-white px-7 py-3 text-lg font-semibold text-primary transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-background sm:w-auto lg:px-10 lg:py-4">
                <Image
                  src="/img/icon-location.svg"
                  alt="Store Localização"
                  width={22}
                  height={22}
                  className="aspect-square object-contain"
                />
                Loja Física
              </button>
            </div>
          </div>

          <div className="relative xl:w-[449px] lg:w-[80%] md:w-[60%] w-[80%] h-full aspect-[0.83] flex justify-center items-center">
            <Image
              src="/img/about.png"
              alt="Sobre Pink Music"
              fill
              className="object-contain object-center"
            />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

"use client";

import Link from "next/link";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";

export default function About() {
  return (
    <section className="bg-sidebar-primary">
      <PageContainer>
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
      </PageContainer>
    </section>
  );
}

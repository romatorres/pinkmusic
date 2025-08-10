"use client";

import { PageContainer } from "../ui/Page-container";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <section className="relative flex w-full flex-col items-center justify-center bg-[url('/img/bg-hero.jpg')] bg-cover bg-center py-20 md:min-h-[680px] md:py-28">
      <PageContainer>
        <div className="flex w-full max-w-[1440px] flex-col-reverse items-center gap-8 md:gap-4 px-4 md:flex-row md:items-center md:justify-between mt-12">
          <div className="flex flex-col items-center justify-center text-center md:w-1/2 md:items-start md:text-left">
            <h1 className="m-0 font-['Tanker'] text-5xl md:text-5xl lg:text-6xl xl:text-[80px] leading-tight text-primary  md:leading-14  lg:leading-16 xl:leading-24 lg:tracking-[3.2px]">
              Tudo para <br />
              sua música <br />
              em um só lugar!
            </h1>
            <div className="mt-8 flex w-full flex-col items-center justify-center sm:flex-row md:mt-10 md:justify-start gap-6 md:gap-4">
              <Link
                href="https://www.mercadolivre.com.br/pagina/pinkmusic"
                passHref
                target="_blank"
              >
                <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary lg:px-10 lg:py-4 md:px-7 md:py-3 px-7 py-3 text-lg font-semibold text-white transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-secondary sm:w-auto">
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
              <Link href="/store-location">
                <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap border-primary border-[1px] rounded-full bg-white lg:px-10 lg:py-4 md:px-7 md:py-3 px-7 py-3 text-lg font-semibold text-primary transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-background sm:w-auto">
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
          <div className="flex w-full items-center justify-center md:w-1/2">
            <Carousel
              plugins={[plugin.current]}
              className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
            >
              <CarouselContent>
                <CarouselItem className="flex w-full items-center justify-center">
                  <Image
                    src="/img/carousel/carousel-1.png"
                    alt="Carousel image 1"
                    width={430}
                    height={300}
                    className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
                  />
                </CarouselItem>
                <CarouselItem className="flex w-full items-center justify-center">
                  <Image
                    src="/img/carousel/carousel-2.png"
                    alt="Carousel image 2"
                    width={430}
                    height={300}
                    className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
                  />
                </CarouselItem>
                <CarouselItem className="flex w-full items-center justify-center">
                  <Image
                    src="/img/carousel/carousel-3.png"
                    alt="Carousel image 3"
                    width={430}
                    height={300}
                    className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
                  />
                </CarouselItem>
                <CarouselItem className="flex w-full items-center justify-center">
                  <Image
                    src="/img/carousel/carousel-4.png"
                    alt="Carousel image 4"
                    width={430}
                    height={300}
                    className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
                  />
                </CarouselItem>
                <CarouselItem className="flex w-full items-center justify-center">
                  <Image
                    src="/img/carousel/carousel-5.png"
                    alt="Carousel image 5"
                    width={430}
                    height={300}
                    className="h-auto w-full max-w-[85%] object-contain sm:max-w-[75%] md:max-w-[85%] lg:max-w-[90%] xl:max-w-[430px]"
                  />
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

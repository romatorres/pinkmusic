"use client";

import React from "react";
import ProductCard from "./ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const Products: React.FC = () => {
  const products = [
    {
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/b2de47d3b1ff6274693603d4712d7dd91dacbf06?placeholderIfAbsent=true",
      title: "Violão Takamine GD14",
      price: "5.590",
      addToCartIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/f8e06c367bcd69edc7e979b31e31ae4f8d0aba08?placeholderIfAbsent=true",
      detailsIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/6d387cb1dc9b1e1838e82e7f1d38f42941d46279?placeholderIfAbsent=true",
    },
    {
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/87f4370f0ea9f3b250d87c12a2acd7ed03192bdb?placeholderIfAbsent=true",
      title: "Violão Takamine GD14",
      price: "5.590",
      addToCartIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/d122c206894981f19354de9cf86a694ed22dbc95?placeholderIfAbsent=true",
      detailsIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/d6a052ef54b466ef261cfea8d272d80fa9d9a5c8?placeholderIfAbsent=true",
    },
    {
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/b2de47d3b1ff6274693603d4712d7dd91dacbf06?placeholderIfAbsent=true",
      title: "Violão Takamine GD14",
      price: "5.590",

      addToCartIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/06f5183c8767e05a92ef1eafaea043f32b39b4f1?placeholderIfAbsent=true",
      detailsIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/6d387cb1dc9b1e1838e82e7f1d38f42941d46279?placeholderIfAbsent=true",
    },
    {
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/585a57e57640569883e07eecc02d7e6dd782a609?placeholderIfAbsent=true",
      title: "Violão Takamine GD14",
      price: "5.590",
      addToCartIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/a791f9e67e8b2f009014bccaf4599048444e0028?placeholderIfAbsent=true",
      detailsIcon:
        "https://api.builder.io/api/v1/image/assets/TEMP/0f0094aeaa72ac4ac4b6d3d7ee40ca1b6616fc47?placeholderIfAbsent=true",
    },
  ];

  // Duplicate products to create the grid layout
  const allProducts = [...products, ...products];

  return (
    <section className="self-center flex mt-[85px] w-full max-w-[1440px] flex-col items-stretch justify-between lg:mt-10 lg:max-w-full">
      <div className="flex w-full flex-col py-0.5">
        {/* Grid for medium screens and up */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 px-5 mx-auto max-w-[1200px]">
          {allProducts.map((product, index) => (
            <ProductCard
              key={index}
              {...product}
              className={`product-${index}`}
            />
          ))}
        </div>

        {/* Carousel for small screens */}
        <div className="md:hidden px-5">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-[640px] mx-auto"
          >
            <CarouselContent>
              {allProducts.map((product, index) => (
                <CarouselItem key={index} className="basis-[296px]">
                  <ProductCard {...product} className={`product-${index}`} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <button className="rounded-3xl self-center flex items-center gap-3 text-primary hover:text-white justify-center px-10 py-3 text-base font-medium border border-primary bg-transparent cursor-pointer transition-colors ease-in-out duration-300 hover:bg-secondary mt-[50px] lg:mt-10">
          Ver Todos
          <img
            src="/img/icon-arrow_forward.svg"
            alt="Arrow"
            className="aspect-square object-contain object-center w-5 self-stretch shrink-0 my-auto"
          />
        </button>
      </div>
    </section>
  );
};

export default Products;

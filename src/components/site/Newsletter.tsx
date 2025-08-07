"use client";

import React, { useState } from "react";
import { PageContainer } from "../ui/Page-container";

export default function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <section className="flex w-full flex-col justify-center bg-tertiary">
      <PageContainer>
        <div className="flex flex-col lg:flex-row flex-wrap justify-between items-center py-12">
          <div className="flex flex-col items-start justify-start flex-1/3 font-normal">
            <h2 className="mb-2 font-tanker text-3xl leading-none tracking-[0.6px] text-primary">
              Assine nossa newsletter!
            </h2>
            <p className="m-0 text-lg max-w-80 leading-[22px] tracking-[0.36px] text-foreground">
              Cadastre-se e fique por dentro das nossas novidades e ofertas!
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col lg:flex-row flex-1/2 my-6 w-full items-center justify-center gap-6"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-MAIL"
              className="placeholder:text-primary/70 my-auto w-full rounded-full border border-primary bg-transparent px-7 py-4 text-xl font-medium leading-[1.3] text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 lg:whitespace-normal"
              required
            />
            <button
              type="submit"
              className="my-auto flex w-full lg:w-80 cursor-pointer self-stretch items-center justify-center rounded-full border-none bg-primary py-4 text-xl font-medium leading-[1.3] text-background transition-colors duration-300 ease-in-out hover:bg-primary/80 lg:whitespace-normal"
            >
              Assinar
            </button>
          </form>
        </div>
      </PageContainer>
    </section>
  );
}

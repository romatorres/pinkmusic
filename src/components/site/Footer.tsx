"use client";

import Image from "next/image";
import { PageContainer } from "../ui/Page-container";

export default function Footer() {
  return (
    <footer className="bg-primary md:py-10 py-6">
      <PageContainer>
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <a href="#">
            <Image
              src="/img/logo-pink_wh.svg"
              alt="Logomarca"
              width={128}
              height={60}
              className="md:w-32 w-28"
            />
          </a>
          <div className="text-center text-sm md:text-base text-white">
            © 2025 Copyright Pink Music Instrumentos Musicais
          </div>
          <a
            href="https://romatorres.dev.br/"
            target="_blank"
            className="flex gap-2"
          >
            <p className="text-xs text-white">by</p>
            <Image
              src="/img/logo-roma.svg"
              alt="Logo Parceiro"
              width={28}
              height={28}
              className="md:w-7 w-6.5"
            />
          </a>
        </div>
      </PageContainer>
    </footer>
  );
}

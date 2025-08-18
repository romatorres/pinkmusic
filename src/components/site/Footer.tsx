"use client";

import Image from "next/image";
import { PageContainer } from "../ui/Page-container";

export default function Footer() {
  return (
    <footer className="bg-primary md:py-10 py-6">
      <PageContainer>
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <a href="#home">
            <Image
              src="/img/logo-pink_wh.svg"
              alt="Logomarca"
              width={128}
              height={60}
            />
          </a>
          <div className="text-center text-sm md:text-base text-white">
            © 2025 Copyright Pink Music Instrumentos Musicais
          </div>
          <a
            href="https://wa.me/75991340520"
            target="_blank"
            className="flex gap-2"
          >
            <p className="text-sm text-white">by</p>
            <Image
              src="/img/logo-roma.svg"
              alt="Logo Parceiro"
              width={28}
              height={28}
            />
          </a>
        </div>
      </PageContainer>
    </footer>
  );
}

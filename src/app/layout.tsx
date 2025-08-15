import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import LayoutWrapper from "@/components/site/LayoutWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Carregar a fonte Tanker
const tanker = {
  src: "https://fonts.cdnfonts.com/s/13352/Tanker.woff",
  style: { fontFamily: "Tanker" },
};

export const metadata: Metadata = {
  title: "Pink Music",
  description: "Esta é a pagina da loja Pink Music Instrumentos Musicais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.cdnfonts.com/css/tanker" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans`} cz-shortcut-listen="true">
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster />
      </body>
    </html>
  );
}

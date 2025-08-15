import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import LayoutWrapper from "@/components/site/LayoutWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
        <link 
          href="https://fonts.cdnfonts.com/css/tanker" 
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.variable} font-sans`} cz-shortcut-listen="true">
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster />
      </body>
    </html>
  );
}

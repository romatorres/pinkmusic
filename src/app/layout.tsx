import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import LayoutWrapper from "@/components/site/_components/LayoutWrapper";
import ConditionalWhatsApp from "@/components/whatsapp/ConditionalWhatsApp";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Pink Music",
  description: "Esta é a pagina da loja Pink Music Instrumentos Musicais",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pink Music",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="font-sans antialiased" cz-shortcut-listen="true">
        <LayoutWrapper>{children}</LayoutWrapper>
        <Analytics />
        {/* Botão WhatsApp */}
        <ConditionalWhatsApp />
        <Toaster />
      </body>
    </html>
  );
}

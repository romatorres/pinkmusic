"use client";

import { usePathname } from "next/navigation";
import WhatsAppButton from "./WhatsAppButton";

export default function ConditionalWhatsApp() {
  const pathname = usePathname();

  const excludedRoutes = ["/login", "/dashboard"];

  const shouldHideButton = excludedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (shouldHideButton) return null;

  return (
    <WhatsAppButton
      phoneNumber="5575991988685"
      message="Olá! Vi seu site e gostaria de mais informações."
    />
  );
}

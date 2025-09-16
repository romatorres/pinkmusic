"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noHeaderFooter = ["/login", "/register", "/dashboard"];

  const showHeaderFooter = !noHeaderFooter.some((path) =>
    pathname.startsWith(path)
  );

  if (showHeaderFooter) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
}

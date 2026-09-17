"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import TopBar from "../TopBar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noHeaderFooter = ["/login", "/register", "/dashboard", "/_not-found"];

  const showHeaderFooter = !noHeaderFooter.some((path) =>
    pathname.startsWith(path)
  );

  if (showHeaderFooter) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
}

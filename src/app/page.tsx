import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Partners from "@/components/site/Partners";
import Products from "@/components/site/Products";
import About from "@/components/site/About";
import Newsletter from "@/components/site/Newsletter";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center">
      <div className="relative w-full">
        <Header />
        <Hero />
        <Partners />
        <Products />
        <About />
        <Newsletter />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}

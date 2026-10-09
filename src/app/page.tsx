import Hero from "@/components/site/Hero";
import Partners from "@/components/site/Partners";
import Products from "@/components/site/Products/Products";
import About from "@/components/site/About";
import Newsletter from "@/components/site/Newsletter";
import { CategoriesSection } from "@/components/site/Categories";


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center">
      <div className="relative w-full">
        <Hero />
        <Partners />
        <CategoriesSection />

        {/* Mais Procurados — 4 produtos (1 linha tradicional no desktop) */}
        <Products
          title="Mais Procurados"
          subtitle="Os instrumentos e equipamentos favoritos dos nossos músicos."
          limit={4}
          showSeeAllButton={false}
          randomizeProducts={true}
        />

        {/* Ofertas Especiais — 4 produtos com desconto (1 linha tradicional) */}
        <Products
          title="Ofertas"
          subtitle="Preços especiais por tempo limitado."
          limit={4}
          hasDiscount={true}
          showSeeAllButton={true}
          randomizeProducts={true}
        />
        <Newsletter />
        <section id="about">
          <About />
        </section>

      </div>
    </main>
  );
}

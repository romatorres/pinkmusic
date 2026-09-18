import Hero from "@/components/site/Hero";
import Partners from "@/components/site/Partners";
import Products from "@/components/site/Products/Products";
import About from "@/components/site/About";
import Newsletter from "@/components/site/Newsletter";


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center">
      <div className="relative w-full">
        <Hero />
        <Partners />
        <Products
          limit={12}
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

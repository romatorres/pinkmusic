import Header from "@/components/site/Header";
import Products from "@/components/site/Products";
import { PageContainer } from "@/components/ui/Page-container";

export default function ProductAll() {
  return (
    <section>
      <PageContainer>
        <Header />
        <div className="mt-32">
          <Products limit={20} showPagination={true} showSeeAllButton={false} />
        </div>
      </PageContainer>
    </section>
  );
}

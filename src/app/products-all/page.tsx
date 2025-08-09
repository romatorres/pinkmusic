import Products from "@/components/site/Products";
import { PageContainer } from "@/components/ui/Page-container";

export default function ProductAll() {
  return (
    <section>
      <PageContainer>
        <Products limit={20} showPagination={true} showSeeAllButton={false} />
      </PageContainer>
    </section>
  );
}

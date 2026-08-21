import { Suspense } from "react";
import { QuoteDetailPage } from "@/modules/quotes";

export default async function QuoteDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <QuoteDetailPage quoteId={id} />
    </Suspense>
  );
}

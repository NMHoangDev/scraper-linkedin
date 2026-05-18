import { Suspense } from "react";
import ZaloGroupPageClient from "./ZaloGroupPageClient";

export function generateStaticParams() {
  return [];
}

export default function ZaloGroupPage() {
  return (
    <Suspense>
      <ZaloGroupPageClient />
    </Suspense>
  );
}

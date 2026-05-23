"use client";

import CombinedCrawlForm from "@/components/nguyen/modules/crawldFB/components/CombinedCrawlForm";

export default function CrawlDataPage() {
  return (
    <div className="bg-surface min-h-full w-full py-lg">
      <div className="mx-auto w-full max-w-4xl px-md">
        <CombinedCrawlForm onSuccess={() => window.location.href = '/'} />
      </div>
    </div>
  );
}

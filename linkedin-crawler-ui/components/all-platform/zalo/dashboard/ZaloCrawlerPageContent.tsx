"use client";

import { useZaloCrawlerFlow } from "@/hooks/useZaloCrawlerFlow";
import { ZaloChatView } from "./ZaloChatView";
import { useRouter } from "next/navigation";

export function ZaloCrawlerPageContent() {
  const flow = useZaloCrawlerFlow();
  const router = useRouter();

  function handleBackToDashboard() {
    router.push("/all-platform/tai-khoan");
  }

  return (
    <div className="flex flex-col gap-md h-full p-2">
      <ZaloChatView flow={flow} onBackToDashboard={handleBackToDashboard} />
    </div>
  );
}
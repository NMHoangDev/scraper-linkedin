"use client";

import { useZaloCrawlerFlow } from "@/hooks/useZaloCrawlerFlow";
import { ZaloDashboardView } from "./ZaloDashboardView";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ZaloAccountsPageContent() {
  const flow = useZaloCrawlerFlow();
  const router = useRouter();

  function handleEnterChat(accountId: string) {
    if (accountId !== flow.userId) {
      flow.switchAccount(accountId);
    }
    // Navigate tới trang chat full-screen (không có sidebar menu)
    router.push("/zalo-chat");
  }

  return (
    <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white p-3 sm:p-6">
      <ZaloDashboardView flow={flow} onEnterChat={handleEnterChat} />
    </div>
  );
}

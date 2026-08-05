import { CrmShell } from "@/modules/crm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM — Quản lý Pipeline Bán hàng - Markee",
  description: "Trang CRM quản lý pipeline khách hàng với 8 stages và kéo-thả có validation.",
};

export default function CrmRoute() {
  return <CrmShell />;
}

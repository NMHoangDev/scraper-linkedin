import CrmMarkeeChatPage from "@/components/all-platform/crmmarkeechat/CrmMarkeeChatPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM Markee Chat — Demo UI Pipeline Bán hàng - Markee",
  description: "Bản demo UI CRM (port từ Chatwoot/Vue) với dữ liệu mock cục bộ, không kết nối backend thật.",
};

export default function CrmMarkeeChatRoute() {
  return <CrmMarkeeChatPage />;
}

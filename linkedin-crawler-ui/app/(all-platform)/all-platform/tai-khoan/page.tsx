import { Metadata } from "next";
import { ZaloInboxAdminShell } from "@/components/all-platform/zalo/admin-inbox/ZaloInboxAdminShell";

export const metadata: Metadata = {
  title: "Zalo Inbox | Quản lý hội thoại đa tài khoản",
  description: "Quản lý hội thoại Zalo, xem trạng thái online/offline, theo dõi KPI inbox.",
};

export default function AccountsPage() {
  return (
    <div className="w-full">
      <ZaloInboxAdminShell />
    </div>
  );
}
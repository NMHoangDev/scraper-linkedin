import CrmCustomersPage from "@/components/all-platform/customers/CrmCustomersPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Khách hàng CRM - Markee",
  description: "Quản lý khách hàng CRM từ Facebook Inbox, Zalo, FB Group",
};

export default function CustomersRoute() {
  return <CrmCustomersPage />;
}

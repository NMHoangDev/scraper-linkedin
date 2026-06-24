import CustomerLeadsPage from "@/components/all-platform/customers/CustomerLeadsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Khách hàng - Markee",
  description: "Quản lý khách hàng từ Facebook Inbox",
};

export default function CustomersRoute() {
  return <CustomerLeadsPage />;
}

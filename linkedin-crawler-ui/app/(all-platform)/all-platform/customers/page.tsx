import { redirect } from "next/navigation";

/**
 * Route cũ "/all-platform/customers" — đã được đổi tên thành
 * "/all-platform/crm". Vẫn support link cũ bằng cách redirect.
 */
export default function LegacyCustomersRoute() {
  redirect("/all-platform/crm");
}

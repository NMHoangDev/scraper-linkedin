"use client";

import { redirect } from "next/navigation";

// 2026-07-23: Quản lý người dùng đã gộp vào Quản lý thành viên (1 bảng duy
// nhất — email/role/trạng thái theo dõi ngay trên từng dòng thành viên).
// Giữ route này lại (không xoá hẳn) để link/bookmark cũ không vỡ, chỉ
// redirect sang trang gộp.
export default function AllPlatformQuanLyNguoiDungPage() {
  redirect("/all-platform/admin/quan-ly-thanh-vien");
}

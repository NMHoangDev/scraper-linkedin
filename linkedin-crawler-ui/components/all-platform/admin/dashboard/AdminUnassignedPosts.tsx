"use client";

import { MaterialIcon } from "@/components/ui";

// Mock data for high scoring posts that need assignment
const unassignedPosts = [
  {
    id: 1,
    title: "Tuyển dụng Marketing Manager lương 2000$",
    group: "Tuyển dụng Marketing & Communications",
    score: 95,
    time: "2 giờ trước"
  },
  {
    id: 2,
    title: "Cần tìm Agency thiết kế Website Bất động sản",
    group: "Cộng đồng thiết kế website giá rẻ",
    score: 92,
    time: "3 giờ trước"
  },
  {
    id: 3,
    title: "Share bộ tài liệu SEO 2026 mới nhất",
    group: "Hội thiết kế website và SEO web",
    score: 88,
    time: "5 giờ trước"
  },
  {
    id: 4,
    title: "Tìm người chạy Ads ngân sách 100M/tháng",
    group: "Cộng đồng Digital Marketing VN",
    score: 85,
    time: "1 ngày trước"
  }
];

export function AdminUnassignedPosts() {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-5 flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <MaterialIcon name="assignment" className="text-primary text-[18px]" />
          Bài post điểm cao chưa Assign
        </h3>
        <span className="text-[10px] font-bold text-primary bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
          {unassignedPosts.length} bài viết
        </span>
      </div>

      <div className="flex flex-col divide-y divide-outline-variant flex-1">
        {unassignedPosts.map((post) => (
          <div key={post.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div className="flex flex-col min-w-0 flex-1">
              <a href="#" className="font-bold text-sm text-on-surface hover:text-blue-600 truncate mb-1 transition-colors">
                {post.title}
              </a>
              <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-medium">
                <span className="flex items-center gap-1 truncate">
                  <MaterialIcon name="groups" className="text-[12px]" />
                  <span className="truncate">{post.group}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <MaterialIcon name="history" className="text-[12px]" />
                  {post.time}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Điểm: {post.score}
              </span>
              <button className="bg-primary hover:bg-on-primary-fixed-variant text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm active:scale-95 flex items-center gap-1">
                <MaterialIcon name="person_add" className="text-[12px]" />
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

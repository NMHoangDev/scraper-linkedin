"use client";

import { MaterialIcon } from "@/components/ui";
import type { AdminLeaderboardsData } from "@/services/all-platform.service";
import { FaCrown, FaShareAlt, FaEye } from "react-icons/fa";

interface AdminLeaderboardsProps {
  data: AdminLeaderboardsData | null;
  isLoading: boolean;
}

export function AdminLeaderboards({ data, isLoading }: AdminLeaderboardsProps) {
  if (isLoading || !data) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 mt-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] flex items-center justify-center w-full lg:w-[60%]">
          <div className="w-6 h-6 border-3 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] flex items-center justify-center w-full lg:w-[40%]">
          <div className="w-6 h-6 border-3 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const { top_seeders = [], top_groups = [] } = data;

  return (
    <div className="flex flex-col lg:flex-row gap-4 mt-4">
      {/* Top Seeders - 60% */}
      <div className="w-full lg:w-[60%] bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FaCrown className="text-amber-500 text-base" />
              Bảng xếp hạng Seeders
            </h3>
            <p className="text-xs text-slate-500 font-medium">Top 5 thành viên thực hiện seeding thành công nhiều nhất</p>
          </div>
        </div>

        {top_seeders.length === 0 ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center text-slate-400 text-xs italic">
            Chưa có dữ liệu Seeding được duyệt.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-3 px-2 text-xs font-bold text-slate-500">Hạng</th>
                  <th className="py-3 px-2 text-xs font-bold text-slate-500">Thành viên</th>
                  <th className="py-3 px-2 text-xs font-bold text-slate-500 text-right">Thành công</th>
                  <th className="py-3 px-2 text-xs font-bold text-slate-500 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {top_seeders.map((seeder, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-slate-100 text-slate-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-50 text-slate-400"
                      }`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          <FaEye className="text-slate-400 text-[10px]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{seeder.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium truncate">{seeder.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-xs font-bold text-slate-800">
                        {seeder.count}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-1 rounded-md">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Groups - 40% */}
      <div className="w-full lg:w-[40%] bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FaShareAlt className="text-blue-500 text-sm" />
              Top Group Tương Tác
            </h3>
            <p className="text-xs text-slate-500 font-medium">Top 5 nhóm có lượt tương tác cao nhất</p>
          </div>
        </div>

        {top_groups.length === 0 ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center text-slate-400 text-xs italic">
            Chưa thu thập được dữ liệu tương tác nhóm nào.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-start">
            {top_groups.map((group, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-2 rounded-xl transition">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a 
                      href={group.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {group.name}
                    </a>
                    <div className="text-[10px] text-slate-500 font-medium truncate">{group.url}</div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-md">
                    {group.interactions.toLocaleString()} tương tác
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

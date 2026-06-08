"use client";

import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { UnifiedPost } from "@/types/unified.types";

interface PostDetailModalProps {
  post: UnifiedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify?: (post: UnifiedPost) => void;
  verifyStatus?: "pending" | "yes" | "no";
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  onVerify,
  verifyStatus,
}: PostDetailModalProps) {
  if (!isOpen || !post) return null;

  const handleView = () => {
    window.open(post.post_url, "_blank");
  };

  const score = post.score || 0;
  let scoreBg = "bg-slate-100 text-slate-700 border-slate-200";
  if (score >= 85) scoreBg = "bg-red-50 text-[#E3000F] border-red-100";
  else if (score >= 60) scoreBg = "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {post.platform === "facebook" ? (
              <FaFacebook className="text-blue-600" />
            ) : (
              <FaLinkedin className="text-blue-700" />
            )}
            Chi tiết bài viết
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-4 items-start mb-6">
            <div className={cn("w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border", scoreBg)}>
              <span className="text-2xl font-black leading-tight">{score}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter mt-0.5 opacity-80">AI Score</span>
            </div>
            <div>
              <a 
                href={post.post_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base font-bold text-slate-900 hover:text-indigo-600 hover:underline mb-2 block"
              >
                {post.group_name || "Unknown Group"}
              </a>
              <div className="flex flex-wrap gap-2 mb-2">
                {post.intent && <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">{post.intent}</span>}
                {post.industry && <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">{post.industry}</span>}
                {post.icp && <span className="rounded bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-600">{post.icp}</span>}
                {post.team && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">{post.team}</span>}
                {post.tier !== undefined && <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600">Tier {post.tier}</span>}
              </div>
              <span className="text-xs text-slate-500 font-medium block mt-2">
                Đăng lúc: {post.post_time ? new Date(post.post_time).toLocaleString("vi-VN") : "Không rõ"} • Cào lúc: {post.crawl_date ? new Date(post.crawl_date).toLocaleString("vi-VN") : ""}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 mb-6">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {post.content || "Nội dung bài viết rỗng hoặc chứa thuần hình ảnh/video."}
            </p>
          </div>

          {post.seeding_content && (
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/50 px-2 py-0.5 rounded">Tài khoản Seeding:</span>
                <span className="text-sm font-bold text-slate-800">{post.seeding_name || "Unknown"}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic border-l-4 border-emerald-300 pl-3 py-1">
                {post.seeding_content}
              </p>
              {post.link_comment && (
                <div className="mt-3">
                  <a href={post.link_comment} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm transition hover:shadow">
                    <FiExternalLink className="w-4 h-4" /> Đi tới bình luận trên Facebook
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/60 text-amber-700 rounded-lg text-sm font-bold border border-amber-100/40">
              👍 {post.reactions?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold border border-slate-200/50">
              💬 {post.comments?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100/50">
              🔁 {post.shares?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div>
            {verifyStatus === "yes" ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-green-100 text-green-700 border-green-200">
                ✓ Đã xác minh seeding
              </span>
            ) : verifyStatus === "pending" ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                ✓ Đã seeding
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-100 text-slate-500 border-slate-200">
                Chưa seeding
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition shadow-xs"
            >
              Đóng
            </button>
            <button
              onClick={handleView}
              className="px-4 py-2 bg-white border border-[#E3000F] text-[#E3000F] hover:bg-[#E3000F] hover:text-white rounded-xl text-sm font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <FiExternalLink />
              Xem chi tiết
            </button>
            {onVerify && !(post.seeding_content && post.link_comment) && (
              <button
                onClick={() => onVerify(post)}
                className="px-5 py-2 bg-gradient-to-r from-[#E3000F] to-[#C40009] hover:from-[#C40009] hover:to-[#E3000F] text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Xác minh seeding
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

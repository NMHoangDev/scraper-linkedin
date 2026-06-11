"use client";

import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { UnifiedPost, FeedPlatform } from "@/types/unified.types";

interface PostCardProps {
  post: UnifiedPost;
  userRole?: string;
  onVerify?: (post: UnifiedPost) => void;
  onSeeding?: (post: UnifiedPost) => void;
  onViewDetail?: (post: UnifiedPost) => void;
  seeded?: boolean;
  verifyStatus?: "pending" | "yes" | "no";
}

function PlatformIcon({ platform }: { platform: FeedPlatform }) {
  if (platform === "facebook") {
    return <FaFacebook className="text-blue-600 shrink-0" />;
  }
  return <FaLinkedin className="text-blue-700 shrink-0" />;
}

export function PostCard({ post, userRole, onVerify, onSeeding, onViewDetail, seeded, verifyStatus }: PostCardProps) {
  const handleView = () => {
    if (onViewDetail) {
      onViewDetail(post);
    } else {
      window.open(post.post_url, "_blank");
    }
  };

  const handleVerify = () => {
    if (onVerify) {
      handleView();
      onVerify(post);
    }
  };

  const score = post.score || 0;
  let scoreBg = "bg-slate-100 text-slate-700 border-slate-200";
  if (score >= 85) scoreBg = "bg-red-50 text-[#E3000F] border-red-100";
  else if (score >= 60) scoreBg = "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex gap-4 items-start transition duration-200 hover:border-slate-300">
      {/* KHỐI AI SCORE BÊN TRÁI */}
      <div className={cn("w-[60px] h-[60px] rounded-xl flex flex-col items-center justify-center shrink-0 border", scoreBg)}>
        <span className="text-xl font-black leading-tight">{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5 opacity-80">AI Score</span>
      </div>

      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <PlatformIcon platform={post.platform} />
            <a 
              href={post.post_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-900 hover:text-indigo-600 hover:underline truncate max-w-[220px]"
            >
              {post.group_name || "Unknown Group"}
            </a>

            {post.intent && (
              <span className="shrink-0 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                {post.intent}
              </span>
            )}
            {post.industry && (
              <span className="shrink-0 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                {post.industry}
              </span>
            )}
            {post.icp && (
              <span className="shrink-0 rounded bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-600">
                {post.icp}
              </span>
            )}
            {post.team && (
              <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                {post.team}
              </span>
            )}
            {post.tier !== undefined && (
              <span className="shrink-0 rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                Tier {post.tier}
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-400 shrink-0 font-medium text-right leading-tight">
            <span className="block">
              {post.crawl_date ? new Date(post.crawl_date).toLocaleDateString("vi-VN") : ""}
              {post.posted_at ? ` • ${new Date(post.posted_at).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}` : ""}
            </span>
          </span>
        </div>

        {/* Nội dung */}
        <p className="text-xs text-slate-700 italic line-clamp-2 leading-relaxed bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100/60 mb-2">
          "{post.content || "Nội dung bài viết rỗng hoặc chứa thuần hình ảnh/video."}"
        </p>

        {post.seeding_content && (
          <div className="mb-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Đã seeding bằng tài khoản:</span>
              <span className="text-xs font-bold text-slate-800">{post.seeding_name || "Unknown"}</span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none mr-1">"</span>
              {post.seeding_content}
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none ml-1">"</span>
            </p>
            {post.link_comment && (
              <a href={post.link_comment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                Xem bình luận <FiExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/60 text-amber-700 rounded-md text-[11px] font-bold border border-amber-100/40" title="Lượt thích/Cảm xúc">
              👍 {post.reactions?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold border border-slate-200/50" title="Lượt bình luận">
              💬 {post.comments?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold border border-blue-100/50" title="Lượt chia sẻ">
              🔁 {post.shares?.toLocaleString() || 0}
            </span>

            {(userRole === "admin" || userRole === "leader") && post.crawler_name && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-[11px] font-medium border border-slate-200/50">
                👤 {post.crawler_name}
                {userRole === "admin" && post.crawler_team ? ` - ${post.crawler_team}` : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {verifyStatus === "yes" ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-green-100 text-green-700 border-green-200">
                ✓ Đã xác minh
              </span>
            ) : verifyStatus === "pending" ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                ✓ Đã seeding
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                Chưa seeding
              </span>
            )}



            <button
              type="button"
              onClick={handleView}
              className="px-4 py-1.5 bg-white border border-[#E3000F] text-[#E3000F] hover:bg-[#E3000F] hover:text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Xem chi tiết
            </button>

            {onVerify && !(post.seeding_content && post.link_comment) && (
              <button
                type="button"
                onClick={handleVerify}
                className="group relative px-3 py-1.5 bg-gradient-to-r from-[#E3000F] to-[#C40009] hover:from-[#C40009] hover:to-[#E3000F] text-white rounded-lg text-[11px] font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Xác minh
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

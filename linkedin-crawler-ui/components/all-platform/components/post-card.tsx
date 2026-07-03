"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);

  const INBOX_TEMPLATES = [
    {
      category: "Dịch vụ Website",
      templates: [
        {
          title: "Thiết kế Web Doanh Nghiệp",
          content: "Chào bạn, mình thấy bạn đang có nhu cầu phát triển kinh doanh. Bên mình chuyên thiết kế Website chuyên nghiệp, chuẩn SEO và tối ưu chuyển đổi. Một Website xịn sẽ là 'nhân viên sale' làm việc 24/7 cho bạn. Bạn có muốn mình gửi thêm một số mẫu Web bên mình đã làm để tham khảo không?"
        },
        {
          title: "Tối ưu/Nâng cấp Web hiện tại",
          content: "Dạ chào anh/chị, em thấy lĩnh vực của mình rất tiềm năng. Không biết hiện tại anh/chị đã có Website riêng để đẩy mạnh thương hiệu chưa ạ? Bên em nhận thiết kế mới và nâng cấp Website với chi phí cực kì hợp lý. Anh/chị check tin nhắn để em tư vấn chi tiết hơn nhé!"
        }
      ]
    },
    {
      category: "Chatbot AI & CSKH",
      templates: [
        {
          title: "Chatbot AI Chăm sóc khách hàng",
          content: "Chào bạn, mình thấy mảng dịch vụ của bạn thường xuyên phải trả lời nhiều câu hỏi từ khách hàng. Bên mình đang cung cấp giải pháp Chatbot AI thông minh có khả năng tự động trả lời, tư vấn và chốt đơn 24/7 như người thật. Mình gửi bạn xem thử bản demo Chatbot AI bên mình nhé?"
        },
        {
          title: "Tích hợp AI tư vấn chuyên sâu",
          content: "Dạ chào anh/chị, em chuyên triển khai các hệ thống Chatbot AI (Tích hợp ChatGPT/Claude) vào quy trình chăm sóc khách hàng. Chatbot bên em có thể học theo data riêng của doanh nghiệp để tư vấn cá nhân hóa. Anh/chị có hứng thú nâng cấp hệ thống CSKH của mình không ạ?"
        }
      ]
    },
    {
      category: "n8n & Tự động hoá",
      templates: [
        {
          title: "Giải pháp Automation (n8n)",
          content: "Xin chào! Mình thấy quy trình vận hành của bạn đang phải xử lý thủ công khá nhiều bước. Bên mình chuyên thiết kế các luồng tự động hoá bằng n8n, giúp đồng bộ dữ liệu giữa các nền tảng hoàn toàn tự động. Việc này sẽ giúp bạn giảm thiểu sai sót và tối ưu hiệu suất x10 lần. Mình trao đổi thêm nhé?"
        },
        {
          title: "Tối ưu quy trình đa nền tảng",
          content: "Chào anh/chị, việc lặp đi lặp lại các tác vụ thủ công thường tốn rất nhiều nguồn lực. Bên em cung cấp giải pháp Tự động hoá doanh nghiệp với n8n, giúp tự động kết nối các phần mềm (Lead FB -> Zalo -> CRM). Chi phí triển khai 1 lần, dùng trọn đời. Anh/chị check inbox em gửi demo nhé!"
        }
      ]
    }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setIsInboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const isRejected = (link?: string) => {
    return link && link.startsWith("Bị từ chối");
  };

  const score = post.score || 0;
  let scoreBg = "bg-surface-container-low text-on-surface-variant border-outline-variant";
  if (score >= 85) scoreBg = "bg-primary/10 text-primary border-primary/20";
  else if (score >= 60) scoreBg = "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-md flex gap-md items-start transition duration-200 hover:border-primary/30">
      {/* KHỐI AI SCORE BÊN TRÁI */}
      <div className={cn("w-[60px] h-[60px] rounded-lg flex flex-col items-center justify-center shrink-0 border", scoreBg)}>
        <span className="text-xl font-black leading-tight">{score}</span>
        <span className="text-[10px] font-semibold mt-0.5 opacity-80">AI Score</span>
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
              className="text-body-sm font-semibold text-on-surface hover:text-primary hover:underline truncate max-w-[220px]"
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

          <span className="text-body-sm text-on-surface-variant shrink-0 font-medium text-right leading-tight">
            <span className="block">
              {post.crawl_date ? new Date(post.crawl_date).toLocaleDateString("vi-VN") : ""}
              {post.posted_at ? ` • ${new Date(post.posted_at).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}` : ""}
            </span>
          </span>
        </div>

        {/* Nội dung */}
        <p className="text-body-sm text-on-surface italic line-clamp-2 leading-relaxed bg-surface-container-low px-sm py-xs rounded-lg border border-outline-variant mb-sm">
          "{post.content || "Nội dung bài viết rỗng hoặc chứa thuần hình ảnh/video."}"
        </p>

        {(userRole === "admin" || userRole === "leader") && post.all_seedings && post.all_seedings.length > 0 ? (
          <div className="mb-3 flex flex-col gap-2">
            {post.all_seedings.map((seed, idx) => (
              <div key={idx} className="px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600">Đã seeding bởi <span className="font-bold text-on-surface">{seed.member_name}</span> (Tài khoản: {seed.seeding_name || "Unknown"}):</span>
                </div>
                <p className="text-body-sm text-on-surface-variant line-clamp-2">
                  <span className="text-emerald-500 font-serif font-bold text-lg leading-none mr-1">"</span>
                  {seed.seeding_content}
                  <span className="text-emerald-500 font-serif font-bold text-lg leading-none ml-1">"</span>
                </p>
                <div className="flex items-center justify-between mt-1">
                  {seed.link_comment && !isRejected(seed.link_comment) && (
                    <a href={seed.link_comment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                      Xem bình luận <FiExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {seed.link_comment && isRejected(seed.link_comment) && (
                    <span className="text-[10px] font-medium text-red-600 inline-flex items-center gap-1">
                      Bị từ chối / Lỗi
                    </span>
                  )}
                  {seed.verify_status === "yes" && !isRejected(seed.link_comment) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">✓ Đã xác minh</span>
                  ) : seed.verify_status === "yes" && isRejected(seed.link_comment) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">X Bị từ chối</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Chờ xác minh</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : post.seeding_content ? (
          <div className="mb-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-600">Đã seeding bằng tài khoản:</span>
              <span className="text-body-sm font-bold text-on-surface">{post.seeding_name || "Unknown"}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant line-clamp-2">
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none mr-1">"</span>
              {post.seeding_content}
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none ml-1">"</span>
            </p>
            {post.link_comment && !isRejected(post.link_comment) && (
              <a href={post.link_comment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                Xem bình luận <FiExternalLink className="w-3 h-3" />
              </a>
            )}
            {post.link_comment && isRejected(post.link_comment) && (
              <span className="text-[10px] font-medium text-red-600 inline-flex items-center gap-1 mt-0.5">
                Bị từ chối / Lỗi
              </span>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/60 text-amber-700 rounded-md text-[11px] font-bold border border-amber-100/40" title="Lượt thích/Cảm xúc">
              👍 {post.reactions?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-md text-[11px] font-bold border border-outline-variant" title="Lượt bình luận">
              💬 {post.comments?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold border border-blue-100/50" title="Lượt chia sẻ">
              🔁 {post.shares?.toLocaleString() || 0}
            </span>

            {(userRole === "admin" || userRole === "leader") && post.crawler_name && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-md text-[11px] font-medium border border-outline-variant">
                👤 {post.crawler_name}
                {userRole === "admin" && post.crawler_team ? ` - ${post.crawler_team}` : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(verifyStatus === "yes" || verifyStatus === "pending") && isRejected(post.link_comment) ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-red-100 text-red-700 border-red-200">
                X Bị từ chối
              </span>
            ) : verifyStatus === "yes" || verifyStatus === "pending" ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                ✓ Đã comment
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-surface-container-low text-on-surface-variant border-outline-variant">
                Chưa seeding
              </span>
            )}



            <button
              type="button"
              onClick={handleView}
              className="px-md py-xs bg-surface border border-primary text-primary hover:bg-primary hover:text-on-primary rounded-lg text-body-sm font-semibold transition shadow-sm cursor-pointer"
            >
              Xem chi tiết
            </button>



            {/* Inbox ngay */}
            {post.author_url && (
              <div className="relative" ref={inboxRef}>
                <button
                  type="button"
                  onClick={() => setIsInboxOpen(!isInboxOpen)}
                  className="px-sm py-xs bg-primary hover:bg-on-primary-fixed-variant text-on-primary rounded-lg text-body-sm font-semibold transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  Inbox ngay <span className="text-[9px]">▼</span>
                </button>
                {isInboxOpen && (
                  <div className="absolute bottom-full mb-2 right-0 w-[320px] bg-surface border border-outline-variant rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-sm py-xs text-body-sm font-semibold text-on-surface border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
                      <span>Chọn mẫu câu</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">Tự động Copy</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                      {INBOX_TEMPLATES.map((group, gIdx) => (
                        <div key={gIdx}>
                          <div className="px-sm py-xs text-[10px] font-bold text-on-surface-variant bg-surface-container-low sticky top-0 border-b border-outline-variant backdrop-blur-sm z-10">
                            {group.category}
                          </div>
                          {group.templates.map((template, tIdx) => (
                            <button
                              key={tIdx}
                              className="w-full text-left px-sm py-sm hover:bg-primary/5 group/item transition border-b border-outline-variant last:border-0"
                              onClick={() => {
                                navigator.clipboard.writeText(template.content).then(() => {
                                  setIsInboxOpen(false);
                                  const targetUrl = post.author_url || post.post_url;
                                  window.open(targetUrl, '_blank');
                                }).catch(() => {
                                  setIsInboxOpen(false);
                                  window.open(post.author_url || post.post_url, '_blank');
                                });
                              }}
                            >
                              <div className="font-bold text-[11px] text-on-surface group-hover/item:text-primary mb-1 transition-colors leading-tight">
                                {template.title}
                              </div>
                              <div className="text-[10px] text-on-surface-variant line-clamp-2 leading-relaxed opacity-90">
                                {template.content}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

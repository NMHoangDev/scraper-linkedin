"use client";

import React from "react";
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
  const [isInboxOpen, setIsInboxOpen] = React.useState(false);
  const inboxRef = React.useRef<HTMLDivElement>(null);

  const isRejected = (link?: string) => {
    return link && link.startsWith("Bị từ chối");
  };

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

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setIsInboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                Tác giả: <span className="font-bold text-slate-700">{post.author || "Người tham gia ẩn danh"}</span> • Đăng lúc: {post.post_time ? new Date(post.post_time).toLocaleString("vi-VN") : "Không rõ"} • Cào lúc: {post.crawl_date ? new Date(post.crawl_date).toLocaleString("vi-VN") : ""}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 mb-6">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {post.content || "Nội dung bài viết rỗng hoặc chứa thuần hình ảnh/video."}
            </p>
          </div>

          {(post.image_urls && post.image_urls.length > 0) || post.media_url ? (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {post.media_url && (
                <div className="col-span-full">
                  <video src={post.media_url} controls className="w-full max-h-64 object-contain bg-black/5 rounded-lg border border-slate-100" />
                </div>
              )}
              {post.image_urls?.map((url, i) => (
                <img key={i} src={url} alt={`Post media ${i}`} className="w-full h-48 object-cover rounded-lg border border-slate-100 hover:opacity-90 transition-opacity cursor-pointer" onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          ) : null}

          {post.seeding_content && (
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/50 px-2 py-0.5 rounded">Tài khoản Seeding:</span>
                <span className="text-sm font-bold text-slate-800">{post.seeding_name || "Unknown"}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic border-l-4 border-emerald-300 pl-3 py-1">
                {post.seeding_content}
              </p>
              {post.link_comment && !isRejected(post.link_comment) && (
                <div className="mt-3">
                  <a href={post.link_comment} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm transition hover:shadow">
                    <FiExternalLink className="w-4 h-4" /> Đi tới bình luận trên Facebook
                  </a>
                </div>
              )}
              {post.link_comment && isRejected(post.link_comment) && (
                <div className="mt-3">
                  <span className="text-sm font-medium text-red-600 inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    Bị từ chối / Lỗi
                  </span>
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
            {verifyStatus === "yes" && !isRejected(post.link_comment) ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-green-100 text-green-700 border-green-200">
                ✓ Đã comment
              </span>
            ) : verifyStatus === "yes" && isRejected(post.link_comment) ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-100 text-red-700 border-red-200">
                ✗ Bị từ chối
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

            {/* Inbox ngay */}
            {post.author_url && (
              <div className="relative" ref={inboxRef}>
                <button
                  type="button"
                  onClick={() => setIsInboxOpen(!isInboxOpen)}
                  className="px-4 py-2 bg-[#E3000F] hover:bg-[#C40009] text-white rounded-xl text-sm font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  Inbox ngay <span className="text-[10px]">▼</span>
                </button>
                {isInboxOpen && (
                  <div className="absolute bottom-full mb-2 right-0 w-[340px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-black text-slate-800 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between bg-slate-50/50">
                      <span>Chọn mẫu câu</span>
                      <span className="text-[10px] font-bold text-[#E3000F] normal-case bg-red-50 border border-red-100 px-2 py-0.5 rounded">Tự động Copy</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar text-left">
                      {INBOX_TEMPLATES.map((group, gIdx) => (
                        <div key={gIdx}>
                          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50/90 uppercase tracking-wider sticky top-0 border-b border-slate-100/60 backdrop-blur-sm z-10 text-left">
                            {group.category}
                          </div>
                          {group.templates.map((template, tIdx) => (
                            <button
                              key={tIdx}
                              className="w-full text-left px-3 py-2.5 hover:bg-red-50 group/item transition border-b border-slate-50 last:border-0"
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
                              <div className="font-bold text-xs text-slate-800 group-hover/item:text-[#E3000F] mb-1 transition-colors leading-tight">
                                {template.title}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed opacity-90">
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

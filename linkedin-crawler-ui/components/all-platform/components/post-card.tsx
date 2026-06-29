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
      category: "Dá»‹ch vá»¥ Website",
      templates: [
        {
          title: "Thiáº¿t káº¿ Web Doanh Nghiá»‡p",
          content: "ChÃ o báº¡n, mÃ¬nh tháº¥y báº¡n Ä‘ang cÃ³ nhu cáº§u phÃ¡t triá»ƒn kinh doanh. BÃªn mÃ¬nh chuyÃªn thiáº¿t káº¿ Website chuyÃªn nghiá»‡p, chuáº©n SEO vÃ  tá»‘i Æ°u chuyá»ƒn Ä‘á»•i. Má»™t Website xá»‹n sáº½ lÃ  'nhÃ¢n viÃªn sale' lÃ m viá»‡c 24/7 cho báº¡n. Báº¡n cÃ³ muá»‘n mÃ¬nh gá»­i thÃªm má»™t sá»‘ máº«u Web bÃªn mÃ¬nh Ä‘Ã£ lÃ m Ä‘á»ƒ tham kháº£o khÃ´ng?"
        },
        {
          title: "Tá»‘i Æ°u/NÃ¢ng cáº¥p Web hiá»‡n táº¡i",
          content: "Dáº¡ chÃ o anh/chá»‹, em tháº¥y lÄ©nh vá»±c cá»§a mÃ¬nh ráº¥t tiá»m nÄƒng. KhÃ´ng biáº¿t hiá»‡n táº¡i anh/chá»‹ Ä‘Ã£ cÃ³ Website riÃªng Ä‘á»ƒ Ä‘áº©y máº¡nh thÆ°Æ¡ng hiá»‡u chÆ°a áº¡? BÃªn em nháº­n thiáº¿t káº¿ má»›i vÃ  nÃ¢ng cáº¥p Website vá»›i chi phÃ­ cá»±c kÃ¬ há»£p lÃ½. Anh/chá»‹ check tin nháº¯n Ä‘á»ƒ em tÆ° váº¥n chi tiáº¿t hÆ¡n nhÃ©!"
        }
      ]
    },
    {
      category: "Chatbot AI & CSKH",
      templates: [
        {
          title: "Chatbot AI ChÄƒm sÃ³c khÃ¡ch hÃ ng",
          content: "ChÃ o báº¡n, mÃ¬nh tháº¥y máº£ng dá»‹ch vá»¥ cá»§a báº¡n thÆ°á»ng xuyÃªn pháº£i tráº£ lá»i nhiá»u cÃ¢u há»i tá»« khÃ¡ch hÃ ng. BÃªn mÃ¬nh Ä‘ang cung cáº¥p giáº£i phÃ¡p Chatbot AI thÃ´ng minh cÃ³ kháº£ nÄƒng tá»± Ä‘á»™ng tráº£ lá»i, tÆ° váº¥n vÃ  chá»‘t Ä‘Æ¡n 24/7 nhÆ° ngÆ°á»i tháº­t. MÃ¬nh gá»­i báº¡n xem thá»­ báº£n demo Chatbot AI bÃªn mÃ¬nh nhÃ©?"
        },
        {
          title: "TÃ­ch há»£p AI tÆ° váº¥n chuyÃªn sÃ¢u",
          content: "Dáº¡ chÃ o anh/chá»‹, em chuyÃªn triá»ƒn khai cÃ¡c há»‡ thá»‘ng Chatbot AI (TÃ­ch há»£p ChatGPT/Claude) vÃ o quy trÃ¬nh chÄƒm sÃ³c khÃ¡ch hÃ ng. Chatbot bÃªn em cÃ³ thá»ƒ há»c theo data riÃªng cá»§a doanh nghiá»‡p Ä‘á»ƒ tÆ° váº¥n cÃ¡ nhÃ¢n hÃ³a. Anh/chá»‹ cÃ³ há»©ng thÃº nÃ¢ng cáº¥p há»‡ thá»‘ng CSKH cá»§a mÃ¬nh khÃ´ng áº¡?"
        }
      ]
    },
    {
      category: "n8n & Tá»± Ä‘á»™ng hoÃ¡",
      templates: [
        {
          title: "Giáº£i phÃ¡p Automation (n8n)",
          content: "Xin chÃ o! MÃ¬nh tháº¥y quy trÃ¬nh váº­n hÃ nh cá»§a báº¡n Ä‘ang pháº£i xá»­ lÃ½ thá»§ cÃ´ng khÃ¡ nhiá»u bÆ°á»›c. BÃªn mÃ¬nh chuyÃªn thiáº¿t káº¿ cÃ¡c luá»“ng tá»± Ä‘á»™ng hoÃ¡ báº±ng n8n, giÃºp Ä‘á»“ng bá»™ dá»¯ liá»‡u giá»¯a cÃ¡c ná»n táº£ng hoÃ n toÃ n tá»± Ä‘á»™ng. Viá»‡c nÃ y sáº½ giÃºp báº¡n giáº£m thiá»ƒu sai sÃ³t vÃ  tá»‘i Æ°u hiá»‡u suáº¥t x10 láº§n. MÃ¬nh trao Ä‘á»•i thÃªm nhÃ©?"
        },
        {
          title: "Tá»‘i Æ°u quy trÃ¬nh Ä‘a ná»n táº£ng",
          content: "ChÃ o anh/chá»‹, viá»‡c láº·p Ä‘i láº·p láº¡i cÃ¡c tÃ¡c vá»¥ thá»§ cÃ´ng thÆ°á»ng tá»‘n ráº¥t nhiá»u nguá»“n lá»±c. BÃªn em cung cáº¥p giáº£i phÃ¡p Tá»± Ä‘á»™ng hoÃ¡ doanh nghiá»‡p vá»›i n8n, giÃºp tá»± Ä‘á»™ng káº¿t ná»‘i cÃ¡c pháº§n má»m (Lead FB -> Zalo -> CRM). Chi phÃ­ triá»ƒn khai 1 láº§n, dÃ¹ng trá»n Ä‘á»i. Anh/chá»‹ check inbox em gá»­i demo nhÃ©!"
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

  const score = post.score || 0;
  let scoreBg = "bg-slate-100 text-slate-700 border-slate-200";
  if (score >= 85) scoreBg = "bg-red-50 text-[#DC2626] border-red-100";
  else if (score >= 60) scoreBg = "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="mb-2 flex flex-col gap-4 border-b border-slate-100 bg-white p-4 pb-6 transition-none sm:flex-row sm:items-start">
      {/* KHá»I AI SCORE BÃŠN TRÃI */}
      <div
        className={cn(
          "flex h-[60px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border sm:w-[60px] sm:flex-col sm:gap-0",
          scoreBg,
        )}
      >
        <span className="text-xl font-black leading-tight">{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5 opacity-80">AI Score</span>
      </div>

      {/* Ná»˜I DUNG CHÃNH */}
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
              {post.posted_at ? ` â€¢ ${new Date(post.posted_at).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}` : ""}
            </span>
          </span>
        </div>

        {/* Ná»™i dung */}
        <p className="text-xs text-slate-700 italic line-clamp-2 leading-relaxed bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100/60 mb-2">
          "{post.content || "Ná»™i dung bÃ i viáº¿t rá»—ng hoáº·c chá»©a thuáº§n hÃ¬nh áº£nh/video."}"
        </p>

        {(userRole === "admin" || userRole === "leader") && post.all_seedings && post.all_seedings.length > 0 ? (
          <div className="mb-3 flex flex-col gap-2">
            {post.all_seedings.map((seed, idx) => (
              <div key={idx} className="px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">ÄÃ£ seeding bá»Ÿi <span className="font-bold text-slate-800">{seed.member_name}</span> (TÃ i khoáº£n: {seed.seeding_name || "Unknown"}):</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  <span className="text-emerald-500 font-serif font-bold text-lg leading-none mr-1">"</span>
                  {seed.seeding_content}
                  <span className="text-emerald-500 font-serif font-bold text-lg leading-none ml-1">"</span>
                </p>
                <div className="flex items-center justify-between mt-1">
                  {seed.link_comment && (
                    <a href={seed.link_comment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                      Xem bÃ¬nh luáº­n <FiExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {seed.verify_status === "yes" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">âœ“ ÄÃ£ xÃ¡c minh</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Chá» xÃ¡c minh</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : post.seeding_content ? (
          <div className="mb-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">ÄÃ£ seeding báº±ng tÃ i khoáº£n:</span>
              <span className="text-xs font-bold text-slate-800">{post.seeding_name || "Unknown"}</span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none mr-1">"</span>
              {post.seeding_content}
              <span className="text-emerald-500 font-serif font-bold text-lg leading-none ml-1">"</span>
            </p>
            {post.link_comment && (
              <a href={post.link_comment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                Xem bÃ¬nh luáº­n <FiExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/60 text-amber-700 rounded-md text-[11px] font-bold border border-amber-100/40" title="LÆ°á»£t thÃ­ch/Cáº£m xÃºc">
              ðŸ‘ {post.reactions?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold border border-slate-200/50" title="LÆ°á»£t bÃ¬nh luáº­n">
              ðŸ’¬ {post.comments?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold border border-blue-100/50" title="LÆ°á»£t chia sáº»">
              ðŸ” {post.shares?.toLocaleString() || 0}
            </span>

            {(userRole === "admin" || userRole === "leader") && post.crawler_name && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-[11px] font-medium border border-slate-200/50">
                ðŸ‘¤ {post.crawler_name}
                {userRole === "admin" && post.crawler_team ? ` - ${post.crawler_team}` : ""}
              </span>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {verifyStatus === "yes" ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-green-100 text-green-700 border-green-200">
                âœ“ ÄÃ£ xÃ¡c minh
              </span>
            ) : verifyStatus === "pending" ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                âœ“ ÄÃ£ seeding
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                ChÆ°a seeding
              </span>
            )}



            <button
              type="button"
              onClick={handleView}
              className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 shadow-none cursor-pointer"
            >
              Xem chi tiáº¿t
            </button>

            {onVerify && !(post.seeding_content && post.link_comment) && (
              <button
                type="button"
                onClick={handleVerify}
                className="whitespace-nowrap rounded-xl bg-[#DC2626] px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:bg-[#B91C1C] shadow-none cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  XÃ¡c minh
                </span>
              </button>
            )}

            {/* Inbox ngay */}
            {post.author_url && (
              <div className="relative" ref={inboxRef}>
                <button
                  type="button"
                  onClick={() => setIsInboxOpen(!isInboxOpen)}
                  className="flex items-center gap-1 whitespace-nowrap rounded-xl bg-[#DC2626] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#B91C1C] shadow-none cursor-pointer"
                >
                  Inbox ngay <span className="text-[9px]">â–¼</span>
                </button>
                {isInboxOpen && (
                  <div className="absolute bottom-full mb-2 right-0 w-[320px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2 text-[11px] font-black text-slate-800 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between bg-slate-50/50">
                      <span>Chá»n máº«u cÃ¢u</span>
                      <span className="text-[9px] font-bold text-[#DC2626] normal-case bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">Tá»± Ä‘á»™ng Copy</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                      {INBOX_TEMPLATES.map((group, gIdx) => (
                        <div key={gIdx}>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50/90 uppercase tracking-wider sticky top-0 border-b border-slate-100/60 backdrop-blur-sm z-10">
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
                              <div className="font-bold text-[11px] text-slate-800 group-hover/item:text-[#DC2626] mb-1 transition-colors leading-tight">
                                {template.title}
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed opacity-90">
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


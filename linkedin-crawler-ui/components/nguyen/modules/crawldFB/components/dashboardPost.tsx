// src/modules/post/components/DashboardPosts.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { useGetIntents } from "../hooks/useGetIntents"; 
import { useFetchAllPosts } from "../hooks/useGetDataFb"; 
import { DataFBResponse } from "../types/dataFb.type"; 
import { PostCard } from "./dataFbCard_component";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import {
  PlatformStatCard,
  PlatformStatsRow,
} from "@/components/features/shared/PlatformStatCard";
import { MaterialIcon } from "@/components/ui";
import type { AppPlatform } from "@/lib/app-platform";

// ============================================================================
// 1. CÁC HÀM HELPER PURE (ĐẶT NGOÀI COMPONENT)
// Giải quyết triệt để lỗi TDZ (Cannot access before initialization) và tối ưu RAM
// ============================================================================

// Nhận diện nền tảng mạng xã hội dựa trên URL
const detectPlatform = (post: DataFBResponse) => {
    const targetUrl = post.link_group || post.url || "";
    return targetUrl.includes("linkedin.com") ? "LinkedIn" : "Facebook";
};

// Render Icon Platform tương ứng
const renderPlatformIcon = (platform: string) => {
    if (platform === "LinkedIn") {
        return <FaLinkedin className="text-blue-700 text-xs shrink-0" title="LinkedIn" />;
    }
    return <FaFacebook className="text-blue-600 text-xs shrink-0" title="Facebook" />;
};

// Trích xuất chuỗi 10 ký tự ngày chuẩn (YYYY-MM-DD) từ string hoặc Date Object
const getDatePart = (dateInput?: Date | string | null) => {
    if (!dateInput) return "";
    if (typeof dateInput === "string") {
        return dateInput.substring(0, 10);
    }
    try {
        return dateInput.toISOString().split("T")[0];
    } catch (e) {
        return "";
    }
};

// Trích xuất chuỗi ngày hiển thị thân thiện (DD/MM/YYYY)
const getCompactDateString = (dateInput?: Date | string | null) => {
    if (!dateInput) return "";
    try {
        if (dateInput instanceof Date) {
            return dateInput.toLocaleDateString('vi-VN');
        }
        const safeStr = dateInput.replace(" ", "T");
        return new Date(safeStr).toLocaleDateString('vi-VN');
    } catch (e) {
        return "";
    }
};

// Chuyển đổi dữ liệu thời gian sang dạng số (Timestamp) để phục vụ sắp xếp mới nhất
const getDateTimestamp = (dateInput?: Date | string | null) => {
    if (!dateInput) return 0;
    try {
        if (dateInput instanceof Date) return dateInput.getTime();
        return new Date(dateInput.replace(" ", "T")).getTime();
    } catch (e) {
        return 0;
    }
};

// Render UI động hiển thị so sánh chênh lệch giữa 2 mốc số liệu
const renderComparisonUI = (todayCount: number, yesterdayCount: number) => {
    const diff = todayCount - yesterdayCount;
    
    if (diff > 0) {
        return (
            <p className="text-xs text-emerald-600 font-medium mt-3">
                ↑ {diff} so với hôm qua
            </p>
        );
    } else if (diff < 0) {
        return (
            <p className="text-xs text-rose-500 font-medium mt-3">
                ↓ {Math.abs(diff)} so với hôm qua
            </p>
        );
    }
    return (
        <p className="text-xs text-slate-400 font-medium mt-3">
            ↔ Bằng với hôm qua
        </p>
    );
};

// ============================================================================
// 2. COMPONENT CHÍNH
// ============================================================================
export function DashboardPosts({
    forcedPlatform = null,
}: {
    /** Khóa feed theo nền tảng sidebar (facebook / linkedin). */
    forcedPlatform?: AppPlatform | null;
}) {
    const { platform } = useAppPlatform();
    // States bộ lọc & sắp xếp
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [intentFilter, setIntentFilter] = useState<string>("all");
    const [platformFilter, setPlatformFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("latest"); 

    // States phân trang
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 6;

    // State lưu trữ dữ liệu bài viết đang được mở trong Modal
    const [selectedPostForModal, setSelectedPostForModal] = useState<DataFBResponse | null>(null);

    // Gọi Hooks fetch dữ liệu
    const { intents, fetchIntents } = useGetIntents();
    const { allPosts, isLoading, error, refetch } = useFetchAllPosts();

    // State phục vụ lọc và sắp xếp ở Front-end
    const [processedPosts, setProcessedPosts] = useState<DataFBResponse[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Tự động set platformFilter theo platform của workspace khi mount / thay đổi workspace
    useEffect(() => {
        if (forcedPlatform === "facebook" || forcedPlatform === "linkedin") {
            setPlatformFilter(forcedPlatform);
            return;
        }
        if (platform === "facebook") {
            setPlatformFilter("facebook");
        } else if (platform === "linkedin") {
            setPlatformFilter("linkedin");
        } else {
            setPlatformFilter("all");
        }
    }, [platform, forcedPlatform]);

    // Tự động tải danh sách Intents khi mount
    useEffect(() => {
        fetchIntents();
    }, [fetchIntents]);

    // Thực hiện lọc và sắp xếp ở Front-end (có Loading)
    useEffect(() => {
        setIsProcessing(true);
        const timer = setTimeout(() => {
            const filtered = allPosts.filter((post) => {
                const platformName = detectPlatform(post);
                
                const matchSearch = (post.content || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (post.group_name || "").toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchIntent = intentFilter === "all" || 
                                    (intentFilter === "unclassified" && !post.intent) ||
                                    (post.intent || "").toLowerCase() === intentFilter.toLowerCase();
                
                const matchPlatform = platformFilter === "all" || platformName.toLowerCase() === platformFilter.toLowerCase();

                return matchSearch && matchIntent && matchPlatform;
            });

            filtered.sort((a, b) => {
                if (sortBy === "score_desc") return b.score - a.score;
                if (sortBy === "score_asc") return a.score - b.score;
                if (sortBy === "comments_desc") return (b.comments || 0) - (a.comments || 0);
                if (sortBy === "latest") {
                    return getDateTimestamp(b.dateCrawl) - getDateTimestamp(a.dateCrawl);
                }
                return 0;
            });

            setProcessedPosts(filtered);
            setIsProcessing(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [allPosts, searchTerm, intentFilter, platformFilter, sortBy]);

    // Tự động quay về trang 1 nếu thay đổi từ khóa tìm kiếm hoặc các bộ lọc
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, intentFilter, platformFilter, sortBy]);

    // Helper render Intent Badge (Sử dụng danh sách intents lấy từ API)
    const renderIntentBadge = (intentValue?: string) => {
        if (!intentValue) return null;

        const matched = intents.find(i => i.value === intentValue || i.name === intentValue);
        const displayName = matched ? matched.name : intentValue;
        const normalized = displayName.toLowerCase();


        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1 w-max bg-blue-50 text-blue-600 border-blue-100`}>
               
                <span>{displayName}</span>
            </span>
        );
    };

    // ==========================================
    // TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ (SUMMARY CARDS)
    // ==========================================
    // Xác định mốc ngày hệ thống chuẩn
    const todayStr = new Date().toISOString().split("T")[0];
    
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split("T")[0];

    // Lọc tập dữ liệu cào về trong Hôm nay và Hôm qua
    const postsToday = allPosts.filter(p => getDatePart(p.dateCrawl) === todayStr);
    const postsYesterday = allPosts.filter(p => getDatePart(p.dateCrawl) === yesterdayStr);

    const totalPostsToday = postsToday.length;
    const totalPostsYesterday = postsYesterday.length;

    const highScores = allPosts.filter(p => p.score >= 70);
    const highScorePercent = allPosts.length > 0 ? Math.round((highScores.length / allPosts.length) * 100) : 0;
    
    const pendingReviewCount = allPosts.filter(p => p.score >= 50 && p.score < 70).length;
    
    // Giả định dữ liệu seeded chiếm 20% lượng bài thu thập của mỗi ngày
    const seededTodayCount = Math.floor(totalPostsToday * 0.2); 
    const seededYesterdayCount = Math.floor(totalPostsYesterday * 0.2);

    // ==========================================
    // LOGIC PHÂN TRANG DỰA TRÊN KẾT QUẢ ĐÃ LỌC & SẮP XẾP (SLIDING WINDOW 5 NÚT)
    // ==========================================
    const totalPages = Math.ceil(processedPosts.length / itemsPerPage);
    const paginatedPosts = processedPosts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getPaginationNumbers = () => {
        const maxButtons = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, currentPage + 2);

        if (totalPages > maxButtons) {
            if (currentPage <= 3) {
                start = 1;
                end = maxButtons;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - maxButtons + 1;
                end = totalPages;
            }
        } else {
            start = 1;
            end = totalPages;
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return { pages, start, end };
    };

    const { pages: pageNumbers, start: startPage, end: endPage } = getPaginationNumbers();

    const platformLabel =
        forcedPlatform === "facebook"
            ? "Facebook"
            : forcedPlatform === "linkedin"
              ? "LinkedIn"
              : "Tất cả nền tảng";

    return (
        <div className="flex w-full flex-col gap-lg font-sans">
            <PlatformStatsRow>
                <PlatformStatCard
                    label={`Tổng bài hôm nay (${platformLabel})`}
                    value={totalPostsToday}
                    hint={
                        totalPostsToday - totalPostsYesterday > 0
                            ? `↑ ${totalPostsToday - totalPostsYesterday} so với hôm qua`
                            : totalPostsToday - totalPostsYesterday < 0
                              ? `↓ ${Math.abs(totalPostsToday - totalPostsYesterday)} so với hôm qua`
                              : "↔ Bằng hôm qua"
                    }
                    hintTone={
                        totalPostsToday > totalPostsYesterday
                            ? "up"
                            : totalPostsToday < totalPostsYesterday
                              ? "down"
                              : "neutral"
                    }
                    accent="primary"
                />
                <PlatformStatCard
                    label="Điểm cao (≥70)"
                    value={highScores.length}
                    hint={`${highScorePercent}% trong tập đang lọc`}
                    hintTone="up"
                    accent="success"
                />

                {/* <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 border-l-4 border-l-amber-500 flex flex-col justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cần Theo Dõi</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{pendingReviewCount}</h3>
                    </div>
                    <p className="text-xs text-amber-600 font-medium mt-3">Điểm mức trung bình</p>
                </div> */}

                <PlatformStatCard
                    label="Đã seeded hôm nay"
                    value={seededTodayCount}
                    hint={`Ước tính từ batch hôm nay`}
                    accent="warning"
                />
                <PlatformStatCard
                    label="Tổng bài đang hiển thị"
                    value={processedPosts.length}
                    hint={`${allPosts.length} bài trong API`}
                    accent="primary"
                />
            </PlatformStatsRow>

            <div className="border-outline-variant bg-surface flex flex-wrap items-center gap-sm rounded-xl border p-md">
                <div className="relative min-w-[220px] flex-1">
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài post..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-outline-variant bg-surface-container-low focus:border-primary w-full rounded-lg border px-md py-sm text-xs outline-none transition focus:ring-1 focus:ring-primary/30"
                    />
                </div>

                <select
                    value={intentFilter}
                    onChange={(e) => setIntentFilter(e.target.value)}
                    className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
                >
                    <option value="all">Tất cả intent</option>
                    <option value="unclassified">Chưa phân loại</option>
                    {intents.map((item, idx) => (
                        <option key={idx} value={item.value}>{item.name}</option>
                    ))}
                </select>

                {!forcedPlatform && platform !== "facebook" && platform !== "linkedin" ? (
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
                    >
                        <option value="all">Tất cả platform</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                    </select>
                ) : null}

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs font-medium outline-none"
                >
                    <option value="latest">Sắp xếp: Mới nhất</option>
                    <option value="score_desc">Sắp xếp: Điểm cao nhất</option>
                    <option value="score_asc">Sắp xếp: Điểm thấp nhất</option>
                    <option value="comments_desc">Sắp xếp: Bình luận nhiều nhất</option>
                </select>

                <button
                    type="button"
                    onClick={refetch}
                    disabled={isLoading}
                    className="border-outline-variant bg-surface hover:bg-surface-container-high flex items-center gap-1 rounded-lg border px-md py-sm text-xs font-medium transition disabled:opacity-50"
                    title="Làm mới dữ liệu"
                >
                    <MaterialIcon
                        name="sync"
                        className={`text-[18px] ${isLoading ? "animate-spin" : ""}`}
                    />
                </button>
            </div>

            {error ? (
                <div className="border-error/30 bg-error/10 text-error rounded-lg border p-md text-xs font-medium">
                    {error}
                </div>
            ) : null}

            {/* HÀNG 3: DANH SÁCH BÀI VIẾT (DẠNG THẺ THU GỌN) */}
            <div className="flex flex-col gap-4">
                {isLoading || isProcessing ? (
                    <div className="border-outline-variant bg-surface flex flex-col items-center justify-center gap-2 rounded-xl border py-20">
                        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                        <span className="text-on-surface-variant text-xs">
                            {isLoading ? "Đang tải dữ liệu bài viết từ API..." : "Đang tính toán và sắp xếp bộ lọc bài viết..."}
                        </span>
                    </div>
                ) : paginatedPosts.length === 0 ? (
                    <div className="border-outline-variant bg-surface text-on-surface-variant rounded-xl border py-20 text-center text-xs italic">
                        Không tìm thấy bài post nào phù hợp với bộ lọc.
                    </div>
                ) : (
                    paginatedPosts.map((post, index) => {
                        const platform = detectPlatform(post);
                        const compactDateStr = getCompactDateString(post.dateCrawl);

                        // Phân loại màu nền cho Score Box
                        let scoreBg = "bg-slate-100 text-slate-700";
                        if (post.score >= 85) scoreBg = "bg-emerald-100 text-emerald-700";
                        else if (post.score >= 60) scoreBg = "bg-amber-100 text-amber-700";

                        return (
                            <div 
                                key={index} 
                                className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex gap-4 items-start transition duration-200 hover:border-slate-300"
                            >
                                {/* KHỐI AI SCORE BÊN TRÁI */}
                                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${scoreBg}`}>
                                    <span className="text-xl font-black leading-tight">{post.score}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">AI Score</span>
                                </div>

                                {/* NỘI DUNG CHÍNH */}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                    
                                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {renderPlatformIcon(platform)}

                                            <a 
                                                href={post.link_group || "#"} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-slate-900 hover:text-indigo-600 hover:underline truncate max-w-[220px]"
                                            >
                                                {post.group_name}
                                            </a>

                                            {renderIntentBadge(post.intent)}
                                        </div>

                                        <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                                            {compactDateStr} {post.date ? `• ${post.date}` : ''}
                                        </span>
                                    </div>

                                    {/* TRÍCH DẪN NỘI DUNG */}
                                    <p className="text-xs text-slate-700 italic line-clamp-2 leading-relaxed bg-slate-50/50 p-x-2.5 rounded-lg border border-slate-100/60 mb-3">
                                        "{post.content || "Nội dung bài viết rỗng hoặc chứa thuần hình ảnh/video."}"
                                    </p>

                                    {/* FOOTER THẺ CON */}
                                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                        
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/60 text-amber-700 rounded-md text-[11px] font-bold border border-amber-100/40" title="Lượt thích/Cảm xúc">
                                                👍 {post.reactions?.toLocaleString() || 0}
                                            </span>
                                            
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold" title="Lượt bình luận">
                                                💬 {post.comments?.toLocaleString() || 0}
                                            </span>

                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold" title="Lượt chia sẻ">
                                                🔁 {post.shares?.toLocaleString() || 0}
                                            </span>
                                        </div>

                                        {/* KÍCH HOẠT MODAL KHI XEM CHI TIẾT */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPostForModal(post)}
                                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </div>

                                    </div>

                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* HÀNG 4: FOOTER PHÂN TRANG */}
            {!isLoading && totalPages > 1 && (
                <div className="mt-6 p-4 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                    <div className="text-xs text-slate-500">
                        Hiển thị <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, processedPosts.length)}</span> trong số <span className="font-bold text-slate-700">{processedPosts.length}</span> bài viết
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        >
                            Trước
                        </button>

                        {startPage > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    className="w-7 h-7 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                >
                                    1
                                </button>
                                {startPage > 2 && <span className="px-1 text-slate-400 text-xs">...</span>}
                            </>
                        )}

                        {pageNumbers.map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 text-xs font-medium rounded-lg transition cursor-pointer ${
                                    currentPage === page 
                                        ? "bg-indigo-600 text-white font-bold shadow-xs" 
                                        : "text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                {page}
                            </button>
                        ))}

                        {endPage < totalPages && (
                            <>
                                {endPage < totalPages - 1 && <span className="px-1 text-slate-400 text-xs">...</span>}
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="w-7 h-7 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* KHOANG RENDER MODAL HIỂN THỊ COMPONENT CON NGUYÊN BẢN */}
            {/* ========================================================= */}
            {selectedPostForModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPostForModal(null)} 
                >
                    <div 
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {/* Nút Đóng góc trên */}
                        <div className="absolute top-3 right-3 z-10">
                            <button 
                                onClick={() => setSelectedPostForModal(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition shadow-xs cursor-pointer"
                                title="Đóng"
                            >
                                ✕
                            </button>
                        </div>

                        {/* TRUYỀN NGUYÊN OBJECT VÀO COMPONENT CON CỦA BẠN */}
                        <PostCard item={selectedPostForModal} />

                    </div>
                </div>
            )}

        </div>
    );
}
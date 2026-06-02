import { useState, useEffect } from 'react';
import { getDataFbService } from '../services/getDataFacebook';
import { DataFBResponse } from '../types/dataFb.type';
import { getAllLinkedInPosts } from '@/services/linkedinCrawlerService';

export const useFetchAllPosts = () => {
    // Lưu trữ toàn bộ dữ liệu trả về
    const [allPosts, setAllPosts] = useState<DataFBResponse[]>([]);
    // Trạng thái loading
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // Trạng thái lỗi (nếu có)
    const [error, setError] = useState<string | null>(null);

    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Lấy email LinkedIn lưu trong localStorage để gọi API LinkedIn
            const savedEmail = typeof window !== 'undefined' ? localStorage.getItem("linkedin_crawler_email") : null;
            
            // Gọi song song cả Facebook và LinkedIn
            const promises: [Promise<any>, Promise<any>] = [
                getDataFbService().catch(err => {
                    console.error("Lỗi khi lấy bài viết Facebook:", err);
                    return { data: [] };
                }),
                savedEmail
                    ? getAllLinkedInPosts({ email: savedEmail, filters: {} }).catch(err => {
                          console.error("Lỗi khi lấy bài viết LinkedIn:", err);
                          return { success: false, data: [] };
                      })
                    : Promise.resolve({ success: false, data: [] })
            ];

            const [fbResponse, liResponse] = await Promise.all(promises);

            const fbPosts = Array.isArray(fbResponse?.data) ? fbResponse.data : [];
            const liSessions = liResponse?.success && Array.isArray(liResponse?.data) ? liResponse.data : [];

            // Map LinkedIn posts sang chuẩn DataFBResponse
            const liPosts: DataFBResponse[] = [];
            liSessions.forEach((session: any) => {
                if (Array.isArray(session.posts)) {
                    session.posts.forEach((post: any) => {
                        liPosts.push({
                            id: post.id || `${session.group_name}-${post.posted_at}`,
                            group_name: session.group_name || "Nhóm LinkedIn",
                            total_posts_24h: 0,
                            group_url: session.group_url || "",
                            link_group: session.group_url || "",
                            post_url: post.post_url || "",
                            date: post.posted_at || "",
                            dateCrawl: session.date_crawl || new Date(),
                            intent: post.intent || "",
                            reactions: Number(post.likes || post.reactions || 0),
                            comments: Number(post.comments || 0),
                            shares: Number(post.reposts || post.shares || 0),
                            score: Number(post.score || 0),
                            content: post.content || "",
                            media_url: post.media_url || null,
                            image_urls: Array.isArray(post.image_urls) ? post.image_urls : [],
                        });
                    });
                }
            });

            // Gộp cả 2 nguồn
            setAllPosts([...fbPosts, ...liPosts]); 
            
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu bài viết:", err);
            setError("Không thể tải dữ liệu từ máy chủ.");
            setAllPosts([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động gọi API khi Component mount
    useEffect(() => {
        fetchAllData();
    }, []);

    // Trả về các state và hàm refetch để có thể tự gọi lại data nếu cần (nút refresh)
    return { allPosts, isLoading, error, refetch: fetchAllData };
};
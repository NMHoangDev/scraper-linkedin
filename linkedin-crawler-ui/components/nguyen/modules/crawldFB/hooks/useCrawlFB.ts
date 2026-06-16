import { useState, useRef } from "react";
import { toast } from "sonner";
import { CrawlFBRequest, GroupSummaryType } from "../types/crawlFB_type";
import { CrawlFb_form } from "../schemas/crawlFb_schemas";
import { CrawlFbService } from "../services/CrawlFBService";
import {
  getFacebookApiRoot,
  getFacebookCrawlWsUrl,
} from "../lib/facebook-api-base";

// Định nghĩa Type cho dữ liệu giám sát VPS
export interface VpsInfoType {
  status: "đang cào" | "hoàn thành" | "lỗi";
  count: number;
  group_names: string[];
}

export const useCrawlFB = (onSuccessCallback?: () => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("Đang kết nối đến máy chủ...");
  const [result, setResult] = useState<GroupSummaryType[] | null>();
  
  // State mới để lưu trạng thái chi tiết của từng VPS phục vụ UI Realtime
  const [vpsDetails, setVpsDetails] = useState<Record<string, VpsInfoType> | null>(null);

  // Dùng ref để lưu trữ instance WebSocket nhằm gọi đóng kết nối (Hủy) khi cần
  const wsRef = useRef<WebSocket | null>(null);

  const handleCrawlResponse = (
    response: {
      status?: string;
      message?: string;
      data?: GroupSummaryType[];
      vps_details?: Record<string, VpsInfoType>;
    },
    ws: WebSocket | null,
  ) => {
    // ==========================================
    // 1. CÁC TRẠNG THÁI TRUNG GIAN (KHÔNG ĐÓNG WS)
    // ==========================================
    if (response.status === "queued" || response.status === "processing" || response.status === "info") {
      setLoadingMsg(response.message || "Đang xử lý…");
      toast.info(response.message || "Đang xử lý…", { id: "ws-status" });
      return;
    }

    if (response.status === "partial_success") {
      setLoadingMsg(response.message || "Đang nhận dữ liệu...");
      toast.success(response.message || "Vừa nhận dữ liệu từ 1 máy chủ", { id: "ws-status" });
      return;
    }

    if (response.status === "warning") {
      setLoadingMsg(response.message || "Có máy chủ báo lỗi...");
      toast.warning(response.message || "Máy chủ báo lỗi", { id: "ws-status" });
      return;
    }

    // ==========================================
    // 2. CÁC TRẠNG THÁI CHUNG CUỘC (ĐÓNG WS)
    // ==========================================
    if (response.status === "success") {
      setIsLoading(false);
      if (response.data && response.data.length > 0) {
        setResult(response.data);
        toast.success("Hoàn tất toàn bộ quá trình!", { id: "ws-status" });
      } else {
        setResult([]);
        toast.info("Crawl xong nhưng không có dữ liệu mới.", { id: "ws-status" });
      }
      onSuccessCallback?.();
      ws?.close();
      return;
    }

    if (
      response.status === "error" ||
      response.status === "fail" ||
      response.status === "canceled"
    ) {
      setIsLoading(false);
      toast.error(response.message || "Lỗi hoặc quá trình bị hủy", { id: "ws-status" });
      ws?.close();
    }
  };

  const submitCrawlData = async (data: CrawlFb_form) => {
    const emailId = data.isDefaultAccount
      ? `default_user_${Date.now()}`
      : data.userName || "anonymous";

    // Reset toàn bộ state khi bắt đầu phiên mới
    setIsLoading(true);
    setLoadingMsg("Đang kết nối đến máy chủ...");
    setResult(null);
    setVpsDetails(null); 

    const payload: CrawlFBRequest = {
      groups: data.rows,
      tkFB: data.isDefaultAccount
        ? null
        : {
            useName: data.userName,
            password: data.password,
          },
    };

    const apiBaseUrl = getFacebookApiRoot();
    console.log("=== Step 1: Backend Health Check ===");
    console.log("API URL:", apiBaseUrl);
    try {
      const healthCheck = await fetch(`${apiBaseUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!healthCheck.ok) {
        setIsLoading(false);
        toast.error(`Backend error: ${healthCheck.status}. Please check backend is running on ${apiBaseUrl}`);
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      toast.error(`Cannot connect to backend: ${err.message}\nCheck backend is running on: ${apiBaseUrl}`);
      return;
    }

    const wsUrl = getFacebookCrawlWsUrl(emailId);
    let wsOpened = false;
    let fallbackStarted = false;

    const runHttpFallback = async (reason: string) => {
      if (fallbackStarted || wsOpened) return;
      fallbackStarted = true;
      setLoadingMsg("WebSocket lỗi — đang crawl qua HTTP…");
      toast.info(reason, { id: "ws-status" });
      try {
        const response = await CrawlFbService(payload);
        handleCrawlResponse(
          {
            status: response.status,
            message: response.message,
            data: response.data,
            vps_details: response.vps_details, // Kế thừa nếu HTTP có trả về
          },
          null,
        );
      } catch (err) {
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : "Không crawl được qua HTTP";
        toast.error(msg, { id: "ws-status" });
      }
    };

    console.log("=== WebSocket Connection Attempt ===");
    console.log("URL:", wsUrl);
    setLoadingMsg("Đang kết nối WebSocket…");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const connectTimeout = window.setTimeout(() => {
      if (!wsOpened && ws.readyState !== WebSocket.OPEN) {
        ws.close();
        void runHttpFallback("WebSocket không kết nối được — thử HTTP (có thể mất vài phút).");
      }
    }, 8000);

    ws.onopen = () => {
      wsOpened = true;
      window.clearTimeout(connectTimeout);
      setLoadingMsg("Đã kết nối, đang phân bổ công việc…");
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data) as {
          status?: string;
          message?: string;
          data?: GroupSummaryType[];
          vps_details?: Record<string, VpsInfoType>;
        };

        // BẮT LIỀN DỮ LIỆU VPS (Nếu có) CHO MỌI TRẠNG THÁI
        if (response.vps_details) {
          setVpsDetails(response.vps_details);
        }

        if (response.status === "heartbeat") {
          setLoadingMsg("Hệ thống đang thu thập dữ liệu...");
          return; // Heartbeat chỉ cập nhật state ở trên, không gọi handleCrawlResponse
        }

        handleCrawlResponse(response, ws);
      } catch (error) {
        setIsLoading(false);
        console.error("Parse WS message failed:", error, event.data);
        toast.error("Lỗi xử lý dữ liệu từ server");
      }
    };

    ws.onerror = () => {
      window.clearTimeout(connectTimeout);
      if (!wsOpened) {
        void runHttpFallback("WebSocket lỗi — chuyển sang HTTP. Kiểm tra backend đang chạy port 8000.");
      }
    };

    ws.onclose = (event) => {
      window.clearTimeout(connectTimeout);
      if (!wsOpened && event.code === 1006) {
        void runHttpFallback("WebSocket đóng bất thường (1006) — thử HTTP. Restart backend sau khi sửa .env.");
        return;
      }
      if (!wsOpened) {
        setIsLoading(false);
        return;
      }
      if (!event.wasClean && event.code !== 1000) {
        setIsLoading(false);
        toast.error(event.reason || `WebSocket đóng (mã ${event.code}). Tiến trình có thể đã dừng.`, { id: "ws-status" });
      }
    };
  };

  const cancelCrawl = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      toast.error("Đã hủy tiến trình thu thập dữ liệu!");
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    loadingMsg,
    submitCrawlData,
    result,
    cancelCrawl,
    vpsDetails, // Export state mới ra ngoài để truyền vào FullScreenLoading
  };
};
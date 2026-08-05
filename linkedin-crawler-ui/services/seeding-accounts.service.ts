/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { ApiResponse } from "@/types/unified.types";
import type {
  SeedingAccount,
  SeedingAccountStats,
  PlatformBreakdown,
  WeeklyVsTodayChartData,
  TopOnlineEntry,
  AccountAlert,
} from "@/types/seeding-account.types";
import { API_BASE_URL } from "@/lib/env";

const BASE = `${API_BASE_URL}/api/all-platform/seeding-accounts`;

async function requestJson<T = any>(
  path: string,
  init?: RequestInit,
  retries: number = 1,
): Promise<ApiResponse<T>> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const apiKey = process.env.NEXT_PUBLIC_LINKEDIN_CRAWLER_API_KEY;
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }

      const res = await fetch(path, {
        ...init,
        credentials: "include",
        headers: {
          ...headers,
          ...(init?.headers || {}),
        },
      });

      if (!res.ok && res.status >= 500) {
        throw new Error(`Lỗi máy chủ (${res.status})`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return {
    success: false,
    message:
      lastError instanceof Error
        ? lastError.message
        : "Mất kết nối tới máy chủ.",
  };
}

export const seedingAccountsService = {
  /**
   * Lấy danh sách tài khoản seeding, hỗ trợ filter.
   */
  getAccounts: (params?: {
    search?: string;
    platform?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ accounts: SeedingAccount[]; total: number; total_pages: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size) searchParams.set("page_size", String(params.page_size));
    const qs = searchParams.toString();
    return requestJson(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  /**
   * Lấy thống kê tổng quan (5 stat cards).
   */
  getStats: (): Promise<ApiResponse<SeedingAccountStats>> => {
    return requestJson(`${BASE}/stats`);
  },

  /**
   * Lấy dữ liệu biểu đồ combo (cột giờ/tuần + đường giờ/ngày).
   */
  getWeeklyVsTodayChart: (): Promise<ApiResponse<WeeklyVsTodayChartData[]>> => {
    return requestJson(`${BASE}/chart/weekly-vs-today`);
  },

  /**
   * Lấy phân bổ theo nền tảng.
   */
  getPlatformBreakdown: (): Promise<ApiResponse<PlatformBreakdown[]>> => {
    return requestJson(`${BASE}/breakdown/platform`);
  },

  /**
   * Lấy top tài khoản online nhiều nhất hôm nay.
   */
  getTopOnline: (limit: number = 5): Promise<ApiResponse<TopOnlineEntry[]>> => {
    return requestJson(`${BASE}/top-online?limit=${limit}`);
  },

  /**
   * Lấy danh sách cảnh báo tài khoản.
   */
  getAlerts: (): Promise<ApiResponse<AccountAlert[]>> => {
    return requestJson(`${BASE}/alerts`);
  },

  /**
   * Lấy tổng số tài khoản (cho badge sidebar).
   */
  getTotalCount: (): Promise<ApiResponse<{ total: number }>> => {
    return requestJson(`${BASE}/count`);
  },

  /**
   * Tạo tài khoản seeding mới.
   */
  createAccount: (
    data: {
      platform: string;
      name: string;
      email_or_phone: string;
      password?: string;
      note?: string;
    },
  ): Promise<ApiResponse<SeedingAccount>> => {
    return requestJson(`${BASE}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Xóa tài khoản seeding.
   */
  deleteAccount: (id: string): Promise<ApiResponse<null>> => {
    return requestJson(`${BASE}/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Trigger re-login cho tài khoản (qua extension).
   */
  triggerRelogin: (id: string): Promise<ApiResponse<null>> => {
    return requestJson(`${BASE}/${id}/relogin`, {
      method: "POST",
    });
  },
};


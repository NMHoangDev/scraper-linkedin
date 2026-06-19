"use client";

import { PlatformStatsRow, PlatformStatCard } from "@/components/features/shared/PlatformStatCard";
import type { AdminDashboardSummaryData } from "@/services/all-platform.service";

interface AdminDashboardSummaryProps {
  data: AdminDashboardSummaryData | null;
  isLoading: boolean;
}

export function AdminDashboardSummary({ data, isLoading }: AdminDashboardSummaryProps) {
  if (isLoading || !data) {
    return (
      <PlatformStatsRow>
        <PlatformStatCard label="Tổng bài viết đã cào" value="Đang tải..." accent="primary" />
        <PlatformStatCard label="Tổng seeding đã thực hiện" value="Đang tải..." accent="secondary" />
        <PlatformStatCard label="Tỷ lệ phê duyệt seeding" value="Đang tải..." accent="success" />
        <PlatformStatCard label="Hiệu suất KPI công ty" value="Đang tải..." accent="warning" />
      </PlatformStatsRow>
    );
  }

  return (
    <PlatformStatsRow>
      <PlatformStatCard
        label="Tổng bài viết đã cào"
        value={data.total_crawled_posts}
        accent="primary"
        hint="Facebook & LinkedIn posts"
        hintTone="neutral"
      />
      <PlatformStatCard
        label="Tổng seeding đã thực hiện"
        value={data.total_seeding_comments}
        accent="secondary"
        hint="Lưu trên hệ thống"
        hintTone="neutral"
      />
      <PlatformStatCard
        label="Tỷ lệ phê duyệt seeding"
        value={`${data.approval_rate}%`}
        accent="success"
        hint="Tỷ lệ seeding hợp lệ (yes)"
        hintTone="up"
      />
      <PlatformStatCard
        label="Hiệu suất KPI công ty"
        value={`${data.kpi_rate}%`}
        accent="warning"
        hint="Bình quân hoàn thành KPI các team"
        hintTone="neutral"
      />
    </PlatformStatsRow>
  );
}

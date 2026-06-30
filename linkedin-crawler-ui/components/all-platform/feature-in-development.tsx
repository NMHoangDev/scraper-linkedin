"use client";

import Link from "next/link";

import { MaterialIcon } from "@/components/ui";

interface FeatureInDevelopmentProps {
  title: string;
  description: string;
}

export function FeatureInDevelopment({
  title,
  description,
}: FeatureInDevelopmentProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-4xl items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full rounded-[28px] border border-slate-100 bg-white p-6 shadow-none sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#DC2626]/10 text-[#DC2626]">
            <MaterialIcon name="rocket_launch" className="text-[30px]" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-slate-900">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500">
              <MaterialIcon name="rocket_launch" className="text-[20px]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tính năng đang phát triển</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Trang này chưa hoàn thiện giao diện hoặc luồng nghiệp vụ. Trong lúc chờ cập nhật,
                bạn có thể quay về Post feed hoặc Trang cá nhân để tiếp tục làm việc.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/all-platform/post-feed"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B91C1C]"
          >
            Về Post feed
          </Link>
          <Link
            href="/all-platform/profile"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Mở Trang cá nhân
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import {
  APP_PLATFORM_LABEL,
  type AppPlatform,
} from "@/lib/LinkedIn-app-platform";
import { cn } from "@/lib/utils";

const options: AppPlatform[] = ["linkedin", "facebook", "general"];

export function DashboardPlatformSwitcher() {
  const { platform, setPlatform } = useAppPlatform();
  const router = useRouter();
  const pathname = usePathname();

  const handlePlatformChange = (p: AppPlatform) => {
    setPlatform(p);
    if (p === "general") {
      if (pathname === "/post-feed") router.push("/all-platform/post-feed");
      else if (pathname === "/quan-ly-nhom") router.push("/all-platform/quan-ly-nhom");
      else if (pathname === "/quan-ly-tai-khoan") router.push("/all-platform/quan-ly-tai-khoan");
      else if (pathname === "/quan-ly-danh-muc") router.push("/all-platform/quan-ly-danh-muc");
      else if (pathname === "/profile") router.push("/all-platform/profile");
    } else {
      if (pathname === "/all-platform/post-feed") router.push("/post-feed");
      else if (pathname === "/all-platform/quan-ly-nhom") router.push("/quan-ly-nhom");
      else if (pathname === "/all-platform/quan-ly-tai-khoan") router.push("/quan-ly-tai-khoan");
      else if (pathname === "/all-platform/quan-ly-danh-muc") router.push("/post-feed");
      else if (pathname === "/all-platform/profile") router.push("/profile");
    }
  };

  return (
    <div className="mb-4 px-2">
      <p className="text-on-surface-variant mb-2 px-2 font-sans text-[10px] font-bold tracking-wider uppercase">
        Nền tảng
      </p>
      <div
        className="border-outline-variant bg-surface-container-low flex rounded-lg border p-0.5"
        role="group"
        aria-label="Chọn nền tảng crawler"
      >
        {options.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePlatformChange(p)}
            className={cn(
              "flex-1 rounded-md px-2 py-2 font-sans text-[10px] font-bold tracking-wide uppercase transition-colors",
              platform === p
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high/80",
            )}
          >
            {APP_PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

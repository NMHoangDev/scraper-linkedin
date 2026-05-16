import Link from "next/link";
import { MaterialIcon } from "@/components/ui";

const NAV_LINKS = [
  { href: "/zalo", label: "Dashboard", icon: "home" as const },
  { href: "/zalo/settings", label: "Cài đặt", icon: "settings" as const },
];

export default function ZaloLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="border-outline-variant bg-surface fixed top-0 right-0 left-0 z-40 flex h-14 items-center border-b px-lg shadow-sm">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <MaterialIcon name="chat_bubble" className="text-on-primary text-lg" />
            </div>
            <span className="text-on-surface font-black tracking-tight">
              Zalo Crawler
            </span>
          </div>

          <nav className="flex items-center gap-1" aria-label="Điều hướng Zalo">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center gap-1.5 rounded-lg px-sm py-1.5 text-sm font-medium transition-colors"
              >
                <MaterialIcon name={link.icon} className="text-base" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link
          href="/"
          className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-sm transition-colors"
          aria-label="Về trang chủ LinkedIn"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          LinkedIn
        </Link>
      </header>

      <main className="pt-14">
        <div className="mx-auto max-w-7xl px-lg py-lg">{children}</div>
      </main>
    </div>
  );
}

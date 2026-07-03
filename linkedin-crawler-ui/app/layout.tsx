import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/facebook-crawler/shared/components/contexts/AuthContext";
import { AppAuthProvider } from "@/contexts/AppAuthContext";
import { QueryProvider } from "@/components/providers/QueryProvider";

// Inter — dung dung font app.markeeai.com dang dung (xac nhan qua CSS production:
// font-family:var(--font-inter)). Chi expose bien --font-inter, KHONG doi --font-sans
// mac dinh cua toan app (van la system-ui stack) de tranh anh huong giao dien hien co —
// trang/component nao muon dung Inter thi tu ap dung className={inter.variable} hoac
// font-[family-name:var(--font-inter)].
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MarkeeAI - Seeding Tool",
  description:
    "Configure, run, and monitor LinkedIn group crawls with live logs and exportable results.",
  icons: {
    icon: "https://markeeai.com/logo.svg",
    shortcut: "https://markeeai.com/logo.svg",
    apple: "https://markeeai.com/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`light h-full antialiased ${inter.variable}`}>
      <head>
        {/* Material Symbols — không có next/font; cần cho icon ligature */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <AppAuthProvider>
              {children}
            </AppAuthProvider>
          </AuthProvider>
        </QueryProvider>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}

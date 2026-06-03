import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/facebook-crawler/shared/components/contexts/AuthContext";
import { AppAuthProvider } from "@/contexts/AppAuthContext";
import { QueryProvider } from "@/components/providers/QueryProvider";

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
    <html lang="vi" className="light h-full antialiased">
      <head>
        {/* Material Symbols — không có next/font; cần cho icon ligature */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
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

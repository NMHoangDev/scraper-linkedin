"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaterialIcon } from "@/components/ui";
import { extensionsData, type ExtensionItem } from "@/lib/extensions-data";
import { cn } from "@/lib/utils";

function ExtensionGuideAccordion({ item }: { item: ExtensionItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:bg-accent"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <MaterialIcon name="help" className="text-base text-muted-foreground" />
          Hướng dẫn
        </span>
        <MaterialIcon
          name="keyboard_arrow_down"
          className={cn("text-base text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <ol className="space-y-3">
            {item.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{step.content}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ExtensionStatusBadge({ isInternal }: { isInternal: boolean }) {
  if (!isInternal) {
    return <Badge className="bg-green-50 text-green-700 border-transparent">Available</Badge>;
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 border-transparent" title="Nội bộ / Chưa có bản tải công khai">
      Internal
    </Badge>
  );
}

function ExtensionCard({ item }: { item: ExtensionItem }) {
  return (
    <Card className="flex h-full flex-col gap-4 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pb-0 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MaterialIcon name={item.icon} className="text-2xl" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug text-foreground">{item.name}</CardTitle>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.category}</p>
          </div>
        </div>
        <ExtensionStatusBadge isInternal={item.isInternal} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-5">
        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>

        <div className="mt-auto space-y-4">
          {item.isInternal ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <MaterialIcon name="lock" className="shrink-0 text-base text-amber-600" />
              <span>Liên hệ admin để lấy bản cài đặt</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.downloadUrl ? (
                <Button asChild variant="default" size="sm">
                  <a href={item.downloadUrl} download>
                    <MaterialIcon name="download" className="text-base" />
                    Tải Extension
                  </a>
                </Button>
              ) : null}
              {item.configUrl ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={item.configUrl}>
                    <MaterialIcon name="settings" className="text-base" />
                    Mở cấu hình
                  </Link>
                </Button>
              ) : null}
              {item.videoUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                    <MaterialIcon name="videocam" className="text-base" />
                    Video hướng dẫn
                  </a>
                </Button>
              ) : null}
            </div>
          )}

          <ExtensionGuideAccordion item={item} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LibraryExtensionsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Thư viện Extension</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tập trung các tiện ích mở rộng Chrome hỗ trợ seeding, cào dữ liệu và tự động hoá.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {extensionsData.map((item) => (
          <ExtensionCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

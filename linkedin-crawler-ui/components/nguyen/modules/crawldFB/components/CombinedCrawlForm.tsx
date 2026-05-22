"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiDeleteBin6Line } from "react-icons/ri";

// LinkedIn imports
import { MaterialIcon } from "@/components/ui";
import {
  normalizeN8nGroupsList,
  type ManagedGroupRow,
} from "@/lib/LinkedIn-n8n-groups-normalize";
import { getAllN8nGroups } from "@/services/linkedinCrawlerService";
import { useDashboard } from "@/components/features/dashboard/dashboard-context";

// Facebook imports
import { CrawlFb_Schemas, CrawlFb_form } from "../schemas/crawlFb_schemas";
import { useAuthContext } from "../../../shared/components/contexts/AuthContext";
import FullScreenLoading from "../../../shared/components/layout/FullScreenLoading";
import { useCrawlFB } from "../hooks/useCrawlFB";
import { IntentBatchModal } from "./intent_component";
import { IntentItemDTO } from "../schemas/intent_schemas";
import { useGetIntents } from "../hooks/useGetIntents";
import { SelectPresetGroupsModal } from "./SelectPresetGroupsModal";
import FacebookPosts from "./processRawFacebookPosts";

// ──────────────────────────────────────────────────────────
// Shared input style (LinkedIn design system)
const INPUT_CLS =
  "border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm transition-all outline-none focus:ring-1 w-full";
const LABEL_CLS =
  "text-label-md text-on-surface-variant font-semibold tracking-wide uppercase";
const BTN_PRIMARY =
  "bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] rounded-lg py-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-outline-variant bg-surface hover:bg-surface-container-high rounded-lg border px-md py-xs text-xs font-bold uppercase";

type Tab = "linkedin" | "facebook";

// ──────────────────────────────────────────────────────────
// LinkedIn sub-form
function LinkedInForm() {
  const PICKER_PAGE_SIZE = 8;
  const d = useDashboard();

  useEffect(() => {
    if (d.role === "member") {
      d.fetchMyKpi();
      d.handleGetAllPosts();
    }
  }, [d.email, d.role]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerRows, setPickerRows] = useState<ManagedGroupRow[]>([]);
  const [pickedUrls, setPickedUrls] = useState<Set<string>>(new Set());
  const [pickerPage, setPickerPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("all");

  const selectedPreview = useMemo(
    () => d.groupUrls.split("\n").map((l) => l.trim()).filter(Boolean),
    [d.groupUrls]
  );

  const pickerTypeOptions = useMemo(() => {
    const types = pickerRows.map((r) => r.type?.trim()).filter((t): t is string => Boolean(t));
    return Array.from(new Set(types));
  }, [pickerRows]);

  const filteredPickerRows = useMemo(
    () => (selectedType === "all" ? pickerRows : pickerRows.filter((r) => r.type === selectedType)),
    [pickerRows, selectedType]
  );

  const pickerTotalPages = Math.max(1, Math.ceil(filteredPickerRows.length / PICKER_PAGE_SIZE));
  const pickerSafePage = Math.min(pickerPage, pickerTotalPages);
  const pickerPageStart = (pickerSafePage - 1) * PICKER_PAGE_SIZE;
  const pickerPageRows = filteredPickerRows.slice(pickerPageStart, pickerPageStart + PICKER_PAGE_SIZE);

  const openGroupPicker = async () => {
    if (!d.email.trim()) {
      setPickerError("Nhập Email (LinkedIn) trước khi chọn danh sách nhóm.");
      return;
    }
    setPickerOpen(true);
    setPickerBusy(true);
    setPickerPage(1);
    setPickerError(null);
    setSelectedType("all");
    try {
      const res = await getAllN8nGroups({ email: d.email.trim() });
      if (!res.success) throw new Error(res.message || "Không tải được danh sách nhóm.");
      const rows = normalizeN8nGroupsList(res.data?.groups ?? res.data?.parsed);
      setPickerRows(rows);
      setPickedUrls(new Set(selectedPreview));
    } catch (e) {
      setPickerRows([]);
      setPickerError(e instanceof Error ? e.message : "Lỗi tải danh sách nhóm.");
    } finally {
      setPickerBusy(false);
    }
  };

  const togglePick = (url: string) => {
    setPickedUrls((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const applyPickedGroups = () => {
    d.setGroupUrls(pickerRows.filter((r) => pickedUrls.has(r.url_group)).map((r) => r.url_group).join("\n"));
    setPickerOpen(false);
  };

  const togglePickAll = () => {
    if (!filteredPickerRows.length) return;
    const allSelected = filteredPickerRows.every((r) => pickedUrls.has(r.url_group));
    setPickedUrls((prev) => {
      const next = new Set(prev);
      filteredPickerRows.forEach((r) => (allSelected ? next.delete(r.url_group) : next.add(r.url_group)));
      return next;
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-md">
        {/* Email */}
        <div className="flex flex-col gap-base">
          <label htmlFor={d.emailId} className={LABEL_CLS}>Email (LinkedIn)</label>
          <input id={d.emailId} className={INPUT_CLS} placeholder="example@congty.com" type="email"
            value={d.email} onChange={(e) => d.setEmail(e.target.value)} autoComplete="username" disabled={d.isCrawling} />
        </div>
        {/* Password */}
        <div className="flex flex-col gap-base">
          <label htmlFor={d.passwordId} className={LABEL_CLS}>Mật khẩu</label>
          <input id={d.passwordId} className={INPUT_CLS} placeholder="••••••••••••" type="password"
            value={d.password} onChange={(e) => d.setPassword(e.target.value)} autoComplete="current-password" disabled={d.isCrawling} />
        </div>
        {/* Max posts + Target date */}
        <div className="grid grid-cols-2 gap-md">
          <div className="flex flex-col gap-base">
            <label htmlFor={d.maxPostsId} className={LABEL_CLS}>Tối đa bài viết</label>
            <input id={d.maxPostsId} className={INPUT_CLS} type="number" min={1} value={d.maxPosts}
              onChange={(e) => d.setMaxPosts(Number.parseInt(e.target.value, 10) || 0)} disabled={d.isCrawling} />
          </div>
          <div className="flex flex-col gap-base">
            <label htmlFor={d.targetDateId} className={LABEL_CLS}>Ngày mục tiêu</label>
            <input id={d.targetDateId} className={INPUT_CLS} type="date" value={d.targetDate}
              onChange={(e) => d.setTargetDate(e.target.value)} disabled={d.isCrawling} />
          </div>
        </div>
        {/* Mode + Delay */}
        <div className="grid grid-cols-2 gap-md">
          <div className="flex flex-col gap-base">
            <label htmlFor={d.modeId} className={LABEL_CLS}>Chế độ</label>
            <select id={d.modeId} className={INPUT_CLS} value={d.mode}
              onChange={(e) => d.setMode(e.target.value as "Detailed" | "Fast")} disabled={d.isCrawling}>
              <option value="Detailed">Chi tiết</option>
              <option value="Fast">Nhanh</option>
            </select>
          </div>
          <div className="flex flex-col gap-base">
            <label htmlFor={d.delayId} className={LABEL_CLS}>Độ trễ (giây)</label>
            <input id={d.delayId} className={INPUT_CLS} type="number" min={0} value={d.delaySec}
              onChange={(e) => d.setDelaySec(Number.parseInt(e.target.value, 10) || 0)} disabled={d.isCrawling} />
          </div>
        </div>
        {/* Group URLs */}
        <div className="flex flex-col gap-base">
          <label htmlFor={d.urlsId} className={LABEL_CLS}>URL nhóm LinkedIn</label>
          <textarea id={d.urlsId} className={`${INPUT_CLS} resize-none font-mono text-sm`}
            placeholder="Chọn nhóm từ popup để đưa vào payload /start" rows={5}
            value={d.groupUrls} readOnly onClick={() => void openGroupPicker()} disabled={d.isCrawling || pickerBusy} />
          <div className="flex items-center justify-between gap-md">
            <p className="text-body-sm text-on-surface-variant">
              Đã chọn <span className="font-semibold text-on-surface">{selectedPreview.length}</span> nhóm.
            </p>
            <button type="button" className={BTN_OUTLINE} onClick={() => void openGroupPicker()} disabled={d.isCrawling || pickerBusy}>
              {pickerBusy ? "Đang tải nhóm..." : "Chọn nhóm từ danh sách"}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {(d.feedbackMessage || d.errorMessage) && (
        <div className={`rounded-lg border px-md py-sm text-body-sm mt-md ${d.errorMessage
          ? "border-error-container bg-error-container/40 text-error"
          : "border-secondary-container bg-secondary-container/20 text-on-secondary-container"}`}
          role={d.errorMessage ? "alert" : "status"}>
          {d.errorMessage ?? d.feedbackMessage}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-md flex flex-col items-center gap-md sm:flex-row">
        <button type="button" className={`${BTN_PRIMARY} w-full sm:flex-1`}
          onClick={d.handleStartCrawl} disabled={d.isCrawling}>
          {d.isCrawling ? "Đang crawl..." : "Bắt đầu Crawl"}
        </button>
        <button type="button"
          className="border-primary text-primary hover:bg-primary/5 w-full rounded-lg border bg-transparent py-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
          onClick={d.handleValidateLinks} disabled={d.isCrawling}>
          Kiểm tra URL
        </button>
      </div>
      <button type="button"
        className="text-on-surface-variant hover:text-on-surface text-label-md py-xs w-full text-center font-semibold tracking-wide uppercase transition-colors"
        onClick={d.handleResetForm} disabled={d.isCrawling}>
        Đặt lại biểu mẫu
      </button>

      {/* Group Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-md sm:items-center" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Đóng" onClick={() => !pickerBusy && setPickerOpen(false)} />
          <div className="border-outline-variant bg-surface relative z-10 w-[min(94vw,920px)] rounded-xl border p-lg shadow-xl"
            role="dialog" aria-modal="true" aria-labelledby="group-picker-title">
            <h3 id="group-picker-title" className="text-h3 text-on-surface font-semibold">LỰA CHỌN NHÓM CÀO</h3>
            <div className="mt-sm flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-xs">
                <label className={LABEL_CLS}>Lọc theo loại nhóm</label>
                <select className="border-outline-variant bg-surface focus:border-primary focus:ring-primary min-w-[220px] rounded-lg border px-md py-xs text-sm transition-all outline-none focus:ring-1"
                  value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setPickerPage(1); }}
                  disabled={pickerBusy || !pickerRows.length}>
                  <option value="all">Tất cả loại nhóm</option>
                  {pickerTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="button" className={`${BTN_OUTLINE} disabled:cursor-not-allowed disabled:opacity-60`}
                onClick={togglePickAll} disabled={pickerBusy || !filteredPickerRows.length}>
                {filteredPickerRows.length > 0 && filteredPickerRows.every((r) => pickedUrls.has(r.url_group))
                  ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>

            {pickerError && (
              <div className="border-error-container bg-error-container/40 text-error mt-md rounded-lg border px-md py-sm text-body-sm">{pickerError}</div>
            )}

            <div className="mt-md max-h-[52vh] overflow-auto rounded-lg border border-outline-variant">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-surface-container-low border-outline-variant border-b">
                  <tr>
                    <th className="px-md py-sm">Chọn</th>
                    <th className="px-md py-sm">URL nhóm</th>
                    <th className="px-md py-sm">Tên nhóm</th>
                    <th className="px-md py-sm">Loại</th>
                    <th className="px-md py-sm text-right">Thành viên</th>
                  </tr>
                </thead>
                <tbody className="divide-outline-variant divide-y">
                  {pickerPageRows.map((row, idx) => (
                    <tr key={`${row.url_group}-${idx}`} className="hover:bg-surface-container/40">
                      <td className="px-md py-sm">
                        <input type="checkbox" className="accent-primary size-4"
                          checked={pickedUrls.has(row.url_group)} onChange={() => togglePick(row.url_group)} />
                      </td>
                      <td className="px-md py-sm break-all">{row.url_group}</td>
                      <td className="px-md py-sm">{row.name_group || "—"}</td>
                      <td className="px-md py-sm">{row.type || "—"}</td>
                      <td className="px-md py-sm text-right tabular-nums">{row.member.toLocaleString("vi-VN")}</td>
                    </tr>
                  ))}
                  {!pickerBusy && !filteredPickerRows.length && (
                    <tr>
                      <td className="text-on-surface-variant px-md py-lg text-center" colSpan={5}>
                        {!pickerRows.length ? "Không có nhóm nào từ API get-group." : "Không có nhóm nào phù hợp với bộ lọc."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pickerRows.length > 0 && (
              <div className="text-body-sm text-on-surface-variant mt-md flex items-center justify-between gap-md">
                <span>Hiển thị {pickerPageStart + 1}–{Math.min(pickerPageStart + PICKER_PAGE_SIZE, filteredPickerRows.length)} / {filteredPickerRows.length} nhóm</span>
                <div className="flex items-center gap-sm">
                  <button type="button" className="hover:bg-surface-container-high rounded p-2 transition-colors disabled:opacity-30"
                    onClick={() => setPickerPage((p) => Math.max(1, p - 1))} disabled={pickerSafePage <= 1} aria-label="Trang trước">
                    <MaterialIcon name="chevron_left" />
                  </button>
                  <span className="text-on-surface px-md font-bold">{pickerSafePage}/{pickerTotalPages}</span>
                  <button type="button" className="hover:bg-surface-container-high rounded p-2 transition-colors disabled:opacity-30"
                    onClick={() => setPickerPage((p) => Math.min(pickerTotalPages, p + 1))} disabled={pickerSafePage >= pickerTotalPages} aria-label="Trang sau">
                    <MaterialIcon name="chevron_right" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-lg flex items-center justify-between gap-sm">
              <span className="text-body-sm text-on-surface-variant">Đã chọn {pickedUrls.size}/{pickerRows.length} nhóm</span>
              <div className="flex items-center gap-sm">
                <button type="button" className="rounded-lg px-md py-sm text-sm font-bold uppercase text-on-surface-variant"
                  onClick={() => setPickerOpen(false)}>Hủy</button>
                <button type="button" className="bg-primary text-on-primary rounded-lg px-lg py-sm text-sm font-bold uppercase"
                  onClick={applyPickedGroups}>Áp dụng nhóm đã chọn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crawl Success Modal */}
      {/* biome-ignore: reuse existing modal */}
      {/* (kept exactly as LinkedIn-CrawlerConfigCard) */}
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Facebook sub-form
function FacebookForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const { intents, isLoading: isLoadingIntents, fetchIntents } = useGetIntents();
  const [localIntentsList, setLocalIntentsList] = useState<IntentItemDTO[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchIntents();
      if (data?.length) setLocalIntentsList(data);
    };
    load();
  }, [fetchIntents]);

  const handleCreatedSuccess = (newIntents: IntentItemDTO[]) => {
    setLocalIntentsList((prev) => [...newIntents, ...prev]);
  };

  const { user } = useAuthContext();
  const { isLoading, loadingMsg, submitCrawlData, result, cancelCrawl } = useCrawlFB();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(CrawlFb_Schemas),
    defaultValues: { isDefaultAccount: false, userName: user?.email || "", password: "", rows: [{ name: "", url: "", Intent: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "rows" });

  const getFirstErrorMessage = (obj: any): string | null => {
    if (!obj) return null;
    if (obj.message && typeof obj.message === "string") return obj.message;
    for (const key in obj) { const f = getFirstErrorMessage(obj[key]); if (f) return f; }
    return null;
  };
  const firstErrorMsg = getFirstErrorMessage(errors);

  const handleSelectPresetGroups = (groups: { name: string; url: string; intent: string }[]) => {
    groups.forEach((g) => append({ name: g.name, url: g.url, Intent: g.intent }));
  };

  const HandleOnsubmit = async (data: CrawlFb_form) => submitCrawlData(data);

  return (
    <>
      {isLoading && <FullScreenLoading title="Tiến trình đang chạy" content={loadingMsg} onCancel={cancelCrawl} />}

      <form onSubmit={handleSubmit(HandleOnsubmit)} className="flex flex-col gap-md">
        {/* Email row */}
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 sm:items-end">
          <div className="flex flex-col gap-base">
            <label htmlFor="fb-username" className={LABEL_CLS}>Email đăng nhập</label>
            <input id="fb-username" disabled placeholder="email or phone"
              className={`${INPUT_CLS} ${watch("isDefaultAccount") ? "bg-surface-container text-on-surface-variant cursor-not-allowed" : ""}`}
              {...register("userName")} />
          </div>
          <div className="flex items-end">
            <a href="/minhhoang-scraper/loginFb"
              className="border-outline-variant bg-surface hover:bg-surface-container-high rounded-lg border px-md py-sm text-xs font-bold uppercase transition-all inline-block">
              Xác nhận tài khoản FB
            </a>
          </div>
        </div>

        {/* Default account checkbox */}
        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" className="accent-primary size-4" checked={watch("isDefaultAccount")} {...register("isDefaultAccount")} />
          <span className="text-body-sm text-on-surface-variant">Sử dụng tài khoản mặc định</span>
        </label>

        {/* Dynamic rows */}
        <div className="flex flex-col gap-sm">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-sm items-center">
              <input placeholder="Nhập tên dữ liệu"
                className="col-span-3 border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm text-sm outline-none focus:ring-1"
                {...register(`rows.${index}.name` as const)} />
              <input placeholder="https://"
                className="col-span-5 border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm text-sm outline-none focus:ring-1"
                {...register(`rows.${index}.url` as const)} />
              <select
                className="col-span-3 border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm text-sm outline-none focus:ring-1"
                {...register(`rows.${index}.Intent` as const)}>
                <option value="" disabled>-- Chọn kịch bản quét --</option>
                {localIntentsList.map((item, i) => (
                  <option key={i} value={item.value}>{item.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => remove(index)}
                className="col-span-1 flex justify-center text-error hover:scale-110 transition">
                <RiDeleteBin6Line className="text-xl" />
              </button>
            </div>
          ))}
        </div>

        {/* Row controls */}
        <div className="flex items-center gap-md">
          <button type="button" className={BTN_OUTLINE + " px-md py-sm"}
            onClick={() => append({ name: "", url: "", Intent: "" })}>+ Thêm dòng mới</button>
          <button type="button" className={BTN_OUTLINE + " px-md py-sm"}
            onClick={() => setIsPresetModalOpen(true)}>Chọn groups có sẵn</button>
          <button type="button" className={BTN_OUTLINE + " px-md py-sm ml-auto"}
            onClick={() => setIsModalOpen(true)}>+ Thêm intent mới</button>
        </div>

        {/* Error + submit */}
        <div className="flex items-center justify-between gap-md border-t border-outline-variant pt-md mt-sm">
          <p className={`text-body-sm ${firstErrorMsg ? "text-error font-medium" : "text-on-surface-variant"}`}>
            {firstErrorMsg || "Vui lòng điền đầy đủ thông tin trước khi xử lý."}
          </p>
          <button type="submit" className={`${BTN_PRIMARY} px-lg`}>Xử lý dữ liệu</button>
        </div>
      </form>

      {result && <FacebookPosts mockPosts={result} />}

      <IntentBatchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleCreatedSuccess} />
      <SelectPresetGroupsModal isOpen={isPresetModalOpen} onClose={() => setIsPresetModalOpen(false)} onSelectGroups={handleSelectPresetGroups} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Combined component (exported – replaces CrawlFB_Form in page.tsx)
export default function CombinedCrawlForm() {
  const [activeTab, setActiveTab] = useState<Tab>("facebook");

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "facebook", label: "Facebook", icon: "groups" },
    { key: "linkedin", label: "LinkedIn", icon: "business_center" },
  ];

  return (
    <section className="flex flex-col gap-md w-full max-w-4xl mx-auto">
      <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-md rounded-xl border p-lg shadow-sm">
        {/* Header */}
        <div className="border-surface-variant mb-sm flex items-center gap-2 border-b pb-md">
          <MaterialIcon name="cloud_download" className="shrink-0 text-primary" />
          <h2 className="text-h3 font-semibold">Thu thập dữ liệu</h2>
          <span className="text-body-sm text-on-surface-variant ml-1">— LinkedIn &amp; Facebook</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-xs rounded-md px-md py-xs text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <MaterialIcon name={tab.icon} className="text-[18px]" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div className="mt-sm">
          {activeTab === "linkedin" ? <LinkedInForm /> : <FacebookForm />}
        </div>
      </div>
    </section>
  );
}

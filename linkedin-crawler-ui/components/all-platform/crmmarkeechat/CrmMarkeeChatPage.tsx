"use client";

// crmmarkeechat/CrmMarkeeChatPage.tsx — port từ CRMPage.vue.
// Orchestrator: viewMode (kanban/table), search/filter, modal & drawer state,
// tất cả thao tác trên mock state cục bộ (useState), không gọi API thật.

import { useMemo, useState } from "react";
import { LayoutGrid, Plus, Search, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import CrmKanbanBoard from "./CrmKanbanBoard";
import CrmTableView from "./CrmTableView";
import CrmStageModal from "./CrmStageModal";
import CrmCustomerModal from "./CrmCustomerModal";
import CrmDetailDrawer from "./CrmDetailDrawer";
import { MOCK_DEALS } from "./mockData";
import type { CrmDeal, DealStage, StageHistoryEntry, StageTransitionPayload } from "./types";
import { DEAL_STAGE_META, getCurrentStage } from "./crmConfig";

type ViewMode = "kanban" | "table";

let localIdCounter = 1000;
function nextLocalId(): string {
  localIdCounter += 1;
  return `local-${localIdCounter}`;
}

export default function CrmMarkeeChatPage() {
  const [deals, setDeals] = useState<CrmDeal[]>(MOCK_DEALS);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");

  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CrmDeal | null>(null);
  const [stageModalDeal, setStageModalDeal] = useState<CrmDeal | null>(null);
  const [stageModalTarget, setStageModalTarget] = useState<DealStage | undefined>(undefined);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesSearch =
        !q ||
        deal.customer_name.toLowerCase().includes(q) ||
        (deal.company_name || "").toLowerCase().includes(q) ||
        (deal.phone || "").includes(q);
      const matchesStage = stageFilter === "all" || getCurrentStage(deal) === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, search, stageFilter]);

  function openDetail(deal: CrmDeal) {
    setSelectedDeal(deal);
    setShowDetailDrawer(true);
  }

  function closeDetail() {
    setShowDetailDrawer(false);
    setSelectedDeal(null);
  }

  function openCreateModal() {
    setEditingDeal(null);
    setShowCustomerModal(true);
  }

  function openEditModal(deal: CrmDeal) {
    setEditingDeal(deal);
    setShowCustomerModal(true);
  }

  function closeCustomerModal() {
    setShowCustomerModal(false);
    setEditingDeal(null);
  }

  function handleDeleteDeal(deal: CrmDeal) {
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    if (selectedDeal?.id === deal.id) closeDetail();
  }

  function handleCustomerSubmit(payload: Partial<CrmDeal>) {
    if (editingDeal) {
      setDeals((prev) =>
        prev.map((d) => (d.id === editingDeal.id ? { ...d, ...payload } : d)),
      );
      if (selectedDeal?.id === editingDeal.id) {
        setSelectedDeal((prev) => (prev ? { ...prev, ...payload } : prev));
      }
    } else {
      const newDeal: CrmDeal = {
        id: nextLocalId(),
        customer_name: payload.customer_name || "Khách hàng mới",
        source_platform: payload.source_platform || "Manual",
        deal_stage: (payload.deal_stage as DealStage) || "new_lead",
        created_at: new Date().toISOString(),
        stage_history: [
          {
            id: nextLocalId(),
            created_at: new Date().toISOString(),
            action: "Tạo deal mới",
          },
        ],
        ...payload,
      };
      setDeals((prev) => [newDeal, ...prev]);
    }
    closeCustomerModal();
  }

  function openStageModal(deal: CrmDeal, toStage?: DealStage) {
    setStageModalDeal(deal);
    setStageModalTarget(toStage);
  }

  function closeStageModal() {
    setStageModalDeal(null);
    setStageModalTarget(undefined);
  }

  function handleStageSubmit(payload: StageTransitionPayload) {
    if (!stageModalDeal) return;
    const fromStage = getCurrentStage(stageModalDeal);
    const historyEntry: StageHistoryEntry = {
      id: nextLocalId(),
      created_at: new Date().toISOString(),
      from_stage: fromStage,
      to_stage: payload.to_stage,
      note: payload.note || undefined,
    };

    const updates: Partial<CrmDeal> = {
      deal_stage: payload.to_stage,
      note: payload.note || stageModalDeal.note,
      decision_maker: payload.decision_maker || stageModalDeal.decision_maker,
      estimated_budget: payload.estimated_budget ?? stageModalDeal.estimated_budget,
      follow_up_date: payload.follow_up_date || stageModalDeal.follow_up_date,
      last_attachment_url: payload.attachment_url || stageModalDeal.last_attachment_url,
      last_attachment_name: payload.attachment_name || stageModalDeal.last_attachment_name,
      reject_reason_type: payload.reject_reason_type || stageModalDeal.reject_reason_type,
      reject_reason_text: payload.reject_reason_text || stageModalDeal.reject_reason_text,
      reject_reason: payload.reject_reason || stageModalDeal.reject_reason,
      closed_at: payload.to_stage === "won" ? new Date().toISOString() : stageModalDeal.closed_at,
      stage_history: [...(stageModalDeal.stage_history || []), historyEntry],
    };

    setDeals((prev) =>
      prev.map((d) => (d.id === stageModalDeal.id ? { ...d, ...updates } : d)),
    );
    if (selectedDeal?.id === stageModalDeal.id) {
      setSelectedDeal((prev) => (prev ? { ...prev, ...updates } : prev));
    }
    closeStageModal();
  }

  const stageOptions: Array<{ value: DealStage | "all"; label: string }> = [
    { value: "all", label: "Tất cả giai đoạn" },
    ...Object.entries(DEAL_STAGE_META).map(([value, meta]) => ({
      value: value as DealStage,
      label: meta.label,
    })),
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">CRM Markee Chat</h1>
          <p className="text-xs text-slate-400">
            Bản demo UI — dữ liệu là mock, thao tác không lưu vào backend thật.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" /> Tạo deal mới
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded border border-slate-300 px-2 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, công ty, SĐT..."
            className="w-full text-sm outline-none"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as DealStage | "all")}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {stageOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded border border-slate-300">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm",
              viewMode === "kanban" ? "bg-slate-800 text-white" : "bg-white text-slate-600",
            )}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1 border-l border-slate-300 px-3 py-1.5 text-sm",
              viewMode === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-600",
            )}
          >
            <TableIcon className="h-4 w-4" /> Bảng
          </button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <CrmKanbanBoard
          deals={filteredDeals}
          onCardClick={openDetail}
          onEdit={openEditModal}
          onDelete={handleDeleteDeal}
          onRequestMove={(deal, toStage) => openStageModal(deal, toStage)}
        />
      ) : (
        <CrmTableView
          deals={filteredDeals}
          onRowClick={openDetail}
          onEdit={openEditModal}
          onDelete={handleDeleteDeal}
        />
      )}

      {showDetailDrawer && selectedDeal && (
        <CrmDetailDrawer
          deal={selectedDeal}
          activityLog={selectedDeal.stage_history || []}
          loadingLog={false}
          onClose={closeDetail}
          onEdit={openEditModal}
          onChangeStage={(deal) => openStageModal(deal)}
        />
      )}

      {showCustomerModal && (
        <CrmCustomerModal
          deal={editingDeal}
          onClose={closeCustomerModal}
          onSubmit={handleCustomerSubmit}
        />
      )}

      {stageModalDeal && (
        <CrmStageModal
          deal={stageModalDeal}
          initialToStage={stageModalTarget}
          onClose={closeStageModal}
          onSubmit={handleStageSubmit}
        />
      )}
    </div>
  );
}

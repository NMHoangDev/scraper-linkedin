'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContractDetailModal } from './ContractDetailModal';
import { CrmKanbanBoard } from './CrmKanbanBoard';
import { CrmTableView } from './CrmTableView';
import { DealFormModal, clearDealDraft } from './DealFormModal';
import { DetailDrawer } from './DetailDrawer';
import { FileText, LayoutGrid, Loader2, Plus, RotateCcw, TableIcon, Trophy } from './icons';
import { StageModal } from './StageModal';
import { CreateQuoteModal } from '../integrations/quotes';
import {
  CITY_OPTIONS,
  DEAL_STAGE_META,
  DEAL_STAGES,
  INDUSTRY_OPTIONS,
  SOURCE_OPTIONS,
  formatVND,
  humanizeCrmError,
} from '../constants/crmConfig';
import { useCrm } from '../hooks/useCrm';
import type { ContractStatus, CreateDealInput, Deal, DealStage, StageTransitionInput, UpdateDealInput } from '../types';
import { teamsService, type TeamRow } from '@/services/all-platform.service';

type FilterState = {
  search: string;
  source: string;
  city: string;
  industry: string;
  team: string;
};

export function CrmShell() {
  const {
    deals,
    agents,
    sourceOptions: dealFormSourceOptions,
    servicePackageOptions: dealFormServicePackageOptions,
    packageOptions: dealFormPackageOptions,
    industryOptions: dealFormIndustryOptions,
    loading,
    saving,
    error,
    stats,
    loadDeals,
    getDeal,
    createDeal,
    updateDeal,
    deleteDeal,
    moveDeal,
  } = useCrm();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filters, setFilters] = useState<FilterState>({ search: '', source: '', city: '', industry: '', team: '' });
  const [teams, setTeams] = useState<TeamRow[]>([]);

  // Dropdown lọc team — DB-driven (GET /teams), không hard-code.
  useEffect(() => {
    let alive = true;
    void teamsService.getAll().then(res => {
      if (alive && res.success && res.data) setTeams(res.data);
    });
    return () => { alive = false; };
  }, []);
  const [activeStageFilters, setActiveStageFilters] = useState<DealStage[]>([]);
  const [openFilter, setOpenFilter] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contractDeal, setContractDeal] = useState<Deal | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; deal: Deal | null }>({ open: false, deal: null });
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [stageData, setStageData] = useState<{ deal: Deal; toStage: DealStage } | null>(null);
  const [reviewData, setReviewData] = useState<{ deal: Deal; toStage: DealStage } | null>(null);
  const [toast, setToast] = useState('');

  // Toast tự ẩn sau vài giây — không dùng window.alert() cho việc báo thành công
  // vì alert chặn thao tác tiếp theo, gây khó chịu cho hành động vốn đã ổn.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Khoá scroll của trang nền khi có modal/drawer nào đang mở — nếu không, cuộn
  // chuột bên trong popup (vd DetailDrawer) vẫn kéo theo cuộn cả trang phía sau.
  const anyOverlayOpen =
    detailOpen || Boolean(contractDeal) || createOpen || quoteModal.open || Boolean(editingDeal) || Boolean(stageData) || Boolean(reviewData);
  useEffect(() => {
    if (!anyOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [anyOverlayOpen]);

  const sourceOptions = useMemo(() => {
    const fromData = deals.map(deal => deal.sourcePlatform || 'Manual').filter(Boolean);
    const map = new Map(SOURCE_OPTIONS.map(option => [option.value, option]));
    fromData.forEach(value => {
      if (!map.has(value)) map.set(value, { value, label: value });
    });
    return [...map.values()];
  }, [deals]);

  const cityOptions = useMemo(() => [...new Set([...CITY_OPTIONS, ...deals.map(deal => deal.city || '').filter(Boolean)])], [deals]);
  const industryOptions = useMemo(() => [...new Set([...INDUSTRY_OPTIONS, ...deals.map(deal => deal.industry || '').filter(Boolean)])], [deals]);

  const filterDropdownOptions = {
    source: [{ value: '', label: 'Tất cả nguồn' }, ...sourceOptions],
    city: [{ value: '', label: 'Tất cả thành phố' }, ...cityOptions.map(city => ({ value: city, label: city }))],
    industry: [{ value: '', label: 'Tất cả lĩnh vực' }, ...industryOptions.map(industry => ({ value: industry, label: industry }))],
    team: [{ value: '', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name_team }))],
  };

  const filteredDeals = useMemo(() => {
    let list = [...deals];
    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter(deal =>
        [deal.customerName, deal.companyName, deal.phone, deal.email, deal.sourcePlatform, deal.city, deal.industry]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q))
      );
    }
    if (filters.source) list = list.filter(deal => deal.sourcePlatform === filters.source);
    if (filters.city) list = list.filter(deal => deal.city === filters.city);
    if (filters.industry) list = list.filter(deal => deal.industry === filters.industry);
    if (filters.team) list = list.filter(deal => deal.teamId === filters.team);
    if (activeStageFilters.length) list = list.filter(deal => activeStageFilters.includes(deal.stage));
    return list;
  }, [activeStageFilters, deals, filters]);

  const hasFilters = filters.search || filters.source || filters.city || filters.industry || filters.team || activeStageFilters.length;

  function filterLabel(key: 'source' | 'city' | 'industry' | 'team') {
    return filterDropdownOptions[key].find(option => option.value === filters[key])?.label || 'Tất cả';
  }

  function selectFilter(key: 'source' | 'city' | 'industry' | 'team', value: string) {
    setFilters(current => ({ ...current, [key]: value }));
    setOpenFilter('');
  }

  function toggleStageFilter(stage: DealStage) {
    setActiveStageFilters(current =>
      current.includes(stage) ? current.filter(item => item !== stage) : [...current, stage]
    );
  }

  async function openDetail(deal: Deal) {
    setSelectedDeal(deal);
    setDetailOpen(true);
    try {
      setSelectedDeal(await getDeal(deal.id));
    } catch {
      setSelectedDeal(deal);
    }
  }

  async function handleCreate(input: CreateDealInput) {
    try {
      const deal = await createDeal(input);
      clearDealDraft();
      setCreateOpen(false);
      setSelectedDeal(deal);
      setDetailOpen(true);
    } catch (err) {
      window.alert(err instanceof Error ? humanizeCrmError(err.message) : 'Không tạo được deal. Vui lòng kiểm tra lại thông tin.');
    }
  }

  async function handleUpdate(id: string, input: UpdateDealInput) {
    try {
      const deal = await updateDeal(id, input);
      setEditingDeal(null);
      setSelectedDeal(deal);
    } catch (err) {
      window.alert(err instanceof Error ? humanizeCrmError(err.message) : 'Không lưu được deal. Vui lòng kiểm tra lại thông tin.');
    }
  }

  async function handleDelete(deal: Deal) {
    if (!window.confirm(`Xóa deal "${deal.customerName}"?`)) return;
    try {
      await deleteDeal(deal.id);
      setDetailOpen(false);
      setSelectedDeal(null);
    } catch (err) {
      window.alert(err instanceof Error ? humanizeCrmError(err.message) : 'Không xóa được deal. Vui lòng thử lại.');
    }
  }

  async function handleMove(payload: StageTransitionInput) {
    if (!stageData) return;
    try {
      const isReviewUpdate =
        stageData.deal.stage === stageData.toStage && (stageData.toStage === 'won' || stageData.toStage === 'lost');
      const deal = isReviewUpdate
        ? await updateDeal(stageData.deal.id, {
            decisionMaker: payload.decisionMaker,
            estimatedBudget: payload.estimatedBudget,
            followUpDate: payload.followUpDate,
            outcome: {
              ...payload.outcome,
              reviewType: stageData.toStage as 'won' | 'lost',
              reviewedAt: new Date().toISOString(),
            },
          })
        : await moveDeal(stageData.deal.id, stageData.toStage, payload);
      const toStage = stageData.toStage;
      setStageData(null);
      // Đóng luôn drawer chi tiết — nó vẫn phủ kín màn hình phía sau StageModal,
      // để mở thì cuộn board bên dưới xong cũng không thấy được gì (đã bị che).
      setDetailOpen(false);
      setSelectedDeal(deal);
      setToast(`Đã chuyển "${deal.customerName}" sang "${DEAL_STAGE_META[toStage].label}".`);
      // Cuộn tới đúng cột/ô mà deal vừa "hạ cánh" trên board — cột pipeline bình
      // thường hay ô trạng thái cuối (Thắng/Thua/Tạm dừng) nằm tuốt dưới cùng
      // trang. Đợi 1 nhịp cho drawer/modal đóng animation + body scroll-lock gỡ
      // ra rồi mới cuộn, không thì scrollIntoView chạy giữa lúc overflow:hidden.
      window.setTimeout(() => {
        document
          .querySelector(`[data-crm-stage-column="${toStage}"], [data-crm-terminal-stage="${toStage}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    } catch (err) {
      window.alert(err instanceof Error ? humanizeCrmError(err.message) : 'Không chuyển được giai đoạn. Vui lòng kiểm tra lại thông tin.');
    }
  }

  async function updateContractStatus(deal: Deal, status: ContractStatus) {
    try {
      const updated = await updateDeal(deal.id, { contract: { status } });
      setSelectedDeal(updated);
    } catch (err) {
      window.alert(err instanceof Error ? humanizeCrmError(err.message) : 'Không lưu được trạng thái hợp đồng.');
    }
  }

  return (
    <div className="crm-shell">
      <section className="crm-page-card">
        <div className="crm-header">
          <div>
            <p>Quản lý pipeline bán hàng theo 7 giai đoạn chính + 3 trạng thái cuối (Tạm dừng / Hoàn thành / Từ chối).</p>
            {error ? <p className="crm-error">{error}</p> : null}
          </div>
          <div className="crm-header-actions">
            <div className="crm-segment">
              <button type="button" className={`crm-segment-button ${viewMode === 'kanban' ? 'crm-segment-button--active' : ''}`} onClick={() => setViewMode('kanban')}>
                <LayoutGrid className="crm-button-icon" /> Kanban
              </button>
              <button type="button" className={`crm-segment-button ${viewMode === 'table' ? 'crm-segment-button--active' : ''}`} onClick={() => setViewMode('table')}>
                <TableIcon className="crm-button-icon" /> Bảng
              </button>
            </div>
            <button
              type="button"
              className="crm-secondary-button"
              disabled={loading || saving}
              onClick={() => setQuoteModal({ open: true, deal: null })}
            >
              <FileText className="crm-button-icon" /> Tạo báo giá
            </button>
            <button type="button" className="crm-primary-button" disabled={loading || saving} onClick={() => setCreateOpen(true)}>
              <Plus className="crm-button-icon" /> Thêm deal
            </button>
          </div>
        </div>

        <div className="crm-stat-grid">
          <StatCard tone="total" label="Tổng deal" value={stats.totalDeals} />
          <StatCard tone="open" label="Đang mở" value={stats.openCount} />
          <StatCard tone="won" label={<><Trophy className="crm-inline-icon" /> Hoàn thành</>} value={stats.wonCount} />
          <StatCard tone="won-value" label="Giá trị hoàn thành" value={formatVND(stats.wonValue) || '0 đ'} />
        </div>

        <section className="crm-filter-card">
          <div className="crm-filter-grid">
            <input
              value={filters.search}
              onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
              type="text"
              className="crm-input"
              placeholder="Tìm tên, SĐT, email..."
              autoComplete="off"
            />
            {(['source', 'city', 'industry', 'team'] as const).map(key => (
              <div key={key} className="crm-filter-select">
                <button
                  type="button"
                  className={`crm-filter-select-button ${openFilter === key ? 'is-open' : ''}`}
                  onClick={() => setOpenFilter(openFilter === key ? '' : key)}
                >
                  <span>{filterLabel(key)}</span>
                </button>
                {openFilter === key ? (
                  <div className="crm-filter-select-menu">
                    {filterDropdownOptions[key].map(option => (
                      <button
                        key={`${key}-${option.value}`}
                        type="button"
                        className={`crm-filter-select-option ${filters[key] === option.value ? 'is-selected' : ''}`}
                        onClick={() => selectFilter(key, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {hasFilters ? (
              <button
                type="button"
                className="crm-secondary-button crm-filter-reset"
                onClick={() => {
                  setFilters({ search: '', source: '', city: '', industry: '', team: '' });
                  setActiveStageFilters([]);
                }}
              >
                <RotateCcw className="crm-button-icon" /> Xóa lọc
              </button>
            ) : null}
          </div>

          <div className="crm-stage-filter">
            {DEAL_STAGES.map(stage => (
              <button
                key={stage}
                type="button"
                className={`crm-stage-pill ${activeStageFilters.includes(stage) ? DEAL_STAGE_META[stage].badgeClass : 'crm-stage-pill--idle'}`}
                onClick={() => toggleStageFilter(stage)}
              >
                {DEAL_STAGE_META[stage].label}
                <b>{stats.counts[stage] || 0}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="crm-content-section">
          {loading && !deals.length ? (
            <div className="crm-loading">
              <Loader2 className="crm-spin-icon" />
              <span>Đang tải...</span>
            </div>
          ) : !filteredDeals.length ? (
            <div className="crm-empty">
              <div>
                <h3>Chưa có khách hàng CRM</h3>
                <p>Tạo deal mới để bắt đầu quản lý pipeline.</p>
                <button type="button" className="crm-primary-button crm-empty-action" onClick={() => setCreateOpen(true)}>
                  <Plus className="crm-button-icon" /> Thêm deal
                </button>
              </div>
            </div>
          ) : viewMode === 'kanban' ? (
            <CrmKanbanBoard
              deals={filteredDeals}
              loading={loading}
              onCardClick={openDetail}
              onContractClick={setContractDeal}
              onCreateQuote={deal => setQuoteModal({ open: true, deal })}
              onRequestMove={(deal, toStage) => setStageData({ deal, toStage })}
            />
          ) : (
            <CrmTableView deals={filteredDeals} onCardClick={openDetail} onContractClick={setContractDeal} onEdit={setEditingDeal} onDelete={handleDelete} />
          )}
        </section>
      </section>

      {toast ? <div className="crm-toast">{toast}</div> : null}

      <DetailDrawer
        deal={selectedDeal}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRequestTransition={(deal, toStage) => setStageData({ deal, toStage })}
        onViewReview={deal => setReviewData({ deal, toStage: deal.stage })}
        onEdit={setEditingDeal}
        onDelete={handleDelete}
        onUpdateContractStatus={updateContractStatus}
        onCreateQuote={deal => setQuoteModal({ open: true, deal })}
      />
      <StageModal
        open={Boolean(stageData)}
        deal={stageData?.deal || null}
        toStage={stageData?.toStage || 'new_lead'}
        loading={saving}
        onClose={() => setStageData(null)}
        onSubmit={handleMove}
      />
      <StageModal
        open={Boolean(reviewData)}
        deal={reviewData?.deal || null}
        toStage={reviewData?.toStage || 'won'}
        readOnly
        onClose={() => setReviewData(null)}
        onSubmit={() => undefined}
      />
      <CreateQuoteModal
        open={quoteModal.open}
        deals={deals}
        agents={agents}
        initialDeal={quoteModal.deal}
        onClose={() => setQuoteModal({ open: false, deal: null })}
        onCreated={async quote => {
          // Quote tạo xong đã gắn deal_id (nếu có) ở backend rồi, nhưng danh sách
          // deal trên board vẫn là bản cũ trong state — phải load lại thì card mới
          // thấy quote vừa tạo (deal.quote), không thì cứ tưởng chưa tạo được gì.
          await loadDeals();
          setToast(`Đã tạo báo giá ${quote.quoteNumber}.`);
        }}
      />
      <DealFormModal
        open={createOpen || Boolean(editingDeal)}
        deal={editingDeal}
        loading={saving}
        agents={agents}
        sourceOptions={dealFormSourceOptions}
        servicePackageOptions={dealFormServicePackageOptions}
        packageOptions={dealFormPackageOptions}
        industryOptions={dealFormIndustryOptions}
        onClose={() => {
          setCreateOpen(false);
          setEditingDeal(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
      <ContractDetailModal deal={contractDeal} open={Boolean(contractDeal)} onClose={() => setContractDeal(null)} />
    </div>
  );
}

function StatCard({ tone, label, value }: { tone: string; label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className={`crm-stat-card crm-stat-card--${tone}`}>
      <p className="crm-stat-label">{label}</p>
      <p className="crm-stat-value">{value}</p>
    </div>
  );
}

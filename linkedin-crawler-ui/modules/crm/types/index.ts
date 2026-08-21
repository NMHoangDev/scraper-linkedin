export type BillingType = 'one_time' | 'monthly' | 'yearly';

export type DealStage =
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'requirement'
  | 'proposal_sent'
  | 'negotiation'
  | 'contract_sent'
  | 'on_hold'
  | 'won'
  | 'lost';

export type ContractStatus =
  | 'moi_tiep_nhan'
  | 'dang_xu_ly'
  | 'da_bao_gia'
  | 'dang_dam_phan'
  | 'da_chot'
  | 'tam_dung'
  | 'khong_hoat_dong'
  | '';

export type PaymentStatus =
  | 'chua_thanh_toan'
  | 'thanh_toan_mot_phan'
  | 'da_thanh_toan'
  | 'qua_han'
  | '';

export interface QuoteReference {
  id?: string;
  number?: string;
  url?: string;
  totalAmount?: number;
  /** 'draft' = Chưa duyệt, 'approved' = Đã duyệt, 'confirmed' = báo giá cũ (tương thích ngược). */
  status?: 'draft' | 'confirmed' | 'approved' | 'cancelled';
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  avatarUrl?: string;
}

export interface StageHistory {
  id: string;
  createdAt: string;
  action: 'created' | 'stage_change' | 'updated';
  fromStage?: DealStage | '';
  toStage?: DealStage;
  note?: string;
  actor?: string;
}

export interface Assignment {
  ownerUserId?: string;
  createdById?: string;
  assignedUserId?: string;
  sdrId?: string;
  sdrName?: string;
  sdrNameHint?: string;
  leadedById?: string;
  leadName?: string;
  leadedByNameHint?: string;
  ownerName?: string;
}

export interface CrmUserOption {
  id: string;
  name: string;
  role?: string;
}

export interface ContractInfo {
  code?: string;
  status?: ContractStatus;
  paymentStatus?: PaymentStatus;
  paymentDueDate?: string;
  signedAt?: string;
  warrantyExpiresAt?: string;
  customerSince?: string;
  lastCareAt?: string;
  title?: string;
  url?: string;
  note?: string;
}

export interface OutcomeInfo {
  reasonText?: string;
  note?: string;
  reviewedAt?: string;
  reviewType?: 'won' | 'lost' | '';
  result?: string;
  confidence?: string;
  reasons?: string[];
  rootCause?: string;
  evidence?: string;
  competitor?: string;
  influencer?: string;
  trigger?: string;
  objection?: string;
  fitScore?: string;
  salesScore?: string;
  priceScore?: string;
  trustScore?: string;
  speedScore?: string;
  repeat?: string;
  improve?: string;
  reuseSegment?: string;
  reuseLevel?: string;
  knowledgeTags?: string;
  kbOwner?: string;
  kbReviewer?: string;
  kbStatus?: string;
  kbScope?: string;
}

export interface Deal {
  id: string;
  contactId: string;
  dealId: string;
  customerName: string;
  position?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  zalo?: string;
  facebook?: string;
  telegram?: string;
  website?: string;
  taxCode?: string;
  address?: string;
  city?: string;
  industry?: string;
  sourcePlatform: string;
  servicePackage?: string;
  package?: string;
  stage: DealStage;
  prevStage?: DealStage | '';
  stageEnteredAt: string;
  daysInStage: number;
  stageHistory: StageHistory[];
  decisionMaker?: string;
  estimatedBudget?: number;
  lifetimeValue?: number;
  /** Loại thanh toán: một lần / theo tháng / theo năm (migration 052). */
  billingType?: BillingType;
  followUpDate?: string;
  contract: ContractInfo;
  outcome: OutcomeInfo;
  quote?: QuoteReference;
  assignment: Assignment;
  note?: string;
  pauseReason?: string;
  closedAt?: string;
  closedReason?: string;
  crmStatus?: 'open' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;
  /** Team gán cho deal này (chọn tay trong form deal, migration 050). */
  teamId?: string;
  teamName?: string;
  teamType?: string;
}

export interface DealFilters {
  search?: string;
  source?: string;
  city?: string;
  industry?: string;
  stages?: DealStage[];
}

export interface AnalyticsFilters {
  period?: 'all' | 'month' | 'quarter';
  industry?: string;
  city?: string;
  source?: string;
  owner?: string;
}

export type CreateDealInput = Omit<
  Deal,
  | 'id'
  | 'contactId'
  | 'dealId'
  | 'stageEnteredAt'
  | 'daysInStage'
  | 'stageHistory'
  | 'createdAt'
  | 'updatedAt'
  | 'contract'
  | 'outcome'
  | 'assignment'
> & {
  contract?: ContractInfo;
  outcome?: OutcomeInfo;
  assignment?: Assignment;
};

export type UpdateDealInput = Partial<CreateDealInput> & {
  contract?: Partial<ContractInfo>;
  outcome?: Partial<OutcomeInfo>;
  assignment?: Partial<Assignment>;
};

export interface StageTransitionInput {
  note?: string;
  pauseReason?: string;
  attachmentUrl?: string;
  decisionMaker?: string;
  estimatedBudget?: number;
  followUpDate?: string;
  outcome?: Partial<OutcomeInfo>;
}

export interface RevenueRow {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface CrmAnalytics {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  winRate: number;
  wonValue: number;
  pipelineValue: number;
  industryRows: RevenueRow[];
  regionRows: RevenueRow[];
  categoryRows: RevenueRow[];
  marketingTips: string[];
  executiveNotes: string[];
  topIndustry: string;
  topRegion: string;
  topCategory: string;
}

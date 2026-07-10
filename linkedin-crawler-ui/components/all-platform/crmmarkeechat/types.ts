// crmmarkeechat/types.ts — port UI-only từ Vue CRM (Chatwoot). Namespace riêng,
// không dùng chung type với services/customer-lead.service.ts.

export type DealStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "requirement"
  | "proposal_sent"
  | "negotiation"
  | "contract_sent"
  | "won"
  | "lost"
  | "on_hold";

export interface StageHistoryEntry {
  id: string;
  created_at: string;
  actor?: string;
  from_stage?: DealStage | "";
  to_stage?: DealStage | "";
  action?: string;
  note?: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface CrmDeal {
  id: string;
  customer_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_code?: string;
  address?: string;
  city?: string;
  industry?: string;
  source_platform: string;
  service_package?: string;
  deal_stage: DealStage;
  decision_maker?: string;
  estimated_budget?: number;
  lifetime_value?: number;
  follow_up_date?: string;
  last_attachment_name?: string;
  last_attachment_url?: string;
  contract_status?: string;
  warranty_expires_at?: string;
  closed_at?: string;
  note?: string;
  leaded_by?: string;
  sdr_id?: string;
  lead_name?: string;
  sdr_name?: string;
  is_assigned?: boolean;
  priority?: string;
  days_in_stage?: number;
  reject_reason_type?: string;
  reject_reason_text?: string;
  reject_reason?: string;
  next_action?: string;
  conv_id?: string | number;
  created_at: string;
  stage_history?: StageHistoryEntry[];
}

export interface StageTransitionPayload {
  to_stage: DealStage;
  note: string;
  attachment_url: string;
  attachment_name: string;
  reject_reason_type: string;
  reject_reason_text: string;
  reject_reason: string;
  decision_maker: string;
  estimated_budget?: number;
  follow_up_date: string;
}

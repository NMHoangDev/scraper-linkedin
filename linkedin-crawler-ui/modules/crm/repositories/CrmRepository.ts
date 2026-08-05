import type {
  AnalyticsFilters,
  CreateDealInput,
  CrmAnalytics,
  CrmUserOption,
  Deal,
  DealFilters,
  DealStage,
  StageTransitionInput,
  UpdateDealInput,
} from '../types';

export interface CrmRepository {
  getDeals(filters?: DealFilters): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal>;
  createDeal(input: CreateDealInput): Promise<Deal>;
  updateDeal(id: string, input: UpdateDealInput): Promise<Deal>;
  deleteDeal(id: string): Promise<void>;
  moveDeal(
    id: string,
    stage: DealStage,
    payload?: StageTransitionInput
  ): Promise<Deal>;
  getAnalytics(filters?: AnalyticsFilters): Promise<CrmAnalytics>;
  getAgents(): Promise<CrmUserOption[]>;
}

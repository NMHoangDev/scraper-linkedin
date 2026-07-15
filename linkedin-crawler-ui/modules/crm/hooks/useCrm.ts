'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedingCrmRepository } from '../repositories/SeedingCrmRepository';
import type { CrmRepository } from '../repositories/CrmRepository';
import type {
  AnalyticsFilters,
  CreateDealInput,
  CrmUserOption,
  Deal,
  DealFilters,
  DealStage,
  StageTransitionInput,
  UpdateDealInput,
} from '../types';

export function useCrm(repository: CrmRepository = seedingCrmRepository) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [agents, setAgents] = useState<CrmUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDeals = useCallback(
    async (filters?: DealFilters) => {
      setLoading(true);
      setError('');
      try {
        const result = await repository.getDeals(filters);
        setDeals(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được CRM.');
      } finally {
        setLoading(false);
      }
    },
    [repository]
  );

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const loadAgents = useCallback(async () => {
    try {
      setAgents(await repository.getAgents());
    } catch {
      setAgents([]);
    }
  }, [repository]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const getDeal = useCallback(
    async (id: string) => repository.getDeal(id),
    [repository]
  );

  const createDeal = useCallback(
    async (input: CreateDealInput) => {
      setSaving(true);
      try {
        const deal = await repository.createDeal(input);
        await loadDeals();
        return deal;
      } finally {
        setSaving(false);
      }
    },
    [loadDeals, repository]
  );

  const updateDeal = useCallback(
    async (id: string, input: UpdateDealInput) => {
      setSaving(true);
      try {
        const deal = await repository.updateDeal(id, input);
        await loadDeals();
        return deal;
      } finally {
        setSaving(false);
      }
    },
    [loadDeals, repository]
  );

  const deleteDeal = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await repository.deleteDeal(id);
        await loadDeals();
      } finally {
        setSaving(false);
      }
    },
    [loadDeals, repository]
  );

  const moveDeal = useCallback(
    async (id: string, stage: DealStage, payload?: StageTransitionInput) => {
      setSaving(true);
      try {
        const deal = await repository.moveDeal(id, stage, payload);
        await loadDeals();
        return deal;
      } finally {
        setSaving(false);
      }
    },
    [loadDeals, repository]
  );

  const stats = useMemo(() => {
    const counts = deals.reduce<Record<string, number>>((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {});
    const wonValue = deals
      .filter(deal => deal.stage === 'won')
      .reduce(
        (sum, deal) => sum + Number(deal.quote?.totalAmount || deal.estimatedBudget || 0),
        0
      );
    return {
      counts,
      totalDeals: deals.length,
      wonCount: counts.won || 0,
      lostCount: counts.lost || 0,
      openCount: Math.max(deals.length - (counts.won || 0) - (counts.lost || 0), 0),
      wonValue,
    };
  }, [deals]);

  return {
    deals,
    agents,
    loading,
    saving,
    error,
    stats,
    loadDeals,
    loadAgents,
    getDeal,
    createDeal,
    updateDeal,
    deleteDeal,
    moveDeal,
    getAnalytics: (filters?: AnalyticsFilters) => repository.getAnalytics(filters),
  };
}

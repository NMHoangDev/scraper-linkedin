'use client';

import { useCallback, useEffect, useState } from 'react';
import { serviceCatalogRepository } from './repositories/ServiceCatalogRepository';
import type { ServiceCatalogItem, ServiceCatalogItemInput, BundleComponentInput } from './types';

export function useServiceCatalog() {
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await serviceCatalogRepository.list();
      setItems(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh mục dịch vụ.');
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createItem = async (input: ServiceCatalogItemInput) => {
    const result = await serviceCatalogRepository.create(input);
    await refresh();
    return result;
  };

  const updateItem = async (id: string, input: Partial<ServiceCatalogItemInput>) => {
    const result = await serviceCatalogRepository.update(id, input);
    await refresh();
    return result;
  };

  const deleteItem = async (id: string) => {
    const result = await serviceCatalogRepository.delete(id);
    await refresh();
    return result;
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    const result = await serviceCatalogRepository.reorder(id, direction);
    await refresh();
    return result;
  };

  const setBundleComponents = async (bundleId: string, items_: BundleComponentInput[]) => {
    const result = await serviceCatalogRepository.setBundleComponents(bundleId, items_);
    await refresh();
    return result;
  };

  return { items, isLoaded, error, createItem, updateItem, deleteItem, moveItem, setBundleComponents, refresh };
}

import { useState, useEffect, useCallback } from 'react';
import CacheService from '../services/CacheService';

export const useOptimizedFetch = (fetchFunction, cacheKey, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Tentar cache primeiro (se não for refresh forçado)
      if (!forceRefresh && cacheKey) {
        const cachedData = await CacheService.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }

      // Buscar dados frescos
      const freshData = await fetchFunction();
      
      // Salvar no cache
      if (cacheKey && freshData) {
        await CacheService.set(cacheKey, freshData);
      }

      setData(freshData);
      return freshData;
    } catch (err) {
      setError(err);
      console.error('Erro no fetch otimizado:', err);
      
      // Em caso de erro, tentar retornar dados do cache
      if (cacheKey) {
        const cachedData = await CacheService.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          return cachedData;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, cacheKey]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    refetch: fetchData
  };
};
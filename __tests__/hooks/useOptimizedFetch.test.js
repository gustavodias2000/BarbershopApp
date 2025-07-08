import { renderHook, act } from '@testing-library/react-hooks';
import { useOptimizedFetch } from '../../src/hooks/useOptimizedFetch';
import CacheService from '../../src/services/CacheService';

// Mock CacheService
jest.mock('../../src/services/CacheService', () => ({
  get: jest.fn(),
  set: jest.fn()
}));

describe('useOptimizedFetch', () => {
  const mockFetchFunction = jest.fn();
  const cacheKey = 'test-cache-key';

  beforeEach(() => {
    jest.clearAllMocks();
    CacheService.get.mockResolvedValue(null);
    CacheService.set.mockResolvedValue(true);
  });

  it('should fetch data successfully', async () => {
    const testData = { id: 1, name: 'Test' };
    mockFetchFunction.mockResolvedValue(testData);

    const { result, waitForNextUpdate } = renderHook(() =>
      useOptimizedFetch(mockFetchFunction, cacheKey)
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBe(null);
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should use cached data when available', async () => {
    const cachedData = { id: 1, name: 'Cached' };
    CacheService.get.mockResolvedValue(cachedData);

    const { result, waitForNextUpdate } = renderHook(() =>
      useOptimizedFetch(mockFetchFunction, cacheKey)
    );

    await waitForNextUpdate();

    expect(result.current.data).toEqual(cachedData);
    expect(mockFetchFunction).not.toHaveBeenCalled();
    expect(CacheService.get).toHaveBeenCalledWith(cacheKey);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Fetch failed');
    mockFetchFunction.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      useOptimizedFetch(mockFetchFunction, cacheKey)
    );

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBe(null);
  });

  it('should force refresh when requested', async () => {
    const cachedData = { id: 1, name: 'Cached' };
    const freshData = { id: 1, name: 'Fresh' };
    
    CacheService.get.mockResolvedValue(cachedData);
    mockFetchFunction.mockResolvedValue(freshData);

    const { result, waitForNextUpdate } = renderHook(() =>
      useOptimizedFetch(mockFetchFunction, cacheKey)
    );

    await waitForNextUpdate();

    // Should use cached data initially
    expect(result.current.data).toEqual(cachedData);

    // Force refresh
    act(() => {
      result.current.refresh();
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual(freshData);
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should cache fresh data after fetch', async () => {
    const testData = { id: 1, name: 'Test' };
    mockFetchFunction.mockResolvedValue(testData);

    const { waitForNextUpdate } = renderHook(() =>
      useOptimizedFetch(mockFetchFunction, cacheKey)
    );

    await waitForNextUpdate();

    expect(CacheService.set).toHaveBeenCalledWith(cacheKey, testData);
  });
});
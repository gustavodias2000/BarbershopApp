import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheExpiry = new Map();
  }

  // Cache em memória (mais rápido, mas temporário)
  setMemoryCache(key, data, ttlMinutes = 5) {
    this.memoryCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + (ttlMinutes * 60 * 1000));
  }

  getMemoryCache(key) {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.memoryCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.memoryCache.get(key) || null;
  }

  // Cache persistente (sobrevive ao fechamento do app)
  async setPersistentCache(key, data, ttlHours = 24) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttlHours * 60 * 60 * 1000
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Erro ao salvar cache persistente:', error);
    }
  }

  async getPersistentCache(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;

      if (isExpired) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Erro ao recuperar cache persistente:', error);
      return null;
    }
  }

  // Cache inteligente (tenta memória primeiro, depois persistente)
  async get(key) {
    // Tentar cache em memória primeiro
    let data = this.getMemoryCache(key);
    if (data) return data;

    // Se não encontrou, tentar cache persistente
    data = await this.getPersistentCache(key);
    if (data) {
      // Repovoar cache em memória
      this.setMemoryCache(key, data);
    }

    return data;
  }

  async set(key, data, options = {}) {
    const { memoryTTL = 5, persistentTTL = 24, persistentOnly = false } = options;

    if (!persistentOnly) {
      this.setMemoryCache(key, data, memoryTTL);
    }
    
    await this.setPersistentCache(key, data, persistentTTL);
  }

  // Limpar cache expirado
  async clearExpiredCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheItem = JSON.parse(cached);
          const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
          
          if (isExpired) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
    }
  }

  // Limpar todo o cache
  async clearAllCache() {
    try {
      this.memoryCache.clear();
      this.cacheExpiry.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  // Obter estatísticas do cache
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let totalSize = 0;
      let validItems = 0;
      let expiredItems = 0;

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const cacheItem = JSON.parse(cached);
          const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
          
          if (isExpired) {
            expiredItems++;
          } else {
            validItems++;
          }
        }
      }

      return {
        memoryItems: this.memoryCache.size,
        persistentItems: validItems,
        expiredItems,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSize / 1024)
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error);
      return null;
    }
  }
}

export default new CacheService();
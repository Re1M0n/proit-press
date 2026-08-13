import CacheService from "../services/CacheService";
import { logger } from "../utils/logger";

interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

/**
 * Base genérica para helpers de caché de entidades (ContactCache, MessageCache...).
 * Encapsula el patrón get-con-ttl/forceRefresh, la invalidación por clave y por
 * prefijo, y las estadísticas de uso, para no repetirlo en cada entidad.
 */
abstract class CacheHelper {
  protected abstract readonly DEFAULT_TTL: number;

  protected async getOrSet<T>(
    key: string,
    fetcher: () => PromiseLike<T | null>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = CacheService.get<T>(key);
      if (cached) {
        logger.debug(`${key} retrieved from cache`);
        return cached;
      }
    }

    const value = await fetcher();

    if (value) {
      CacheService.set(key, value, ttl);
      logger.debug(`${key} cached`);
    }

    return value;
  }

  protected delKey(key: string): void {
    CacheService.del(key);
    logger.debug(`${key} cache invalidated`);
  }

  protected delKeysMatching(predicate: (key: string) => boolean): void {
    const keys = CacheService.keys().filter(predicate);
    CacheService.del(keys);
    logger.info(`Invalidated ${keys.length} cache entries`);
  }

  protected getStats(predicate: (key: string) => boolean) {
    const keys = CacheService.keys().filter(predicate);
    return {
      totalCached: keys.length,
      cacheStats: CacheService.getStats()
    };
  }
}

export default CacheHelper;

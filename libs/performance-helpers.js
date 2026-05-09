/**
 * Performance optimization utilities
 * - Distance caching
 * - Lazy evaluation
 * - Memoization helpers
 */

/**
 * Create a memoized distance cache
 * Reduces repeated haversine calculations
 */
export class DistanceCache {
  constructor(baseLat, baseLon) {
    this.baseLat = baseLat;
    this.baseLon = baseLon;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get distance, using cache if available
   * @param {number} lat - Target latitude
   * @param {number} lon - Target longitude
   * @param {Function} haversineKm - Distance calculation function
   * @returns {number} Distance in km
   */
  getDistance(lat, lon, haversineKm) {
    const key = `${lat.toFixed(6)}_${lon.toFixed(6)}`;
    
    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key);
    }
    
    this.misses++;
    const distance = haversineKm(this.baseLat, this.baseLon, lat, lon);
    this.cache.set(key, distance);
    return distance;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : 'N/A';
    return {
      hits: this.hits,
      misses: this.misses,
      total,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Batch pre-compute distances for a list of cells
 * @param {number} baseLat - Reference latitude
 * @param {number} baseLon - Reference longitude
 * @param {Array} cells - Cell list with lat/lon
 * @param {Function} haversineKm - Distance function
 * @returns {Array} Cells with added 'dist' property
 */
export function batchComputeDistances(baseLat, baseLon, cells, haversineKm) {
  return cells.map(cell => ({
    ...cell,
    dist: haversineKm(baseLat, baseLon, cell.lat, cell.lon),
  }));
}

/**
 * Create a simple memoization wrapper
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Lazy filter: only filters when result is accessed
 * Useful for large lists where filtering might not be needed
 */
export class LazyFilter {
  constructor(items, predicate) {
    this.items = items;
    this.predicate = predicate;
    this.result = null;
  }

  get() {
    if (this.result === null) {
      this.result = this.items.filter(this.predicate);
    }
    return this.result;
  }
}

// In-memory high performance TTL cache for cloud DB query caching
class MemoryCache {
  private store = new Map<string, { data: any; expiry: number }>()

  get(key: string): any | null {
    const item = this.store.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.store.delete(key)
      return null
    }
    return item.data
  }

  set(key: string, data: any, ttlSeconds: number = 60): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    })
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear()
      return
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  clear(): void {
    this.store.clear()
  }

  makeKey(prefix: string, qs: Record<string, any> = {}): string {
    const sorted = Object.keys(qs)
      .sort()
      .map((k) => `${k}=${qs[k]}`)
      .join('&')
    return `${prefix}:${sorted}`
  }
}

export const apiCache = new MemoryCache()
export default apiCache

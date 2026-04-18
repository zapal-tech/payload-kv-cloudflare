import type { KVAdapter, KVAdapterResult, KVStoreValue } from 'payload'

export interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>
}

class CloudflareKVAdapter<T extends KVNamespace> implements KVAdapter {
  kv: T
  keyPrefix: string

  constructor(keyPrefix: string, kv: T) {
    this.kv = kv
    this.keyPrefix = keyPrefix
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }

  async clear(): Promise<void> {
    const result = await this.kv.list({ prefix: this.keyPrefix })

    for (const key of result.keys ?? []) {
      await this.kv.delete(key.name)
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(`${this.keyPrefix}${key}`)
  }

  async get<T extends KVStoreValue>(key: string): Promise<T | null> {
    const value = await this.kv.get(this.prefixKey(key))

    if (value === null) return null

    return JSON.parse(value) as T
  }

  async has(key: string): Promise<boolean> {
    const value = await this.kv.get(`${this.keyPrefix}${key}`)
    return value !== null
  }

  async keys(): Promise<string[]> {
    const result = await this.kv.list({ prefix: this.keyPrefix })
    return result.keys?.map((key) => key.name) ?? []
  }

  async set(key: string, data: KVStoreValue): Promise<void> {
    const value = typeof data === 'string' ? data : JSON.stringify(data)
    await this.kv.put(`${this.keyPrefix}${key}`, value)
  }
}

export type CloudflareKVAdapterOptions<T extends KVNamespace = KVNamespace> = {
  /**
   * Optional prefix for keys to isolate the KV store
   *
   * @default 'payload-kv:'
   */
  keyPrefix?: string

  /**
   * The Cloudflare KV namespace to use. E.g. from `getCloudflareContext().env.KV`
   */
  kv: T
}

export const cloudflareKVAdapter = <T extends KVNamespace = KVNamespace>(
  options: CloudflareKVAdapterOptions<T>,
): KVAdapterResult => {
  const keyPrefix = options.keyPrefix ?? 'payload-kv:'
  const kv = options.kv

  return {
    init: () => new CloudflareKVAdapter<T>(keyPrefix, kv),
  }
}

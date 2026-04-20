import type { BasePayload, KVAdapter } from 'payload'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { cloudflareKVAdapter, type KVNamespace } from './index'

describe('CloudflareKVAdapter', () => {
  let mockKV: Record<keyof KVNamespace, Mock>
  let adapterInit: (args: { payload: BasePayload }) => KVAdapter
  let adapter: KVAdapter & { keyPrefix?: string }

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    }

    const result = cloudflareKVAdapter({
      kv: mockKV as unknown as KVNamespace,
      keyPrefix: 'test-prefix:',
    })

    adapterInit = result.init
    adapter = adapterInit({ payload: {} as BasePayload })
  })

  it('should initialize correctly with options', () => {
    expect(adapter).toBeDefined()
    expect(adapter.keyPrefix).toBe('test-prefix:')
  })

  it('should get a value correctly', async () => {
    const data = { foo: 'bar' }
    mockKV.get.mockResolvedValueOnce(JSON.stringify(data))

    const result = await adapter.get('my-key')
    expect(mockKV.get).toHaveBeenCalledWith('test-prefix:my-key')
    expect(result).toEqual(data)
  })

  it('should return null when get finds nothing', async () => {
    mockKV.get.mockResolvedValueOnce(null)

    const result = await adapter.get('missing-key')
    expect(mockKV.get).toHaveBeenCalledWith('test-prefix:missing-key')
    expect(result).toBeNull()
  })

  it('should set an object value as JSON string', async () => {
    const data = { some: 'data' }
    await adapter.set('my-key', data)

    expect(mockKV.put).toHaveBeenCalledWith('test-prefix:my-key', JSON.stringify(data))
  })

  it('should set a string value directly', async () => {
    const data = 'plain-string'
    await adapter.set('my-key', data)

    expect(mockKV.put).toHaveBeenCalledWith('test-prefix:my-key', 'plain-string')
  })

  it('should delete a value', async () => {
    await adapter.delete('my-key')
    expect(mockKV.delete).toHaveBeenCalledWith('test-prefix:my-key')
  })

  it('should check if a key exists', async () => {
    mockKV.get.mockResolvedValueOnce('something')

    const exists = await adapter.has('existing-key')
    expect(mockKV.get).toHaveBeenCalledWith('test-prefix:existing-key')
    expect(exists).toBe(true)
  })

  it('should return false if key does not exist', async () => {
    mockKV.get.mockResolvedValueOnce(null)

    const exists = await adapter.has('missing-key')
    expect(mockKV.get).toHaveBeenCalledWith('test-prefix:missing-key')
    expect(exists).toBe(false)
  })

  it('should clear all keys with the same prefix', async () => {
    mockKV.list.mockResolvedValueOnce({
      keys: [{ name: 'test-prefix:key1' }, { name: 'test-prefix:key2' }],
    })

    await adapter.clear()

    expect(mockKV.list).toHaveBeenCalledWith({ prefix: 'test-prefix:' })
    expect(mockKV.delete).toHaveBeenCalledWith('test-prefix:key1')
    expect(mockKV.delete).toHaveBeenCalledWith('test-prefix:key2')
    // Called twice, once for each key
    expect(mockKV.delete).toHaveBeenCalledTimes(2)
  })

  it('should list all keys', async () => {
    mockKV.list.mockResolvedValueOnce({
      keys: [{ name: 'test-prefix:key1' }, { name: 'test-prefix:key2' }],
    })

    const keys = await adapter.keys()

    expect(mockKV.list).toHaveBeenCalledWith({ prefix: 'test-prefix:' })
    expect(keys).toEqual(['test-prefix:key1', 'test-prefix:key2'])
  })
})

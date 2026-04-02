/**
 * API 密钥管理
 */

import type { APIKeyConfig } from '@/types/config';
import { apiClient } from './client';

export const apiKeysApi = {
  async list(): Promise<APIKeyConfig[]> {
    const data = await apiClient.get<Record<string, unknown>>('/api-keys');
    const keys = data['api-keys'] ?? data.apiKeys;
    if (!Array.isArray(keys)) return [];
    return keys
      .map((item) => {
        if (typeof item === 'string') return { key: item };
        const key = item.key ?? item['api-key'] ?? item.apiKey;
        if (!key) return null;
        return {
          key: String(key),
          dailyLimit: item.dailyLimit ?? item['daily-limit'],
          expiresAt: item.expiresAt ?? item['expires-at']
        };
      })
      .filter(Boolean) as APIKeyConfig[];
  },

  replace: (keys: APIKeyConfig[]) => apiClient.put('/api-keys', keys),

  update: (index: number, value: APIKeyConfig) => apiClient.patch('/api-keys', { index, value }),

  delete: (index: number) => apiClient.delete(`/api-keys?index=${index}`)
};

/**
 * API 密钥管理
 */

import type { APIKeyConfig } from '@/types/config';
import { apiClient } from './client';

export type ApiKeyPlan = 'day' | 'week' | 'month';

export interface ManagedApiKeyItem {
  apiKey: string;
  dailyTokenLimit?: number;
  dailyCreditLimit?: number;
  usedTokensToday?: number;
  remainingTokensToday?: number;
  expiresAt?: string;
  timezone?: string;
  date?: string;
}

export interface ManagedApiKeyListResponse {
  count: number;
  items: ManagedApiKeyItem[];
}

export interface CreateApiKeyPayload {
  plan: ApiKeyPlan;
  apiKey?: string;
}

export interface CreateApiKeyResponse extends ManagedApiKeyItem {
  plan: ApiKeyPlan;
}

const normalizeItem = (item: unknown): ManagedApiKeyItem | null => {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const record = item as Record<string, unknown>;
  const apiKey = record['api-key'] ?? record.apiKey ?? record.key ?? record.token;
  if (!apiKey) return null;

  const toNumber = (value: unknown) =>
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : undefined;

  return {
    apiKey: String(apiKey),
    dailyTokenLimit: toNumber(record['daily-token-limit'] ?? record.dailyTokenLimit),
    dailyCreditLimit: toNumber(record['daily-credit-limit'] ?? record.dailyCreditLimit),
    usedTokensToday: toNumber(record['used-tokens-today'] ?? record.usedTokensToday),
    remainingTokensToday: toNumber(record['remaining-tokens-today'] ?? record.remainingTokensToday),
    expiresAt:
      typeof (record['expires-at'] ?? record.expiresAt) === 'string'
        ? String(record['expires-at'] ?? record.expiresAt)
        : undefined,
    timezone:
      typeof record.timezone === 'string'
        ? record.timezone
        : undefined,
    date:
      typeof record.date === 'string'
        ? record.date
        : undefined
  };
};

export const apiKeysApi = {
  async listManaged(token?: string): Promise<ManagedApiKeyListResponse> {
    const data = await apiClient.get<Record<string, unknown>>('/api-keys/list', {
      params: token ? { token } : undefined
    });
    const items = Array.isArray(data['api-keys']) ? data['api-keys'].map(normalizeItem).filter(Boolean) : [];
    return {
      count: typeof data.count === 'number' ? data.count : items.length,
      items: items as ManagedApiKeyItem[]
    };
  },

  async list(): Promise<APIKeyConfig[]> {
    const { items } = await this.listManaged();
    return items.map((item) => ({
      key: item.apiKey,
      dailyLimit: item.dailyTokenLimit,
      dailyTokenLimit: item.dailyTokenLimit,
      dailyCreditLimit: item.dailyCreditLimit,
      usedTokensToday: item.usedTokensToday,
      remainingTokensToday: item.remainingTokensToday,
      expiresAt: item.expiresAt,
      timezone: item.timezone,
      date: item.date
    }));
  },

  async create(payload: CreateApiKeyPayload): Promise<CreateApiKeyResponse> {
    const data = await apiClient.post<Record<string, unknown>>('/api-keys/create', {
      plan: payload.plan,
      ...(payload.apiKey ? { 'api-key': payload.apiKey } : {})
    });
    const item = normalizeItem(data);
    if (!item) {
      throw new Error('Invalid create API key response');
    }
    return {
      ...item,
      plan: String(data.plan ?? payload.plan) as ApiKeyPlan
    };
  },

  async remove(apiKey: string): Promise<{ status?: string; apiKey?: string }> {
    const data = await apiClient.delete<Record<string, unknown>>('/api-keys/delete', {
      params: { 'api-key': apiKey }
    });
    return {
      status: typeof data.status === 'string' ? data.status : undefined,
      apiKey:
        typeof (data['api-key'] ?? data.apiKey) === 'string'
          ? String(data['api-key'] ?? data.apiKey)
          : undefined
    };
  }
};

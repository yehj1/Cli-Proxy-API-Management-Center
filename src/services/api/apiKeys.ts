/**
 * API 密钥管理
 */

import type { APIKeyConfig } from '@/types/config';
import { apiClient } from './client';

export type ApiKeyPlan = 'day' | 'week' | 'month';

export interface ManagedApiKeyItem {
  apiKey: string;
  token?: string;
  dailyTokenLimit?: number;
  dailyCreditLimit?: number;
  usedTokensToday?: number;
  remainingTokensToday?: number;
  limitEnabled?: boolean;
  usedCreditsToday?: number;
  remainingCreditsToday?: number;
  creditPerMillionTokens?: number;
  creditUnitTokens?: number;
  creditMode?: boolean;
  expiresAt?: string;
  expiresAtParsed?: string;
  expired?: boolean;
  timezone?: string;
  date?: string;
  nextResetAt?: string;
  secondsUntilReset?: number;
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
  const toBoolean = (value: unknown) =>
    typeof value === 'boolean'
      ? value
      : typeof value === 'string'
        ? value.toLowerCase() === 'true'
        : undefined;
  const toString = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value : undefined;

  return {
    apiKey: String(apiKey),
    token: toString(record.token) ?? String(apiKey),
    dailyTokenLimit: toNumber(
      record['daily-token-limit'] ?? record.dailyTokenLimit ?? record['daily_token_limit'] ?? record.daily_limit
    ),
    dailyCreditLimit: toNumber(
      record['daily-credit-limit'] ?? record.dailyCreditLimit ?? record['daily_credit_limit'] ?? record.daily_credit_limit
    ),
    usedTokensToday: toNumber(
      record['used-tokens-today'] ?? record.usedTokensToday ?? record['used_tokens_today']
    ),
    limitEnabled: toBoolean(record['limit-enabled'] ?? record.limitEnabled ?? record['limit_enabled']),
    remainingTokensToday: toNumber(
      record['remaining-tokens-today'] ?? record.remainingTokensToday ?? record['remaining_tokens_today'] ?? record.remaining
    ),
    usedCreditsToday: toNumber(
      record['used-credits-today'] ?? record.usedCreditsToday ?? record['used_credits_today']
    ),
    remainingCreditsToday: toNumber(
      record['remaining-credits-today'] ?? record.remainingCreditsToday ?? record['remaining_credits_today']
    ),
    creditPerMillionTokens: toNumber(
      record['credit-per-million-tokens'] ?? record.creditPerMillionTokens ?? record['credit_per_million_tokens']
    ),
    creditUnitTokens: toNumber(
      record['credit-unit-tokens'] ?? record.creditUnitTokens ?? record['credit_unit_tokens']
    ),
    creditMode: toBoolean(record['credit-mode'] ?? record.creditMode ?? record['credit_mode']),
    expiresAt:
      toString(record['expires-at'] ?? record.expiresAt),
    expiresAtParsed:
      toString(record['expires-at-parsed'] ?? record.expiresAtParsed ?? record['expires_at_parsed']),
    expired: toBoolean(record.expired),
    timezone:
      toString(record.timezone ?? record['time-zone'] ?? record.time_zone),
    date:
      toString(record.date ?? record['current-date'] ?? record.currentDate),
    nextResetAt:
      toString(record['next-reset-at'] ?? record.nextResetAt ?? record['next_reset_at']),
    secondsUntilReset: toNumber(
      record['seconds-until-reset'] ?? record.secondsUntilReset ?? record['seconds_until_reset']
    )
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
      limitEnabled: item.limitEnabled,
      remainingTokensToday: item.remainingTokensToday,
      usedCreditsToday: item.usedCreditsToday,
      remainingCreditsToday: item.remainingCreditsToday,
      creditPerMillionTokens: item.creditPerMillionTokens,
      creditUnitTokens: item.creditUnitTokens,
      creditMode: item.creditMode,
      expiresAt: item.expiresAt,
      expiresAtParsed: item.expiresAtParsed,
      expired: item.expired,
      timezone: item.timezone,
      date: item.date,
      nextResetAt: item.nextResetAt,
      secondsUntilReset: item.secondsUntilReset
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

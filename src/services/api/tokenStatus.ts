import axios from 'axios';
import { computeApiUrl } from '@/utils/connection';

export interface TokenStatus {
  apiKey: string;
  usedTokensToday: number;
  dailyTokenLimit: number | null;
  limitEnabled: boolean;
  remainingTokensToday: number | null;
  expiresAt: string | null;
  expiresAtParsed: string | null;
  expired: boolean;
  timezone: string | null;
  date: string | null;
  nextResetAt: string | null;
  secondsUntilReset: number | null;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text.trim() ? text : null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

/**
 * 查询 API 密钥用量与状态
 */
export async function getTokenStatus(key: string, apiBase: string): Promise<TokenStatus> {
  const baseUrl = computeApiUrl(apiBase);
  const response = await axios.get<Record<string, unknown>>(
    `${baseUrl}/api-keys/usage`,
    {
      params: { 'api-key': key },
      timeout: 10000
    }
  );
  const data = response.data ?? {};

  const dailyTokenLimit =
    toNumber(data['daily-token-limit']) ??
    toNumber(data.dailyTokenLimit) ??
    toNumber(data['daily_limit']);
  const usedTokensToday =
    toNumber(data['used-tokens-today']) ??
    toNumber(data.usedTokensToday) ??
    toNumber(data['used_tokens_today']) ??
    0;
  const remainingTokensTodayRaw =
    toNumber(data['remaining-tokens-today']) ??
    toNumber(data.remainingTokensToday) ??
    toNumber(data['remaining_tokens_today']);
  const limitEnabled =
    toBoolean(data['limit-enabled'] ?? data.limitEnabled) ||
    (dailyTokenLimit !== null && dailyTokenLimit > 0);
  const remainingTokensToday =
    remainingTokensTodayRaw !== null
      ? remainingTokensTodayRaw
      : limitEnabled && dailyTokenLimit !== null
        ? Math.max(dailyTokenLimit - usedTokensToday, 0)
        : null;

  return {
    apiKey:
      toString(data['api-key']) ??
      toString(data.apiKey) ??
      toString(data.key) ??
      '',
    usedTokensToday,
    dailyTokenLimit,
    limitEnabled,
    remainingTokensToday,
    expiresAt: toString(data['expires-at']) ?? toString(data.expiresAt),
    expiresAtParsed: toString(data['expires-at-parsed']) ?? toString(data.expiresAtParsed),
    expired: toBoolean(data.expired),
    timezone: toString(data.timezone),
    date: toString(data.date),
    nextResetAt: toString(data['next-reset-at']) ?? toString(data.nextResetAt),
    secondsUntilReset: toNumber(data['seconds-until-reset']) ?? toNumber(data.secondsUntilReset),
  };
}

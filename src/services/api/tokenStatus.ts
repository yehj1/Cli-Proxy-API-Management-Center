import axios from 'axios';
import { computeApiUrl } from '@/utils/connection';

export interface TokenStatus {
  used: number;
  limit: number;
  expires_at: string;
  reset_at: string;
}

/**
 * 公开查询 API 密钥状态
 */
export async function getTokenStatus(key: string, apiBase: string): Promise<TokenStatus> {
  const baseUrl = computeApiUrl(apiBase);
  const response = await axios.get<TokenStatus>(`${baseUrl}/v1/token/status`, {
    params: { key },
    timeout: 10000
  });
  return response.data;
}

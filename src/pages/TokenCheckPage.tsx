import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLanguageStore, useNotificationStore } from '@/stores';
import { detectApiBaseFromLocation } from '@/utils/connection';
import { getTokenStatus, type TokenStatus } from '@/services/api/tokenStatus';
import { INLINE_LOGO_JPEG } from '@/assets/logoInline';
import styles from './TokenCheckPage.module.scss';

export function TokenCheckPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotificationStore();
  const language = useLanguageStore((state) => state.language);

  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenStatus | null>(null);
  const [error, setError] = useState('');

  const detectedBase = useMemo(() => detectApiBaseFromLocation(), []);

  const handleCheck = useCallback(async () => {
    if (!apiKey.trim()) {
      setError(t('token_check.error_required'));
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await getTokenStatus(apiKey.trim(), detectedBase);
      setResult(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(t('token_check.error_not_found'));
      } else if (err.response?.status === 400) {
        setError(t('token_check.error_required'));
      } else {
        setError(t('token_check.error_generic'));
      }
      showNotification(t('token_check.error_generic'), 'error');
    } finally {
      setLoading(false);
    }
  }, [apiKey, detectedBase, showNotification, t]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !loading) {
        event.preventDefault();
        handleCheck();
      }
    },
    [loading, handleCheck]
  );

  const usagePercent = useMemo(() => {
    if (!result?.limitEnabled || !result.dailyTokenLimit || result.dailyTokenLimit <= 0) return 0;
    return Math.min(
      Math.round((result.usedTokensToday / result.dailyTokenLimit) * 100),
      100
    );
  }, [result]);

  const isExpired = useMemo(() => result?.expired ?? false, [result]);

  const isQuotaExceeded = useMemo(() => {
    if (!result?.limitEnabled || !result.dailyTokenLimit || result.dailyTokenLimit <= 0) return false;
    return result.usedTokensToday >= result.dailyTokenLimit;
  }, [result]);

  const formatDateTime = useCallback(
    (value: string | null, timeZone?: string | null) => {
      if (!value) return '-';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      try {
        return new Intl.DateTimeFormat(language, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: timeZone || 'Asia/Shanghai',
        }).format(parsed);
      } catch {
        return parsed.toLocaleString(language);
      }
    },
    [language]
  );

  return (
    <div className={styles.container}>
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <span className={styles.brandWord}>Token</span>
          <span className={styles.brandWord}>Inquiry</span>
          <span className={styles.brandWord}>System</span>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formContent}>
          <img src={INLINE_LOGO_JPEG} alt="CPAMC" className={styles.logo} />

          <div className={styles.checkCard}>
            <div className={styles.header}>
              <div className={styles.title}>{t('token_check.title')}</div>
              <div className={styles.subtitle}>{t('token_check.subtitle')}</div>
            </div>

            <div className={styles.inputGroup}>
              <Input
                autoFocus
                label={t('token_check.input_label')}
                placeholder={t('token_check.input_placeholder')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <Button fullWidth onClick={handleCheck} loading={loading}>
              {loading ? t('token_check.searching') : t('token_check.submit_button')}
            </Button>

            {error && <div className={styles.errorBox}>{error}</div>}

            {result && (
              <div className={styles.resultBox}>
                <div className={styles.resultTitle}>{t('token_check.result_title')}</div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.status')}</span>
                    <span className={`${styles.statusBadge} ${
                      isExpired ? styles.expired : 
                      isQuotaExceeded ? styles.quotaExceeded : 
                      styles.active
                    }`}>
                      {isExpired ? t('token_check.status_expired') : 
                       isQuotaExceeded ? t('token_check.status_quota_exceeded') : 
                       t('token_check.status_active')}
                    </span>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.used_tokens')}</span>
                    <span className={styles.metaValue}>
                      {result.usedTokensToday.toLocaleString()} /{' '}
                      {result.limitEnabled && result.dailyTokenLimit
                        ? result.dailyTokenLimit.toLocaleString()
                        : t('token_check.unlimited')}
                    </span>
                  </div>
                  {result.limitEnabled && result.dailyTokenLimit && result.dailyTokenLimit > 0 && (
                    <div className={styles.usageBar}>
                      <div 
                        className={`${styles.usageProgress} ${usagePercent > 90 ? styles.danger : usagePercent > 70 ? styles.warning : ''}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.remaining_tokens')}</span>
                    <span className={styles.metaValue}>
                      {result.limitEnabled && result.remainingTokensToday !== null
                        ? result.remainingTokensToday.toLocaleString()
                        : t('token_check.unlimited')}
                    </span>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.expiration_date')}</span>
                    <span className={styles.metaValue}>
                      {result.expiresAtParsed || result.expiresAt
                        ? formatDateTime(result.expiresAtParsed ?? result.expiresAt, result.timezone)
                        : t('token_check.never_expires')}
                    </span>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.reset_time')}</span>
                    <span className={styles.metaValue}>
                      {formatDateTime(result.nextResetAt, result.timezone)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <div className={styles.backLink} onClick={() => navigate('/login')}>
                {t('token_check.back_to_login')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

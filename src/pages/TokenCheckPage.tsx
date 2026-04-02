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
    if (!result || result.limit <= 0) return 0;
    return Math.min(Math.round((result.used / result.limit) * 100), 100);
  }, [result]);

  const isExpired = useMemo(() => {
    if (!result?.expires_at) return false;
    return new Date(result.expires_at).getTime() < Date.now();
  }, [result]);

  const isQuotaExceeded = useMemo(() => {
    if (!result || result.limit <= 0) return false;
    return result.used >= result.limit;
  }, [result]);

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
                      {result.used.toLocaleString()} / {result.limit > 0 ? result.limit.toLocaleString() : t('token_check.unlimited')}
                    </span>
                  </div>
                  {result.limit > 0 && (
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
                    <span>{t('token_check.expiration_date')}</span>
                    <span className={styles.metaValue}>
                      {result.expires_at ? new Date(result.expires_at).toLocaleString(language) : t('token_check.never_expires')}
                    </span>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>
                    <span>{t('token_check.reset_time')}</span>
                    <span className={styles.metaValue}>
                      {result.reset_at ? new Date(result.reset_at).toLocaleString(language) : '-'}
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

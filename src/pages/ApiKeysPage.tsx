import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { IconKey, IconRefreshCw, IconTrash2 } from '@/components/ui/icons';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { apiKeysApi, type ApiKeyPlan, type ManagedApiKeyItem } from '@/services/api';
import { useAuthStore, useNotificationStore } from '@/stores';
import styles from './ApiKeysPage.module.scss';

const PLAN_OPTIONS: Array<{ value: ApiKeyPlan; limit: number }> = [
  { value: 'day', limit: 1000 },
  { value: 'week', limit: 2000 },
  { value: 'month', limit: 2000 }
];

export function ApiKeysPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const { showNotification, showConfirmation } = useNotificationStore();

  const [searchToken, setSearchToken] = useState('');
  const [activeToken, setActiveToken] = useState('');
  const [keys, setKeys] = useState<ManagedApiKeyItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<ApiKeyPlan>('day');

  const disableControls = connectionStatus !== 'connected';

  const loadKeys = useCallback(
    async (token = '') => {
      setLoading(true);
      setError('');
      try {
        const result = await apiKeysApi.listManaged(token);
        setKeys(result.items);
        setCount(result.count);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('notification.refresh_failed');
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useHeaderRefresh(() => loadKeys(activeToken));

  useEffect(() => {
    if (disableControls) {
      setKeys([]);
      setCount(0);
      setError('');
      return;
    }
    loadKeys(activeToken);
  }, [activeToken, disableControls, loadKeys]);

  const handleSearch = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const nextToken = searchToken.trim();
      setActiveToken(nextToken);
    },
    [searchToken]
  );

  const handleReset = useCallback(() => {
    setSearchToken('');
    setActiveToken('');
  }, []);

  const handleCreate = useCallback(
    async () => {
      setCreating(true);
      setError('');
      try {
        const created = await apiKeysApi.create({
          plan
        });
        showNotification(
          t('api_key_management.create_success', { key: created.apiKey }),
          'success'
        );
        setCreateModalOpen(false);
        await loadKeys(activeToken);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknown_error');
        setError(message);
        showNotification(message, 'error');
      } finally {
        setCreating(false);
      }
    },
    [activeToken, loadKeys, plan, showNotification, t]
  );

  const handleDelete = useCallback(
    (apiKey: string) => {
      showConfirmation({
        title: t('api_key_management.delete_title'),
        message: t('api_key_management.delete_confirm', { key: apiKey }),
        variant: 'danger',
        confirmText: t('common.delete'),
        onConfirm: async () => {
          try {
            await apiKeysApi.remove(apiKey);
            showNotification(t('api_key_management.delete_success', { key: apiKey }), 'success');
            await loadKeys(activeToken);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('common.unknown_error');
            setError(message);
            showNotification(message, 'error');
          }
        }
      });
    },
    [activeToken, loadKeys, showConfirmation, showNotification, t]
  );

  const currentPlanMeta = useMemo(
    () => PLAN_OPTIONS.find((item) => item.value === plan) ?? PLAN_OPTIONS[0],
    [plan]
  );
  const summaryTimezone = keys[0]?.timezone || t('common.not_set');
  const summaryDate = keys[0]?.date || t('common.not_set');
  const formatBoolean = useCallback(
    (value?: boolean) => {
      if (value === undefined) return '-';
      return value ? t('common.yes') : t('common.no');
    },
    [t]
  );

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t('api_key_management.title')}</h1>
          <p className={styles.description}>{t('api_key_management.description')}</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => loadKeys(activeToken)}
            disabled={disableControls}
            loading={loading}
          >
            <span className={styles.buttonLabel}>
              <IconRefreshCw size={16} />
              {t('common.refresh')}
            </span>
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} disabled={disableControls}>
            {t('api_key_management.open_create')}
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon}>
            <IconKey size={18} />
          </div>
          <div className={styles.statLabel}>{t('api_key_management.stats.total')}</div>
          <div className={styles.statValue}>{count}</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statLabel}>{t('api_key_management.stats.date')}</div>
          <div className={styles.statValueSmall}>{summaryDate}</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statLabel}>{t('api_key_management.stats.timezone')}</div>
          <div className={styles.statValueSmall}>{summaryTimezone}</div>
        </Card>
      </div>

      <Card
        title={t('api_key_management.filters_title')}
        className={styles.panel}
      >
        <form className={styles.filterForm} onSubmit={handleSearch}>
          <div className={styles.filterInputCompact}>
            <Input
              value={searchToken}
              onChange={(event) => setSearchToken(event.target.value)}
              placeholder={t('api_key_management.search_placeholder')}
              disabled={disableControls}
            />
          </div>
          <div className={styles.filterActions}>
            <Button type="submit" disabled={disableControls} loading={loading}>
              {t('api_key_management.search')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={disableControls || (!searchToken && !activeToken)}
            >
              {t('api_key_management.reset')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('api_key_management.list_title')} className={styles.panel}>
        {keys.length === 0 ? (
          <div className={styles.emptyState}>
            {activeToken
              ? t('api_key_management.empty_filtered')
              : t('api_key_management.empty')}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('api_key_management.api_key_label')}</th>
                  <th>{t('api_key_management.daily_token_limit')}</th>
                  <th>{t('api_key_management.used_tokens_today')}</th>
                  <th>{t('api_key_management.limit_enabled')}</th>
                  <th>{t('api_key_management.remaining_tokens_today')}</th>
                  <th>{t('api_key_management.daily_credit_limit')}</th>
                  <th>{t('api_key_management.used_credits_today')}</th>
                  <th>{t('api_key_management.remaining_credits_today')}</th>
                  <th>{t('api_key_management.credit_per_million_tokens')}</th>
                  <th>{t('api_key_management.credit_unit_tokens')}</th>
                  <th>{t('api_key_management.credit_mode')}</th>
                  <th>{t('api_key_management.expires_at')}</th>
                  <th>{t('api_key_management.expires_at_parsed')}</th>
                  <th>{t('api_key_management.expired')}</th>
                  <th>{t('api_key_management.date')}</th>
                  <th>{t('api_key_management.timezone')}</th>
                  <th>{t('api_key_management.next_reset_at')}</th>
                  <th>{t('api_key_management.seconds_until_reset')}</th>
                  <th>{t('common.action')}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((item) => (
                  <tr key={item.apiKey}>
                    <td className={styles.keyCell} title={item.apiKey}>
                      {item.apiKey}
                    </td>
                    <td>{item.dailyTokenLimit ?? '-'}</td>
                    <td>{item.usedTokensToday ?? '-'}</td>
                    <td>{formatBoolean(item.limitEnabled)}</td>
                    <td>{item.remainingTokensToday ?? '-'}</td>
                    <td>{item.dailyCreditLimit ?? '-'}</td>
                    <td>{item.usedCreditsToday ?? '-'}</td>
                    <td>{item.remainingCreditsToday ?? '-'}</td>
                    <td>{item.creditPerMillionTokens ?? '-'}</td>
                    <td>{item.creditUnitTokens ?? '-'}</td>
                    <td>{formatBoolean(item.creditMode)}</td>
                    <td>{item.expiresAt ?? '-'}</td>
                    <td>{item.expiresAtParsed ?? '-'}</td>
                    <td>{formatBoolean(item.expired)}</td>
                    <td>{item.date ?? '-'}</td>
                    <td>{item.timezone ?? '-'}</td>
                    <td>{item.nextResetAt ?? '-'}</td>
                    <td>{item.secondsUntilReset ?? '-'}</td>
                    <td className={styles.actionCell}>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item.apiKey)}
                        disabled={disableControls}
                      >
                        <span className={styles.buttonLabel}>
                          <IconTrash2 size={14} />
                          {t('common.delete')}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={createModalOpen}
        onClose={() => {
          if (creating) return;
          setCreateModalOpen(false);
        }}
        title={t('api_key_management.create_title')}
        closeDisabled={creating}
        footer={
          <div className={styles.modalFooter}>
            <Button
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} loading={creating}>
              {t('api_key_management.create')}
            </Button>
          </div>
        }
      >
        <div className={styles.modalBody}>
          <div className={styles.planField}>
            <label className={styles.fieldLabel}>{t('api_key_management.plan_label')}</label>
            <Select
              value={plan}
              onChange={(value) => setPlan(value as ApiKeyPlan)}
              options={PLAN_OPTIONS.map((item) => ({
                value: item.value,
                label: t(`api_key_management.plan_${item.value}`, { limit: item.limit })
              }))}
              disabled={creating}
            />
          </div>
          <div className={styles.planHint}>{t(`api_key_management.plan_${plan}_hint`)}</div>
          <div className={styles.planSummary}>
            {t('api_key_management.plan_limit', { limit: currentPlanMeta.limit })}
          </div>
        </div>
      </Modal>
    </div>
  );
}

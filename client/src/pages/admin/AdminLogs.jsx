import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { admin } from '../../api/client';

const PAGE_SIZES = [50, 100, 200];
const ACTION_KEYS = [
  'login',
  'recipe_saved',
  'recipe_unsaved',
  'user_edited',
  'user_deleted',
  'email_verified',
  'resend_verification',
  'password_reset',
  'account_locked',
  'account_unlocked',
  'admin_rights_granted',
  'admin_rights_revoked',
  'api_error',
];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function actionToTKey(action) {
  if (!action) return 'admin.actionApi_error';
  const key = 'action' + action.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('_');
  return `admin.${key}`;
}

export default function AdminLogs() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = {
    page,
    limit,
    ...(search && { search }),
    ...(actionFilter && { action: actionFilter }),
    ...(categoryFilter === 'error' && { category: 'error' }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => admin.logs.list(params),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{t('admin.logs')}</h2>

      <div className="flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.searchLogs')}
            className="min-w-[12rem] flex-1 max-w-md px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
            aria-label={t('admin.searchLogs')}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
          >
            {t('admin.searchPlaceholder')}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-action" className="text-sm text-slate-600">
              {t('admin.filterByAction')}:
            </label>
            <select
              id="filter-action"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('admin.allActions')}</option>
              {ACTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(actionToTKey(key))}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-category" className="text-sm text-slate-600">
              {t('admin.filterByCategory')}:
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('admin.filterAll')}</option>
              <option value="error">{t('admin.errorsOnly')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-sm text-slate-600">
              {t('admin.dateFrom')}:
            </label>
            <input
              id="date-from"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-to" className="text-sm text-slate-600">
              {t('admin.dateTo')}:
            </label>
            <input
              id="date-to"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{t('admin.pageSize')}:</span>
            <div className="flex gap-1">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setLimit(size);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${
                    limit === size ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">{t('admin.loading')}</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {!isLoading && !error && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">{t('admin.timestamp')}</th>
                  <th className="px-4 py-3">{t('admin.user')}</th>
                  <th className="px-4 py-3">{t('admin.logAction')}</th>
                  <th className="px-4 py-3">{t('admin.filterByCategory')}</th>
                  <th className="px-4 py-3">{t('admin.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      {total === 0 ? t('admin.noLogs') : t('admin.noLogsMatch')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-2">
                        {log.user_display_name
                          ? `${log.user_display_name} (${log.user_email || '—'})`
                          : log.user_email || '—'}
                      </td>
                      <td className="px-4 py-2">{t(actionToTKey(log.action))}</td>
                      <td className="px-4 py-2">
                        {log.category === 'error' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Error
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate" title={log.details ?? ''}>
                        {log.details ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              {t('admin.pageOf', { current: page, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium"
              >
                {t('admin.prevPage')}
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!hasNext}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium"
              >
                {t('admin.nextPage')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

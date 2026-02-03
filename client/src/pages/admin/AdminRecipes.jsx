import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

const PAGE_SIZES = [50, 100];

export default function AdminRecipes() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'recipes', q, page, limit],
    queryFn: () =>
      admin.recipes.list({
        ...(q ? { q } : {}),
        page,
        limit,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.recipes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] });
      setDeleteId(null);
    },
  });

  const recipes = data?.recipes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const handleSearchChange = (e) => {
    setQ(e.target.value);
    setPage(1);
  };

  if (isLoading) return <p className="text-slate-500">{t('admin.loadingRecipes')}</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.recipes')}</h2>
        <input
          type="search"
          placeholder={t('admin.searchPlaceholder')}
          value={q}
          onChange={handleSearchChange}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 w-48 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
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
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('admin.id')}</th>
              <th className="px-4 py-3">{t('admin.recipeTitle')}</th>
              <th className="px-4 py-3">{t('admin.savedCount')}</th>
              <th className="px-4 py-3">{t('admin.created')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {recipes.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2 max-w-xs truncate" title={r.title}>{r.title}</td>
                <td className="px-4 py-2">{r.save_count ?? 0}</td>
                <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : t('common.dash')}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/recipes/${r.id}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {t('admin.editRecipe')}
                  </Link>
                  {deleteId === r.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="text-red-600 hover:underline"
                      >
                        {t('common.confirmDelete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="text-slate-600 hover:underline"
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
    </div>
  );
}

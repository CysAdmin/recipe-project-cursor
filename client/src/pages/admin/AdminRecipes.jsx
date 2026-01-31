import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminRecipes() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'recipes', q],
    queryFn: () => admin.recipes.list(q ? { q, limit: 100 } : { limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.recipes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] });
      setDeleteId(null);
    },
  });

  const recipes = data?.recipes ?? [];

  if (isLoading) return <p className="text-slate-400">{t('admin.loadingRecipes')}</p>;
  if (error) return <p className="text-red-400">{error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">{t('admin.recipes')}</h2>
        <input
          type="search"
          placeholder={t('admin.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white w-48"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="px-4 py-3">{t('admin.id')}</th>
              <th className="px-4 py-3">{t('admin.recipeTitle')}</th>
              <th className="px-4 py-3">{t('admin.savedCount')}</th>
              <th className="px-4 py-3">{t('admin.created')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {recipes.map((r) => (
              <tr key={r.id} className="text-slate-300">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2 max-w-xs truncate" title={r.title}>{r.title}</td>
                <td className="px-4 py-2">{r.save_count ?? 0}</td>
                <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : t('common.dash')}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/recipes/${r.id}`}
                    className="text-brand-400 hover:underline"
                  >
                    {t('admin.editRecipe')}
                  </Link>
                  {deleteId === r.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="text-red-400 hover:underline"
                      >
                        {t('common.confirmDelete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="text-slate-400 hover:underline"
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      className="text-red-400 hover:underline"
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
    </div>
  );
}

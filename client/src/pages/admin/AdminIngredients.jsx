import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminIngredients() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ingredients'],
    queryFn: () => admin.ingredients.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.ingredients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  if (isLoading) return <p className="text-slate-500">{t('admin.loadingIngredients')}</p>;

  const ingredients = data?.ingredients ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.ingredientsCatalog')}</h2>
        <Link
          to="/app/admin/ingredients/new"
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          {t('admin.createIngredient')}
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('admin.id')}</th>
              <th className="px-4 py-3">{t('admin.ingredientKey')}</th>
              <th className="px-4 py-3">{t('admin.labelDe')}</th>
              <th className="px-4 py-3">{t('admin.labelEn')}</th>
              <th className="px-4 py-3">{t('admin.synonyms')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 divide-y divide-slate-200">
            {ingredients.map((ing) => (
              <tr key={ing.id}>
                <td className="px-4 py-2">{ing.id}</td>
                <td className="px-4 py-2 font-mono">{ing.key}</td>
                <td className="px-4 py-2">{ing.label_de}</td>
                <td className="px-4 py-2">{ing.label_en}</td>
                <td className="px-4 py-2 text-slate-500">
                  {Array.isArray(ing.synonyms) && ing.synonyms.length > 0
                    ? ing.synonyms.slice(0, 3).join(', ') + (ing.synonyms.length > 3 ? '…' : '')
                    : '–'}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/ingredients/${ing.id}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {t('common.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('admin.confirmDeleteIngredient'))) deleteMutation.mutate(ing.id);
                    }}
                    className="text-red-600 hover:underline disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

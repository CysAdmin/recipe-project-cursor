import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminUnits() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'units'],
    queryFn: () => admin.units.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.units.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  if (isLoading) return <p className="text-slate-500">{t('admin.loadingUnits')}</p>;

  const units = data?.units ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.units')}</h2>
        <Link
          to="/app/admin/units/new"
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          {t('admin.createUnit')}
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('admin.id')}</th>
              <th className="px-4 py-3">{t('admin.unitKey')}</th>
              <th className="px-4 py-3">{t('admin.labelDe')}</th>
              <th className="px-4 py-3">{t('admin.labelEn')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 divide-y divide-slate-200">
            {units.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.id}</td>
                <td className="px-4 py-2 font-mono">{u.key}</td>
                <td className="px-4 py-2">{u.label_de}</td>
                <td className="px-4 py-2">{u.label_en}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/units/${u.id}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {t('common.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('admin.confirmDeleteUnit'))) deleteMutation.mutate(u.id);
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

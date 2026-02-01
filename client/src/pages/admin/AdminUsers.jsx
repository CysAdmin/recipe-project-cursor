import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => admin.users.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeleteId(null);
    },
  });

  const users = data?.users ?? [];

  if (isLoading) return <p className="text-slate-500">{t('admin.loadingUsers')}</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.users')}</h2>
        <Link
          to="/app/admin/users/new"
          className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          {t('admin.createUser')}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('admin.id')}</th>
              <th className="px-4 py-3">{t('admin.email')}</th>
              <th className="px-4 py-3">{t('admin.displayName')}</th>
              <th className="px-4 py-3">{t('admin.admin')}</th>
              <th className="px-4 py-3">{t('admin.created')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.id}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.display_name || t('common.dash')}</td>
                <td className="px-4 py-2">{u.is_admin ? t('common.yes') : t('common.no')}</td>
                <td className="px-4 py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : t('common.dash')}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/users/${u.id}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {t('admin.editUser')}
                  </Link>
                  {deleteId === u.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(u.id)}
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
                      onClick={() => setDeleteId(u.id)}
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
    </div>
  );
}

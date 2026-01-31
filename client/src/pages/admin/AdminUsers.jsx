import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminUsers() {
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

  if (isLoading) return <p className="text-slate-400">Lade Benutzer…</p>;
  if (error) return <p className="text-red-400">{error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Benutzer</h2>
        <Link
          to="/app/admin/users/new"
          className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500"
        >
          Benutzer anlegen
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Anzeigename</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Erstellt</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="text-slate-300">
                <td className="px-4 py-2">{u.id}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.display_name || '–'}</td>
                <td className="px-4 py-2">{u.is_admin ? 'Ja' : 'Nein'}</td>
                <td className="px-4 py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '–'}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/users/${u.id}`}
                    className="text-brand-400 hover:underline"
                  >
                    Bearbeiten
                  </Link>
                  {deleteId === u.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(u.id)}
                        className="text-red-400 hover:underline"
                      >
                        Löschen bestätigen
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="text-slate-400 hover:underline"
                      >
                        Abbrechen
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteId(u.id)}
                      className="text-red-400 hover:underline"
                    >
                      Löschen
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

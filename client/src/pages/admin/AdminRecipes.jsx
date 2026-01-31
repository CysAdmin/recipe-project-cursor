import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminRecipes() {
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

  if (isLoading) return <p className="text-slate-400">Lade Rezepte…</p>;
  if (error) return <p className="text-red-400">{error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Rezepte</h2>
        <input
          type="search"
          placeholder="Suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white w-48"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Gespeichert</th>
              <th className="px-4 py-3">Erstellt</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {recipes.map((r) => (
              <tr key={r.id} className="text-slate-300">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2 max-w-xs truncate" title={r.title}>{r.title}</td>
                <td className="px-4 py-2">{r.save_count ?? 0}</td>
                <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '–'}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Link
                    to={`/app/admin/recipes/${r.id}`}
                    className="text-brand-400 hover:underline"
                  >
                    Bearbeiten
                  </Link>
                  {deleteId === r.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(r.id)}
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
                      onClick={() => setDeleteId(r.id)}
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

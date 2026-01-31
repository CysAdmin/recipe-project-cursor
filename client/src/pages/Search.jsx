import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';

export default function Search() {
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', 'discover', q.trim() || '_all'],
    queryFn: () =>
      recipesApi.list(
        q.trim() ? { q: q.trim(), limit: 30 } : { limit: 30 }
      ),
    enabled: true,
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (id) => recipesApi.save(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const recipes = data?.recipes || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white mb-2">Discover recipes</h1>
      <p className="text-slate-400 mb-6">Search all recipes and save any to your collection.</p>

      <div className="mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ingredients, keywords…"
          className="w-full max-w-md px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {isLoading || isFetching ? (
        <p className="text-slate-500">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-slate-500">
          {q.trim()
            ? 'No recipes found. Try a different search or import from URL in My Recipes.'
            : 'No recipes in the community yet. Import from URL in My Recipes to get started.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors flex flex-col"
            >
              <Link to={`/app/recipes/${r.id}`} className="flex-1 block">
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    className="w-full h-40 object-cover bg-slate-800"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-800 flex items-center justify-center text-slate-600">
                    No image
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-white truncate">{r.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.source_domain && (
                      <>
                        <RecipeSource recipe={r} />
                        <span className="text-slate-600">·</span>
                      </>
                    )}
                    <p className="text-slate-500 text-sm">
                      {[r.prep_time, r.cook_time].filter(Boolean).length
                        ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} min`
                        : '—'}
                      {r.save_count != null && r.save_count > 1 && ` · ${r.save_count} saved`}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate(r.id)}
                  disabled={saveMutation.isPending}
                  className="w-full py-2 rounded-lg border border-brand-500 text-brand-400 font-medium hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending && saveMutation.variables === r.id ? 'Saving…' : 'Save to my recipes'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

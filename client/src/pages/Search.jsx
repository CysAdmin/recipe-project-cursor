import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';

const EXTERNAL_PAGE_SIZE = 20;

const EXTERNAL_PROVIDERS = [
  { id: 'gutekueche', label: 'GuteKueche' },
  { id: 'chefkoch', label: 'Chefkoch' },
  { id: 'allrecipes', label: 'Allrecipes' },
  { id: 'tasty', label: 'Tasty' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Search() {
  const [q, setQ] = useState('');
  const [selectedProviders, setSelectedProviders] = useState(EXTERNAL_PROVIDERS.map((p) => p.id));
  const [externalVisibleCount, setExternalVisibleCount] = useState(EXTERNAL_PAGE_SIZE);
  const queryClient = useQueryClient();

  const trimmedQ = q.trim();
  useEffect(() => {
    setExternalVisibleCount(EXTERNAL_PAGE_SIZE);
  }, [trimmedQ]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', 'discover', trimmedQ || '_all'],
    queryFn: () =>
      recipesApi.list(
        trimmedQ ? { q: trimmedQ, limit: 30 } : { limit: 30 }
      ),
    enabled: true,
    staleTime: 0,
  });

  const shouldFetchExternal = !!trimmedQ;
  const externalGk = useQuery({
    queryKey: ['recipes', 'external', trimmedQ, 'gutekueche'],
    queryFn: () => recipesApi.externalSearch(trimmedQ, 'gutekueche'),
    enabled: shouldFetchExternal && selectedProviders.includes('gutekueche'),
    staleTime: 60 * 1000,
  });
  const externalCk = useQuery({
    queryKey: ['recipes', 'external', trimmedQ, 'chefkoch'],
    queryFn: () => recipesApi.externalSearch(trimmedQ, 'chefkoch'),
    enabled: shouldFetchExternal && selectedProviders.includes('chefkoch'),
    staleTime: 60 * 1000,
  });
  const externalAr = useQuery({
    queryKey: ['recipes', 'external', trimmedQ, 'allrecipes'],
    queryFn: () => recipesApi.externalSearch(trimmedQ, 'allrecipes'),
    enabled: shouldFetchExternal && selectedProviders.includes('allrecipes'),
    staleTime: 60 * 1000,
  });
  const externalTasty = useQuery({
    queryKey: ['recipes', 'external', trimmedQ, 'tasty'],
    queryFn: () => recipesApi.externalSearch(trimmedQ, 'tasty'),
    enabled: shouldFetchExternal && selectedProviders.includes('tasty'),
    staleTime: 60 * 1000,
  });

  const external = useMemo(() => {
    const a = selectedProviders.includes('gutekueche') ? (externalGk.data?.external ?? []) : [];
    const b = selectedProviders.includes('chefkoch') ? (externalCk.data?.external ?? []) : [];
    const c = selectedProviders.includes('allrecipes') ? (externalAr.data?.external ?? []) : [];
    const d = selectedProviders.includes('tasty') ? (externalTasty.data?.external ?? []) : [];
    return shuffle([...a, ...b, ...c, ...d]);
  }, [externalGk.data, externalCk.data, externalAr.data, externalTasty.data, selectedProviders]);

  const externalLoading =
    shouldFetchExternal &&
    selectedProviders.length > 0 &&
    ((selectedProviders.includes('gutekueche') && externalGk.isFetching) ||
      (selectedProviders.includes('chefkoch') && externalCk.isFetching) ||
      (selectedProviders.includes('allrecipes') && externalAr.isFetching) ||
      (selectedProviders.includes('tasty') && externalTasty.isFetching)) &&
    external.length === 0;

  const saveMutation = useMutation({
    mutationFn: (id) => recipesApi.save(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (url) => recipesApi.importFromUrl(url),
    onSuccess: () => {
      const scrollY = window.scrollY;
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      const restore = () => window.scrollTo(0, scrollY);
      requestAnimationFrame(() => requestAnimationFrame(restore));
      setTimeout(restore, 100);
    },
  });

  const toggleProvider = (id) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const recipes = data?.recipes || [];
  const externalToShow = external.slice(0, externalVisibleCount);
  const hasMoreExternal = external.length > externalVisibleCount;
  const hasExternal = external.length > 0;
  const showExternalSection = !!trimmedQ && (hasExternal || externalLoading);

  const emptyState =
    !isLoading && !isFetching && recipes.length === 0 && !showExternalSection;

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
      ) : emptyState ? (
        <p className="text-slate-500">
          {trimmedQ
            ? 'No recipes found. Try a different search or import from URL in My Recipes.'
            : 'No recipes in the community yet. Import from URL in My Recipes to get started.'}
        </p>
      ) : (
        <>
          {recipes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Interne Rezepte</h2>
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
                      {r.saved_by_me ? (
                        <p className="text-slate-500 text-sm py-2">In deinen Rezepten</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => saveMutation.mutate(r.id)}
                          disabled={saveMutation.isPending}
                          className="w-full py-2 rounded-lg border border-brand-500 text-brand-400 font-medium hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                        >
                          {saveMutation.isPending && saveMutation.variables === r.id ? 'Saving…' : 'Save to my recipes'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trimmedQ && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">Externe Anbieter</h2>
              <p className="text-slate-400 text-sm mb-3">Quellen für die externe Suche auswählen:</p>
              <div className="flex flex-wrap gap-3">
                {EXTERNAL_PROVIDERS.map((p) => (
                  <label
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProviders.includes(p.id)}
                      onChange={() => toggleProvider(p.id)}
                      className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-slate-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {showExternalSection && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Externe Suchergebnisse</h2>
              {externalLoading ? (
                <p className="text-slate-500">Loading external results…</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {externalToShow.map((r) => (
                      <div
                        key={r.url}
                        className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors flex flex-col"
                      >
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 block"
                        >
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
                              <RecipeSource
                                recipe={{
                                  source_domain: r.source_domain || (r.url ? new URL(r.url).hostname : null),
                                  favicon_url: r.favicon_url,
                                }}
                              />
                            </div>
                          </div>
                        </a>
                        <div className="p-4 pt-0">
                          <button
                            type="button"
                            onClick={() => importMutation.mutate(r.url)}
                            disabled={importMutation.isPending}
                            className="w-full py-2 rounded-lg border border-brand-500 text-brand-400 font-medium hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                          >
                            {importMutation.isPending && importMutation.variables === r.url
                              ? 'Importing…'
                              : 'Import into my recipes'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreExternal && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setExternalVisibleCount((prev) => prev + EXTERNAL_PAGE_SIZE)}
                        className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

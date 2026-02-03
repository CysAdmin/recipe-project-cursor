import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import TagFilterPills from '../components/TagFilterPills';

const EXTERNAL_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const SUGGESTIONS_MAX = 6;

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [selectedProviders, setSelectedProviders] = useState(EXTERNAL_PROVIDERS.map((p) => p.id));
  const [externalVisibleCount, setExternalVisibleCount] = useState(EXTERNAL_PAGE_SIZE);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setExternalVisibleCount(EXTERNAL_PAGE_SIZE);
  }, [debouncedQ]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', 'discover', debouncedQ || '_all', tagFilter || null],
    queryFn: () =>
      recipesApi.list({
        ...(debouncedQ ? { q: debouncedQ } : {}),
        limit: 30,
        ...(tagFilter ? { tag: tagFilter } : {}),
      }),
    enabled: true,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const shouldFetchExternal = !!debouncedQ;
  const externalGk = useQuery({
    queryKey: ['recipes', 'external', debouncedQ, 'gutekueche'],
    queryFn: () => recipesApi.externalSearch(debouncedQ, 'gutekueche'),
    enabled: shouldFetchExternal && selectedProviders.includes('gutekueche'),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const externalCk = useQuery({
    queryKey: ['recipes', 'external', debouncedQ, 'chefkoch'],
    queryFn: () => recipesApi.externalSearch(debouncedQ, 'chefkoch'),
    enabled: shouldFetchExternal && selectedProviders.includes('chefkoch'),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const externalAr = useQuery({
    queryKey: ['recipes', 'external', debouncedQ, 'allrecipes'],
    queryFn: () => recipesApi.externalSearch(debouncedQ, 'allrecipes'),
    enabled: shouldFetchExternal && selectedProviders.includes('allrecipes'),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const externalTasty = useQuery({
    queryKey: ['recipes', 'external', debouncedQ, 'tasty'],
    queryFn: () => recipesApi.externalSearch(debouncedQ, 'tasty'),
    enabled: shouldFetchExternal && selectedProviders.includes('tasty'),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
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
  const suggestions = recipes.slice(0, SUGGESTIONS_MAX);
  const showSuggestionsDropdown =
    suggestionsVisible &&
    debouncedQ.trim() &&
    suggestions.length > 0 &&
    !isFetching;
  const externalToShow = external.slice(0, externalVisibleCount);
  const hasMoreExternal = external.length > externalVisibleCount;
  const hasExternal = external.length > 0;
  const showExternalSection = !!debouncedQ && (hasExternal || externalLoading);

  const emptyState =
    !isLoading && !isFetching && recipes.length === 0 && !showExternalSection;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-slate-800">{t('search.title')}</h1>
      <p className="text-slate-600 mb-2">{t('search.subline')}</p>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSuggestionsVisible(true)}
            onBlur={() => setSuggestionsVisible(false)}
            placeholder={t('search.placeholder')}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            aria-label={t('search.placeholder')}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestionsDropdown}
          />
          {showSuggestionsDropdown && (
            <ul
              id="search-suggestions"
              role="listbox"
              aria-label={t('search.searchSuggestions')}
              className="absolute top-full left-0 right-0 z-10 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((r) => (
                <li key={r.id} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSuggestionsVisible(false);
                      navigate(`/app/recipes/${r.id}`);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 truncate"
                  >
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <TagFilterPills selectedTag={tagFilter} onSelectTag={setTagFilter} />
      </div>

      {isLoading || isFetching ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : emptyState ? (
        <p className="text-slate-500">
          {debouncedQ ? t('search.noResultsQuery') : t('search.noResultsEmpty')}
        </p>
      ) : (
        <>
          {recipes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('search.alreadySaved')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
                  >
                    <Link to={`/app/recipes/${r.id}`} className="flex-1 block">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="w-full h-40 object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                          {t('common.noImage')}
                        </div>
                      )}
                      <div className="p-4">
                        <h2 className="font-semibold text-slate-800 truncate">{r.title}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {r.source_domain && (
                            <>
                              <RecipeSource recipe={r} />
                              <span className="text-slate-400">·</span>
                            </>
                          )}
                          <p className="text-slate-500 text-sm">
                            {[r.prep_time, r.cook_time].filter(Boolean).length
                              ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} ${t('recipeDetail.min')}`
                              : t('common.dash')}
                            {r.save_count != null && r.save_count > 1 && ` · ${r.save_count} ${t('recipeDetail.saved')}`}
                          </p>
                        </div>
                        <RecipeTags recipe={r} className="mt-2" />
                      </div>
                    </Link>
                    <div className="p-4 pt-0">
                      {r.saved_by_me ? (
                        <p className="text-slate-500 text-sm py-2">{t('search.inYourRecipes')}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => saveMutation.mutate(r.id)}
                          disabled={saveMutation.isPending}
                          className="w-full py-2 rounded-lg border border-brand-500 text-brand-600 font-medium hover:bg-brand-50 transition-colors disabled:opacity-50"
                        >
                          {saveMutation.isPending && saveMutation.variables === r.id ? t('common.saving') : t('search.saveToMine')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debouncedQ && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">{t('search.externalProviders')}</h2>
              <p className="text-slate-600 text-sm mb-3">{t('search.externalProvidersDesc')}</p>
              <div className="flex flex-wrap gap-3">
                {EXTERNAL_PROVIDERS.map((p) => (
                  <label
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProviders.includes(p.id)}
                      onChange={() => toggleProvider(p.id)}
                    className="rounded border-slate-300 bg-white text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-slate-600">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {showExternalSection && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('search.externalResults')}</h2>
              {externalLoading ? (
                <p className="text-slate-500">{t('search.loadingExternal')}</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {externalToShow.map((r) => (
                      <div
                        key={r.url}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
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
                              className="w-full h-40 object-cover bg-slate-100"
                            />
                          ) : (
                            <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                              {t('common.noImage')}
                            </div>
                          )}
                          <div className="p-4">
                            <h2 className="font-semibold text-slate-800 truncate">{r.title}</h2>
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
                            className="w-full py-2 rounded-lg border border-brand-500 text-brand-600 font-medium hover:bg-brand-50 transition-colors disabled:opacity-50"
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
                        className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                      >
                        {t('search.loadMore')}
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

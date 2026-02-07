import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery, keepPreviousData } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import TagFilterPills from '../components/TagFilterPills';
import RecipeMenuDropdown from '../components/RecipeMenuDropdown';
import AddToCollectionModal from '../components/AddToCollectionModal';
import { RecipeRowSkeleton } from '../components/skeletons';
import { useAuth } from '../context/AuthContext';

const SEARCH_DEBOUNCE_MS = 400;
const SUGGESTIONS_MAX = 6;

function IconSearch({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconPlus({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconChevronRight({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IconLightning({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function IconStar({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function IconClock({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconBasket({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconHeartFilled({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
function IconHeartOutline({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function Recipes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFilter = searchParams.get('tag') || '';
  const favoritesOnly = searchParams.get('favorites') === '1';
  const maxMinutes = searchParams.get('max_minutes') || '';
  const quickByTime = maxMinutes !== '';
  const setTagFilter = (tag) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (tag) p.set('tag', tag);
      else p.delete('tag');
      p.delete('favorites');
      p.delete('max_minutes');
      return p;
    });
  };
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [suggestionsVisible, setSuggestionsVisible] = React.useState(false);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const [importOpen, setImportOpen] = React.useState(false);
  const [importUrl, setImportUrl] = React.useState('');
  const [importError, setImportError] = React.useState('');
  const importInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const openImport = () => {
    setImportOpen(true);
    setImportError('');
    requestAnimationFrame(() => importInputRef.current?.focus());
  };
  const closeImport = () => {
    setImportOpen(false);
    setImportUrl('');
    setImportError('');
  };

  const importMutation = useMutation({
    mutationFn: (url) => recipesApi.importFromUrl(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'similar-to-favorites', user?.id] });
      closeImport();
    },
    onError: (err) => {
      const msg =
        err.data?.code === 'NO_RECIPE_FOUND'
          ? t('recipes.errorNoRecipeFound')
          : err.data?.error || err.message || t('recipes.errorImport');
      setImportError(msg);
    },
  });

  const [openMenuRecipeId, setOpenMenuRecipeId] = React.useState(null);
  const [addToCollectionRecipe, setAddToCollectionRecipe] = React.useState(null);

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => recipesApi.updateUserRecipe(id, { is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'similar-to-favorites', user?.id] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (id) => recipesApi.unsave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'similar-to-favorites', user?.id] });
      setOpenMenuRecipeId(null);
    },
  });

  const handleToggleFavorite = (e, recipe) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteMutation.mutate({ id: recipe.id, is_favorite: !recipe.is_favorite });
  };

  const handleImport = (e) => {
    e.preventDefault();
    const url = importUrl.trim();
    if (!url) return;
    importMutation.mutate(url);
  };

  const RECIPES_PAGE_SIZE = 20;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['recipes', 'mine', user?.id, tagFilter || null, favoritesOnly, maxMinutes || null, debouncedSearchQuery || null],
    queryFn: ({ pageParam }) =>
      recipesApi.list({
        mine: '1',
        limit: RECIPES_PAGE_SIZE,
        offset: pageParam,
        ...(tagFilter && { tag: tagFilter }),
        ...(favoritesOnly && { favorites: '1' }),
        ...(maxMinutes && { max_minutes: maxMinutes }),
        ...(debouncedSearchQuery && { q: debouncedSearchQuery }),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + (p.recipes?.length ?? 0), 0);
      return lastPage.total != null && loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });

  const recipes = data?.pages?.flatMap((p) => p.recipes ?? []) ?? [];
  const totalCount = data?.pages?.[0]?.total ?? recipes.length;
  const suggestions = recipes.slice(0, SUGGESTIONS_MAX);
  const showSuggestionsDropdown =
    searchOpen &&
    suggestionsVisible &&
    debouncedSearchQuery.trim() &&
    suggestions.length > 0 &&
    !isFetching;
  const loadMoreRef = React.useRef(null);

  const { data: similarData } = useQuery({
    queryKey: ['recipes', 'similar-to-favorites', user?.id],
    queryFn: () => recipesApi.similarToFavorites({ limit: 5 }),
    enabled: !!user?.id,
  });
  const similarRecipes = similarData?.recipes ?? [];

  // Anzahl „Ähnlich zu deinen Favoriten“ abhängig von Bildschirmhöhe (1–5), damit die Sidebar auf Laptops nicht abgeschnitten wird
  const getSimilarVisibleCount = () => {
    if (typeof window === 'undefined') return 5;
    const h = window.innerHeight;
    if (h < 600) return 1;
    if (h < 700) return 2;
    if (h < 800) return 3;
    if (h < 900) return 4;
    return 5;
  };
  const [similarVisibleCount, setSimilarVisibleCount] = React.useState(getSimilarVisibleCount);
  React.useEffect(() => {
    const updateCount = () => setSimilarVisibleCount(getSimilarVisibleCount());
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '100px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header: title left, actions right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-800">{t('recipes.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div
              className={`relative transition-[width] duration-300 ease-out ${
                searchOpen ? 'w-48 sm:w-56' : 'w-0'
              }`}
            >
              <div className="overflow-hidden h-full">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSuggestionsVisible(true)}
                  onBlur={() => {
                    setSuggestionsVisible(false);
                    if (!searchQuery.trim()) setSearchOpen(false);
                  }}
                  placeholder={t('recipes.searchPlaceholder')}
                  className="w-full min-w-0 py-2 pl-3 pr-2 rounded-l-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                  aria-label={t('recipes.searchPlaceholder')}
                  aria-autocomplete="list"
                  aria-controls="recipes-search-suggestions"
                  aria-expanded={showSuggestionsDropdown}
                />
              </div>
              {showSuggestionsDropdown && (
                <ul
                  id="recipes-search-suggestions"
                  role="listbox"
                  aria-label={t('recipes.searchSuggestions')}
                  className="absolute top-full left-0 right-0 z-20 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                  {suggestions.map((r) => (
                    <li key={r.id} role="option">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          closeSearch();
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
            <button
              type="button"
              onClick={searchOpen ? undefined : openSearch}
              className={`p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0 ${
                searchOpen ? 'rounded-l-none border border-l-0 border-slate-200 bg-slate-50' : ''
              }`}
              title={t('recipes.searchPlaceholder')}
            >
              <IconSearch />
            </button>
            {searchOpen && (
              <button
                type="button"
                onClick={closeSearch}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 ml-0.5 shrink-0"
                aria-label={t('common.cancel')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={openImport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors shrink-0"
          >
            <IconPlus />
            {t('recipes.newRecipe')}
          </button>
          <Link
            to="/app/profile"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-200 text-brand-800 font-semibold text-sm overflow-hidden"
            title={user?.display_name || user?.email}
          >
            {(user?.display_name || user?.email || '?').charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {addToCollectionRecipe && (
        <AddToCollectionModal
          recipe={addToCollectionRecipe}
          onClose={() => setAddToCollectionRecipe(null)}
        />
      )}

      {/* Import-Overlay: abgedunkelter Hintergrund, Klick außerhalb schließt */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importMutation.isPending) closeImport();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-dialog-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="import-dialog-title" className="font-semibold text-slate-800 mb-3">
              {t('recipes.importFromUrl')}
            </h2>
            <form onSubmit={handleImport} className="flex flex-col gap-3">
              <input
                ref={importInputRef}
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder={t('recipes.placeholderUrl')}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                aria-label={t('recipes.placeholderUrl')}
                disabled={importMutation.isPending}
              />
              {importError && (
                <p className="text-red-600 text-sm" role="alert">
                  {importError}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeImport}
                  disabled={importMutation.isPending}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending || !importUrl.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {importMutation.isPending ? t('recipes.importing') : t('recipes.import')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag filters + result count */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TagFilterPills selectedTag={tagFilter} onSelectTag={setTagFilter} />
        </div>
        {!isLoading && (
          <p className="text-slate-500 text-sm">{t('recipes.recipesFound', { count: totalCount })}</p>
        )}
      </div>

      {/* Two-column: recipe list (left) | Entscheidungshilfen sidebar (right) */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 min-w-0 order-2 lg:order-1">
          {isLoading ? (
            <ul className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <li key={`skeleton-${i}`}>
                  <RecipeRowSkeleton />
                </li>
              ))}
            </ul>
          ) : recipes.length === 0 ? (
            <p className="text-slate-500">
              {t('recipes.noRecipesBefore')}
              <Link to="/app/search" className="text-blue-600 hover:underline">
                {t('recipes.discoverLink')}
              </Link>
              {t('recipes.noRecipesAfter')}
            </p>
          ) : (
            <ul className="space-y-4">
              {recipes.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/app/recipes/${r.id}`}
                    className={`relative flex rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all ${openMenuRecipeId === r.id ? 'z-30' : ''}`}
                  >
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 bg-slate-100 overflow-hidden rounded-l-xl">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          {t('common.noImage')}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, r)}
                        className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                        aria-label={r.is_favorite ? t('recipeDetail.favorited') : t('recipeDetail.favorite')}
                        aria-pressed={!!r.is_favorite}
                      >
                        {r.is_favorite ? (
                          <IconHeartFilled className="w-5 h-5 text-red-500" />
                        ) : (
                          <IconHeartOutline className="w-5 h-5 text-red-500" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                      <RecipeSource recipe={r} className="mb-1" />
                      <h2 className="font-semibold text-slate-800 truncate">{r.title}</h2>
                      <RecipeTags recipe={r} activeFilter={tagFilter || undefined} className="mt-1.5" />
                      <div className="mt-1.5 flex items-center gap-2 text-slate-500 text-sm">
                        {[r.prep_time, r.cook_time].filter(Boolean).length > 0 && (
                          <span>
                            {[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} {t('recipeDetail.min')}
                          </span>
                        )}
                      </div>
                    </div>
                    <RecipeMenuDropdown
                      recipe={r}
                      isOpen={openMenuRecipeId === r.id}
                      onToggle={() => setOpenMenuRecipeId((prev) => (prev === r.id ? null : r.id))}
                      onClose={() => setOpenMenuRecipeId(null)}
                      onRemove={(recipe) => unsaveMutation.mutate(recipe.id)}
                      onAddToCollection={(recipe) => {
                        setOpenMenuRecipeId(null);
                        setAddToCollectionRecipe(recipe);
                      }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage != null && hasNextPage && (
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <ul className="space-y-4">
                  <li><RecipeRowSkeleton /></li>
                  <li><RecipeRowSkeleton /></li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Entscheidungshilfen sidebar: ein gemeinsamer sticky Container, damit „Entdecke Rezepte“ nicht darunter scrollt */}
        <aside className="lg:w-80 shrink-0 order-1 lg:order-2">
          <div className="sticky top-20 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="font-semibold text-slate-800 mb-4">{t('recipes.todayCook')}</h2>
            <nav className="space-y-2" aria-label={t('recipes.todayCook')}>
              <Link
                to={quickByTime && !favoritesOnly ? '/app/recipes' : '/app/recipes?max_minutes=30'}
                className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg text-left font-medium transition-colors ${
                  quickByTime && !favoritesOnly
                    ? 'bg-brand-100 text-brand-800 border border-brand-200'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent'
                }`}
              >
                <span className="text-amber-500 shrink-0" aria-hidden>
                  <IconLightning className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">{t('recipes.decisionAidQuickEasy')}</span>
                <IconChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
              <Link
                to={favoritesOnly ? '/app/recipes' : '/app/recipes?favorites=1'}
                className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg text-left font-medium transition-colors ${
                  favoritesOnly
                    ? 'bg-brand-100 text-brand-800 border border-brand-200'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent'
                }`}
              >
                <span className="text-amber-500 shrink-0" aria-hidden>
                  <IconStar className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">{t('recipes.decisionAidFavorites')}</span>
                <IconChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
              <Link
                to="/app/recipes"
                className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg text-left font-medium transition-colors ${
                  !tagFilter && !favoritesOnly && !quickByTime
                    ? 'bg-brand-100 text-brand-800 border border-brand-200'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent'
                }`}
              >
                <span className="text-brand-600 shrink-0" aria-hidden>
                  <IconClock className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">{t('recipes.decisionAidRecent')}</span>
                <IconChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
              <Link
                to="/app/recipes/by-ingredients"
                className="flex items-center gap-3 w-full py-3 px-3 rounded-lg text-left font-medium transition-colors bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent"
              >
                <span className="text-amber-500 shrink-0" aria-hidden>
                  <IconBasket className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">{t('recipes.decisionAidByIngredients')}</span>
                <IconChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            </nav>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="font-semibold text-slate-800 mb-3">{t('recipes.similarToFavorites')}</h2>
            {similarRecipes.length === 0 ? (
              <p className="text-slate-500 text-sm">{t('recipes.noSimilarRecipes')}</p>
            ) : (
              <ul className="space-y-2">
                {similarRecipes.slice(0, similarVisibleCount).map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/app/recipes/${r.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            {t('common.noImage')}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-800 text-sm line-clamp-2 flex-1 min-w-0">
                        {r.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

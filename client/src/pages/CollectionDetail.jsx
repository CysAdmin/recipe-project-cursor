import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collections as collectionsApi } from '../api/client';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';

const ADD_RECIPE_PAGE_SIZE = 20;
const COLLECTION_RECIPES_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function IconPlus({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconTrash({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconSearch({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconCheck({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function CollectionDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [addRecipeOpen, setAddRecipeOpen] = useState(false);
  const [addRecipeSearchInput, setAddRecipeSearchInput] = useState('');
  const [addRecipeSearchQuery, setAddRecipeSearchQuery] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([]);
  const addRecipeListRef = useRef(null);

  useEffect(() => {
    if (!addRecipeOpen) return;
    const t = setTimeout(() => setAddRecipeSearchQuery(addRecipeSearchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [addRecipeOpen, addRecipeSearchInput]);

  useEffect(() => {
    if (!addRecipeOpen) {
      setAddRecipeSearchInput('');
      setSelectedRecipeIds([]);
    }
  }, [addRecipeOpen]);

  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
  };

  const {
    data: collectionData,
    isLoading,
    error,
    fetchNextPage: fetchNextCollectionPage,
    hasNextPage: hasNextCollectionPage,
    isFetchingNextPage: isFetchingNextCollectionPage,
  } = useInfiniteQuery({
    queryKey: ['collection', id],
    queryFn: ({ pageParam = 0 }) =>
      collectionsApi.get(id, {
        limit: COLLECTION_RECIPES_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + (p.recipes?.length ?? 0), 0);
      return lastPage.total != null && loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!id,
  });

  const {
    data: myRecipesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingRecipes,
  } = useInfiniteQuery({
    queryKey: ['recipes', 'mine', 'add-to-collection', addRecipeSearchQuery],
    queryFn: ({ pageParam = 0 }) =>
      recipesApi.list({
        mine: 1,
        limit: ADD_RECIPE_PAGE_SIZE,
        offset: pageParam,
        ...(addRecipeSearchQuery ? { q: addRecipeSearchQuery } : {}),
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + (p.recipes?.length ?? 0), 0);
      return lastPage.recipes?.length === ADD_RECIPE_PAGE_SIZE ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: addRecipeOpen,
  });

  const addRecipesMutation = useMutation({
    mutationFn: async (recipeIds) => {
      await Promise.all(recipeIds.map((recipeId) => collectionsApi.addRecipe(id, recipeId)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedRecipeIds([]);
      setAddRecipeOpen(false);
    },
  });

  const removeRecipeMutation = useMutation({
    mutationFn: (recipeId) => collectionsApi.removeRecipe(id, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const collection = collectionData?.pages?.[0]?.collection;
  const recipes = collectionData?.pages?.flatMap((p) => p.recipes ?? []) ?? [];
  const myRecipes = myRecipesData?.pages?.flatMap((p) => p.recipes ?? []) ?? [];
  const recipeIdsInCollection = new Set(recipes.map((r) => r.id));
  const recipesToAdd = myRecipes.filter((r) => !recipeIdsInCollection.has(r.id));

  if (isLoading) return <p className="text-slate-500">{t('common.loading')}</p>;
  if (error || !collection) return <p className="text-red-600">{t('recipeDetail.notFound')}</p>;

  return (
    <div className="space-y-6">
      <Link to="/app/collections" className="text-slate-600 hover:text-slate-900 text-sm font-medium inline-block">
        {t('collections.backToCollections')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-800">{collection.name}</h1>
        <button
          type="button"
          onClick={() => setAddRecipeOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <IconPlus className="w-5 h-5" />
          {t('collections.addRecipe')}
        </button>
      </div>

      {addRecipeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddRecipeOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-recipe-dialog-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-recipe-dialog-title" className="font-semibold text-slate-800 mb-3">
              {t('collections.addRecipe')}
            </h2>
            <div className="relative mb-3">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={addRecipeSearchInput}
                onChange={(e) => setAddRecipeSearchInput(e.target.value)}
                placeholder={t('collections.searchRecipes')}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                aria-label={t('collections.searchRecipes')}
              />
            </div>
            <div
              ref={addRecipeListRef}
              className="flex-1 overflow-y-auto min-h-0 space-y-2"
              onScroll={() => {
                const el = addRecipeListRef.current;
                if (!el || !hasNextPage || isFetchingNextPage) return;
                const { scrollTop, scrollHeight, clientHeight } = el;
                if (scrollTop + clientHeight >= scrollHeight - 100) fetchNextPage();
              }}
            >
              {isLoadingRecipes ? (
                <p className="text-slate-500 text-sm py-4">{t('common.loading')}</p>
              ) : recipesToAdd.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">{t('collections.noRecipesMatch')}</p>
              ) : (
                recipesToAdd.map((r) => {
                  const selected = selectedRecipeIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRecipeSelection(r.id)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selected
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center shrink-0">
                        {selected ? (
                          <IconCheck className="w-3 h-3 text-brand-600" />
                        ) : (
                          <span className="w-3 h-3" aria-hidden />
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            {t('common.noImage')}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-800 text-sm line-clamp-2 flex-1 min-w-0">{r.title}</span>
                    </button>
                  );
                })
              )}
              {hasNextPage && (
                <div className="py-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? t('common.loading') : t('collections.loadMore')}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              {selectedRecipeIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => addRecipesMutation.mutate(selectedRecipeIds)}
                  disabled={addRecipesMutation.isPending}
                  className="w-full px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50"
                >
                  {addRecipesMutation.isPending
                    ? t('common.loading')
                    : t('collections.addSelected', { count: selectedRecipeIds.length })}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAddRecipeOpen(false)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <p className="text-slate-500">{t('collections.noRecipesInCollection')}</p>
      ) : (
        <ul className="space-y-4">
          {recipes.map((r) => (
            <li key={r.id} className="relative flex rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <Link to={`/app/recipes/${r.id}`} className="flex flex-1 min-w-0">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 bg-slate-100 overflow-hidden rounded-l-xl">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      {t('common.noImage')}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                  <RecipeSource recipe={r} className="mb-1" />
                  <h2 className="font-semibold text-slate-800 truncate">{r.title}</h2>
                  <RecipeTags recipe={r} className="mt-1.5" />
                  <div className="mt-1.5 flex items-center gap-2 text-slate-500 text-sm">
                    {[r.prep_time, r.cook_time].filter(Boolean).length > 0 && (
                      <span>
                        {[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} {t('recipeDetail.min')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeRecipeMutation.mutate(r.id);
                }}
                disabled={removeRecipeMutation.isPending}
                className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white text-red-600 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 disabled:opacity-50"
                aria-label={t('collections.removeFromCollection')}
              >
                <IconTrash className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasNextCollectionPage && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextCollectionPage()}
            disabled={isFetchingNextCollectionPage}
            className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isFetchingNextCollectionPage ? t('common.loading') : t('collections.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

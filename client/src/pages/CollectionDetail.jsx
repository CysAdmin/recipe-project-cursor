import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collections as collectionsApi } from '../api/client';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';

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

export default function CollectionDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [addRecipeOpen, setAddRecipeOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.get(id),
    enabled: !!id,
  });

  const { data: myRecipesData } = useQuery({
    queryKey: ['recipes', 'mine'],
    queryFn: () => recipesApi.list({ mine: 1, limit: 100 }),
    enabled: addRecipeOpen,
  });

  const addRecipeMutation = useMutation({
    mutationFn: (recipeId) => collectionsApi.addRecipe(id, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
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

  const collection = data?.collection;
  const recipes = data?.recipes ?? [];
  const myRecipes = myRecipesData?.recipes ?? [];
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
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
              {recipesToAdd.length === 0 ? (
                <p className="text-slate-500 text-sm">{t('recipes.noRecipesBefore')}</p>
              ) : (
                recipesToAdd.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => addRecipeMutation.mutate(r.id)}
                    disabled={addRecipeMutation.isPending}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
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
                    <span className="font-medium text-slate-800 text-sm line-clamp-2 flex-1 min-w-0">{r.title}</span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
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
    </div>
  );
}

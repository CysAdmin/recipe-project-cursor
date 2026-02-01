import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import { RecipeTagPillsEditable } from '../components/TagFilterPills';

export default function RecipeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
  });

  const personalNotesFromApi = data?.user_recipe?.personal_notes ?? data?.recipe?.personal_notes ?? '';
  useEffect(() => {
    if (personalNotesFromApi !== undefined && personalNotesFromApi !== null) {
      setNotes(personalNotesFromApi);
    }
  }, [personalNotesFromApi]);

  const updateUserRecipe = useMutation({
    mutationFn: (body) => recipesApi.updateUserRecipe(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    },
  });

  const updateRecipeTags = useMutation({
    mutationFn: (tags) => recipesApi.update(id, { tags }),
    onSuccess: (res) => {
      queryClient.setQueryData(['recipe', id], (prev) => ({
        ...prev,
        recipe: res.recipe,
        user_recipe: res.user_recipe ?? prev?.user_recipe,
      }));
    },
  });

  const toggleFavorite = () => {
    const current = data?.user_recipe?.is_favorite ?? data?.recipe?.is_favorite ?? false;
    updateUserRecipe.mutate({ is_favorite: !current });
  };

  const saveNotes = () => {
    updateUserRecipe.mutate({ personal_notes: notes });
  };

  if (isLoading) return <p className="text-slate-500">{t('recipeDetail.loading')}</p>;
  if (error || !data?.recipe) return <p className="text-red-600">{t('recipeDetail.notFound')}</p>;

  const recipe = data.recipe;
  const userRecipe = data.user_recipe;
  const isFavorite = userRecipe?.is_favorite ?? recipe.is_favorite ?? false;

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <Link to="/app/recipes" className="text-slate-600 hover:text-slate-900 text-sm font-medium inline-block">
        {t('recipeDetail.backToRecipes')}
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt=""
            className="w-full max-h-80 object-cover bg-slate-100"
          />
        ) : (
          <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400">
            {t('common.noImage')}
          </div>
        )}
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mb-2">
            <RecipeSource recipe={recipe} className="text-slate-500" />
            {recipe.prep_time != null && <span>{t('recipeDetail.prep')}: {recipe.prep_time} {t('recipeDetail.min')}</span>}
            {recipe.cook_time != null && <span>{t('recipeDetail.cook')}: {recipe.cook_time} {t('recipeDetail.min')}</span>}
            {recipe.servings != null && <span>{recipe.servings} {t('recipeDetail.servings')}</span>}
            {recipe.save_count != null && recipe.save_count > 1 && (
              <span>{recipe.save_count} {t('recipeDetail.saved')}</span>
            )}
          </div>
          {userRecipe ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-600 mb-2">{t('recipeDetail.assignTags')}</p>
              <RecipeTagPillsEditable
                tags={Array.isArray(recipe.tags) ? recipe.tags : []}
                onTagsChange={(tags) => updateRecipeTags.mutate(tags)}
                disabled={updateRecipeTags.isPending}
              />
            </div>
          ) : (
            <RecipeTags recipe={{ ...recipe, is_favorite: isFavorite }} className="mb-4" />
          )}
          {recipe.description && (
            <p className="text-slate-600 mb-4">{recipe.description}</p>
          )}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline text-sm font-medium"
            >
              {t('recipeDetail.viewOriginal')}
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={toggleFavorite}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            isFavorite
              ? 'bg-brand-100 border-brand-500 text-brand-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isFavorite ? t('recipeDetail.favorited') : t('recipeDetail.favorite')}
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 mb-3">{t('recipeDetail.ingredients')}</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i}>{typeof ing === 'object' && ing?.raw ? ing.raw : String(ing)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 mb-2">{t('recipeDetail.personalNotes')}</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder={t('recipeDetail.placeholderNotes')}
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </section>
    </div>
  );
}

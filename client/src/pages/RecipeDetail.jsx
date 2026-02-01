import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { mealSchedules as scheduleApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import { RecipeTagPillsEditable } from '../components/TagFilterPills';

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

export default function RecipeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [notes, setNotes] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => toYMD(new Date()));
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

  const addToMealPlanMutation = useMutation({
    mutationFn: (body) => scheduleApi.add(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
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

  const addToMealPlan = () => {
    addToMealPlanMutation.mutate({
      recipe_id: parseInt(id, 10),
      meal_date: scheduleDate,
      servings: recipe?.servings ?? 1,
    });
  };

  const toggleFavorite = () => {
    const current = data?.user_recipe?.is_favorite ?? data?.recipe?.is_favorite ?? false;
    updateUserRecipe.mutate({ is_favorite: !current });
  };

  const saveNotes = () => {
    updateUserRecipe.mutate({ personal_notes: notes });
  };

  if (isLoading) return <p className="text-slate-500">{t('recipeDetail.loading')}</p>;
  if (error || !data?.recipe) return <p className="text-red-400">{t('recipeDetail.notFound')}</p>;

  const recipe = data.recipe;
  const userRecipe = data.user_recipe;
  const isFavorite = userRecipe?.is_favorite ?? recipe.is_favorite ?? false;
  const addToPlanError = addToMealPlanMutation.isError ? addToMealPlanMutation.error?.data?.error : null;
  const addToPlanSuccess = addToMealPlanMutation.isSuccess && !addToMealPlanMutation.isPending;

  return (
    <div className="max-w-3xl">
      <Link to="/app/recipes" className="text-slate-400 hover:text-white text-sm mb-4 inline-block">
        {t('recipeDetail.backToRecipes')}
      </Link>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden mb-6">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt=""
            className="w-full max-h-80 object-cover bg-slate-800"
          />
        ) : (
          <div className="w-full h-48 bg-slate-800 flex items-center justify-center text-slate-600">
            {t('common.noImage')}
          </div>
        )}
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-white mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mb-2">
            <RecipeSource recipe={recipe} className="text-slate-400" />
            {recipe.prep_time != null && <span>{t('recipeDetail.prep')}: {recipe.prep_time} {t('recipeDetail.min')}</span>}
            {recipe.cook_time != null && <span>{t('recipeDetail.cook')}: {recipe.cook_time} {t('recipeDetail.min')}</span>}
            {recipe.servings != null && <span>{recipe.servings} {t('recipeDetail.servings')}</span>}
            {recipe.save_count != null && recipe.save_count > 1 && (
              <span>{recipe.save_count} {t('recipeDetail.saved')}</span>
            )}
          </div>
          {userRecipe ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-400 mb-2">{t('recipeDetail.assignTags')}</p>
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
            <p className="text-slate-400 mb-4">{recipe.description}</p>
          )}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline text-sm"
            >
              {t('recipeDetail.viewOriginal')}
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          type="button"
          onClick={toggleFavorite}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            isFavorite
              ? 'bg-brand-500/20 border-brand-500 text-brand-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          {isFavorite ? t('recipeDetail.favorited') : t('recipeDetail.favorite')}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="schedule-date" className="text-slate-400 text-sm">
            {t('recipeDetail.addToMealPlan')}
          </label>
          <input
            id="schedule-date"
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={addToMealPlan}
            disabled={addToMealPlanMutation.isPending}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {addToMealPlanMutation.isPending ? t('recipeDetail.adding') : t('recipeDetail.addToDay')}
          </button>
          {addToPlanSuccess && (
            <span className="text-brand-400 text-sm">
              {t('recipeDetail.added')}{' '}
              <Link to="/app/meal-plan" className="underline">
                {t('recipeDetail.viewMealPlan')}
              </Link>
            </span>
          )}
          {addToPlanError && (
            <span className="text-red-400 text-sm">{addToPlanError}</span>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-white mb-3">{t('recipeDetail.ingredients')}</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-1">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      <section className="border-t border-slate-800 pt-6">
        <h2 className="font-display text-lg font-semibold text-white mb-2">{t('recipeDetail.personalNotes')}</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder={t('recipeDetail.placeholderNotes')}
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </section>
    </div>
  );
}

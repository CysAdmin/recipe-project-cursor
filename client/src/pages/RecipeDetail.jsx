import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { mealSchedules as scheduleApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

export default function RecipeDetail() {
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

  if (isLoading) return <p className="text-slate-500">Loading recipe…</p>;
  if (error || !data?.recipe) return <p className="text-red-400">Recipe not found.</p>;

  const recipe = data.recipe;
  const userRecipe = data.user_recipe;
  const isFavorite = userRecipe?.is_favorite ?? recipe.is_favorite ?? false;
  const addToPlanError = addToMealPlanMutation.isError ? addToMealPlanMutation.error?.data?.error : null;
  const addToPlanSuccess = addToMealPlanMutation.isSuccess && !addToMealPlanMutation.isPending;

  return (
    <div className="max-w-3xl">
      <Link to="/app/recipes" className="text-slate-400 hover:text-white text-sm mb-4 inline-block">
        ← Back to My Recipes
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
            No image
          </div>
        )}
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-white mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mb-4">
            <RecipeSource recipe={recipe} className="text-slate-400" />
            {recipe.prep_time != null && <span>Prep: {recipe.prep_time} min</span>}
            {recipe.cook_time != null && <span>Cook: {recipe.cook_time} min</span>}
            {recipe.servings != null && <span>{recipe.servings} servings</span>}
            {recipe.save_count != null && recipe.save_count > 1 && (
              <span>{recipe.save_count} saved</span>
            )}
          </div>
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
              View original source →
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
          {isFavorite ? '★ Favorited' : '☆ Favorite'}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="schedule-date" className="text-slate-400 text-sm">
            Add to meal plan:
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
            {addToMealPlanMutation.isPending ? 'Adding…' : 'Add to day'}
          </button>
          {addToPlanSuccess && (
            <span className="text-brand-400 text-sm">
              Added.{' '}
              <Link to="/app/meal-plan" className="underline">
                View meal plan
              </Link>
            </span>
          )}
          {addToPlanError && (
            <span className="text-red-400 text-sm">{addToPlanError}</span>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-white mb-3">Ingredients</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-1">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      <section className="border-t border-slate-800 pt-6">
        <h2 className="font-display text-lg font-semibold text-white mb-2">Personal notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Your private notes…"
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </section>
    </div>
  );
}

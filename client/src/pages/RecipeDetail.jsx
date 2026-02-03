import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import { RecipeTagPillsEditable } from '../components/TagFilterPills';

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
function IconStarFilled({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function IconStarOutline({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

export default function RecipeDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const bringWidgetRef = useRef(null);

  const loginRedirect = `/login?next=${encodeURIComponent(`${location.pathname}${location.search ?? ''}`)}`;
  const isAuthenticated = !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
  });

  const personalNotesFromApi = data?.user_recipe?.personal_notes ?? data?.recipe?.personal_notes ?? '';
  useEffect(() => {
    if (isAuthenticated && personalNotesFromApi !== undefined && personalNotesFromApi !== null) {
      setNotes(personalNotesFromApi);
    } else if (!isAuthenticated) {
      setNotes('');
    }
  }, [personalNotesFromApi, isAuthenticated]);

  const updateUserRecipe = useMutation({
    mutationFn: (body) => recipesApi.updateUserRecipe(id, body),
    onSuccess: (res) => {
      queryClient.setQueryData(['recipe', id], (prev) => ({
        ...prev,
        recipe: res.recipe ?? prev?.recipe,
        user_recipe: res.user_recipe ?? prev?.user_recipe,
      }));
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine'] });
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

  const saveMutation = useMutation({
    mutationFn: () => recipesApi.save(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine'] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => recipesApi.unsave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine'] });
    },
  });

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      navigate(loginRedirect);
      return;
    }
    if (!data?.user_recipe) return;
    const current = data?.user_recipe?.is_favorite ?? data?.recipe?.is_favorite ?? false;
    updateUserRecipe.mutate({ is_favorite: !current });
  };

  const saveNotes = () => {
    if (!isAuthenticated) return;
    updateUserRecipe.mutate({ personal_notes: notes });
  };

  const handleToggleSave = () => {
    if (!isAuthenticated) {
      navigate(loginRedirect);
      return;
    }
    if (data?.user_recipe) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  useEffect(() => {
    const recipeForBring = data?.recipe;
    if (!recipeForBring || !bringWidgetRef.current) return;
    const bringImportUrl =
      recipeForBring.source_url ||
      (typeof window !== 'undefined' ? `${window.location.origin}/recipes/${recipeForBring.id}` : '');
    if (!bringImportUrl) return;
    const el = bringWidgetRef.current;
    const lang = i18n.language === 'de' ? 'de' : 'en';
    const servings =
      recipeForBring.servings != null && Number(recipeForBring.servings) > 0 ? Number(recipeForBring.servings) : 4;
    const tryRender = () => {
      if (typeof window !== 'undefined' && window.bringwidgets?.import?.render) {
        el.innerHTML = '';
        window.bringwidgets.import.render(el, {
          url: bringImportUrl,
          language: lang,
          theme: 'light',
          baseQuantity: String(servings),
          requestedQuantity: String(servings),
        });
        return true;
      }
      return false;
    };
    if (tryRender()) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      if (tryRender()) clearInterval(id);
    }, 150);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [data?.recipe?.source_url, data?.recipe?.id, data?.recipe?.servings, i18n.language]);

  if (isLoading) return <p className="text-slate-500">{t('recipeDetail.loading')}</p>;
  if (error || !data?.recipe) return <p className="text-red-600">{t('recipeDetail.notFound')}</p>;

  const recipe = data.recipe;
  const userRecipe = data.user_recipe;
  const isSaved = !!userRecipe;
  const isFavorite = userRecipe?.is_favorite ?? recipe.is_favorite ?? false;
  const bringImportUrl =
    recipe.source_url ||
    (typeof window !== 'undefined' ? `${window.location.origin}/recipes/${recipe.id}` : '');

  return (
    <div className="max-w-3xl w-full mx-auto flex flex-col gap-6 px-4 sm:px-0 py-4">
      <header className="flex items-center justify-between px-4 sm:px-1">
        <Link
          to={isAuthenticated ? '/app/recipes' : '/'}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium"
        >
          {t('recipeDetail.backToRecipes')}
        </Link>
        {!isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate(loginRedirect)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t('recipeDetail.loginToSave')}
          </button>
        )}
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mx-4 sm:mx-0">
        <div className="relative w-full">
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
          {(isSaved || !isAuthenticated) && (
            <button
              type="button"
              onClick={toggleFavorite}
              className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              aria-label={isFavorite ? t('recipeDetail.favorited') : t('recipeDetail.favorite')}
              aria-pressed={isFavorite}
              disabled={isAuthenticated ? updateUserRecipe.isPending : false}
            >
              {isFavorite ? (
                <IconHeartFilled className="w-5 h-5 text-red-500" />
              ) : (
                <IconHeartOutline className="w-5 h-5 text-red-500" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={
              !isAuthenticated ? false : isSaved ? unsaveMutation.isPending : saveMutation.isPending
            }
            className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 hover:bg-white text-slate-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50"
          >
            {isSaved ? t('recipeDetail.savedInList') : t('recipeDetail.notSavedInList')}
          </button>
        </div>
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-4 text-slate-500 text-sm mb-2">
            <div className="flex flex-wrap items-center gap-4">
              <RecipeSource recipe={recipe} className="text-slate-500" />
              {recipe.prep_time != null && <span>{t('recipeDetail.prep')}: {recipe.prep_time} {t('recipeDetail.min')}</span>}
              {recipe.cook_time != null && <span>{t('recipeDetail.cook')}: {recipe.cook_time} {t('recipeDetail.min')}</span>}
              {recipe.servings != null && <span>{recipe.servings} {t('recipeDetail.servings')}</span>}
              {recipe.save_count != null && recipe.save_count > 1 && (
                <span>{recipe.save_count} {t('recipeDetail.saved')}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                {recipe.rating_count != null && recipe.rating_count > 0 ? (
                  <>
                    <span className="font-medium">{Number(recipe.average_rating).toFixed(1)}</span>
                    <IconStarFilled className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-500 text-xs">
                      ({t('recipeDetail.ratingCount', { count: recipe.rating_count })})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">{t('recipeDetail.noRatingsYet')}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5" role="group" aria-label={t('recipeDetail.yourRating')}>
                {isAuthenticated
                  ? [1, 2, 3, 4, 5].map((n) => {
                      const myRating = userRecipe?.rating ?? 0;
                      const filled = n <= myRating;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateUserRecipe.mutate({ rating: n })}
                          disabled={updateUserRecipe.isPending}
                          className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 disabled:opacity-50 text-amber-500 hover:text-amber-600"
                          aria-label={`${n} ${n === 1 ? 'Stern' : 'Sterne'}`}
                          aria-pressed={filled}
                        >
                          {filled ? (
                            <IconStarFilled className="w-5 h-5" />
                          ) : (
                            <IconStarOutline className="w-5 h-5 text-slate-300 hover:text-amber-400" />
                          )}
                        </button>
                      );
                    })
                  : [1, 2, 3, 4, 5].map((n) => {
                      const filled = recipe.average_rating ? n <= Math.round(recipe.average_rating) : false;
                      return filled ? (
                        <IconStarFilled key={n} className="w-5 h-5 text-amber-400" />
                      ) : (
                        <IconStarOutline key={n} className="w-5 h-5 text-slate-300" />
                      );
                    })}
              </div>
              {!isAuthenticated && (
                <span className="text-xs text-slate-500">{t('recipeDetail.loginToRate')}</span>
              )}
            </div>
          </div>
          {isSaved ? (
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
            <div className="text-slate-600 mb-6">
              <p>{recipe.description}</p>
            </div>
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

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 mx-4 sm:mx-0">
        <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h2 className="font-display text-lg font-semibold text-slate-800">{t('recipeDetail.ingredients')}</h2>
          {bringImportUrl && (
            <div className="inline-block origin-top-left scale-[0.7] self-start sm:scale-100 sm:origin-top-right sm:self-auto">
              <div ref={bringWidgetRef} />
            </div>
          )}
        </div>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i}>{typeof ing === 'object' && ing?.raw ? ing.raw : String(ing)}</li>
          ))}
        </ul>
      </section>

      {isAuthenticated && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 mx-4 sm:mx-0">
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
      )}
    </div>
  );
}

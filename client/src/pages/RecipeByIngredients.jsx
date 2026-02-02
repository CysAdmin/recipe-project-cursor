import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';

export default function RecipeByIngredients() {
  const { t } = useTranslation();
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const list = ingredientsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setError('');
    setSearched(true);
    if (list.length === 0) {
      setRecipes([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    recipesApi
      .byIngredients(list)
      .then((data) => {
        const all = data.recipes || [];
        const withMatch = all.filter((r) => (r.match_count ?? 0) >= 1);
        setRecipes(withMatch);
        setTotal(withMatch.length);
      })
      .catch((err) => {
        setError(err.data?.error || err.message || t('recipes.errorImport'));
        setRecipes([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/app/recipes"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('byIngredientsPage.backToRecipes')}
        </Link>
      </div>

      <h1 className="font-display text-2xl font-bold text-slate-800">{t('byIngredientsPage.title')}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
        <input
          type="text"
          value={ingredientsInput}
          onChange={(e) => setIngredientsInput(e.target.value)}
          placeholder={t('byIngredientsPage.placeholder')}
          className="flex-1 min-w-0 py-2.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
          aria-label={t('byIngredientsPage.placeholder')}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none shrink-0"
        >
          {loading ? t('common.loading') : t('byIngredientsPage.findRecipes')}
        </button>
      </form>

      {!searched && (
        <p className="text-slate-500 text-sm">{t('byIngredientsPage.enterIngredients')}</p>
      )}

      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}

      {searched && !loading && !error && (
        <>
          {total > 0 && (
            <p className="text-slate-500 text-sm">{t('recipes.recipesFound', { count: total })}</p>
          )}
          {recipes.length === 0 ? (
            <p className="text-slate-500">{t('byIngredientsPage.noResults')}</p>
          ) : (
            <ul className="space-y-4">
              {recipes.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/app/recipes/${r.id}`}
                    className="flex rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
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
                    </div>
                    <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                      <RecipeSource recipe={r} className="mb-1" />
                      <h2 className="font-semibold text-slate-800 truncate">{r.title}</h2>
                      {r.match_total != null && r.match_total > 0 && (
                        <p className="mt-1.5 text-slate-500 text-sm">
                          {t('byIngredientsPage.matchCount', {
                            count: r.match_count ?? 0,
                            total: r.match_total,
                          })}
                        </p>
                      )}
                      {[r.prep_time, r.cook_time].filter(Boolean).length > 0 && (
                        <p className="mt-0.5 text-slate-500 text-sm">
                          {[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} {t('recipeDetail.min')}
                        </p>
                      )}
                    </div>
                    <span className="self-center pr-4 text-slate-400" aria-hidden>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

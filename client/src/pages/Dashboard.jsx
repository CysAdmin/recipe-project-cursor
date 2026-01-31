import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecipeSource from '../components/RecipeSource';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['recipes', 'mine', user?.id],
    queryFn: () => recipesApi.list({ mine: '1' }),
    enabled: !!user?.id,
  });

  const recentRecipes = (data?.recipes || []).slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white mb-2">
        {t('dashboard.hi')}{user?.display_name ? `, ${user.display_name}` : ''}
      </h1>
      <p className="text-slate-400 mb-8">{t('dashboard.subline')}</p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
        <Link
          to="/app/recipes"
          className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-brand-500/50 hover:bg-slate-900 transition-colors"
        >
          <h2 className="font-semibold text-white mb-1">{t('dashboard.myRecipes')}</h2>
          <p className="text-slate-500 text-sm">
            {isLoading ? '…' : `${(data?.recipes || []).length} ${t('dashboard.saved')}`}
          </p>
        </Link>
        <Link
          to="/app/search"
          className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-brand-500/50 hover:bg-slate-900 transition-colors"
        >
          <h2 className="font-semibold text-white mb-1">{t('dashboard.discover')}</h2>
          <p className="text-slate-500 text-sm">{t('dashboard.discoverDesc')}</p>
        </Link>
        <Link
          to="/app/meal-plan"
          className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-brand-500/50 hover:bg-slate-900 transition-colors"
        >
          <h2 className="font-semibold text-white mb-1">{t('dashboard.mealPlan')}</h2>
          <p className="text-slate-500 text-sm">{t('dashboard.mealPlanDesc')}</p>
        </Link>
        <Link
          to="/app/shopping-list"
          className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-brand-500/50 hover:bg-slate-900 transition-colors md:col-span-2 lg:col-span-1"
        >
          <h2 className="font-semibold text-white mb-1">{t('dashboard.shoppingList')}</h2>
          <p className="text-slate-500 text-sm">{t('dashboard.shoppingListDesc')}</p>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-white">{t('dashboard.recentRecipes')}</h2>
          <Link to="/app/recipes" className="text-brand-400 hover:underline text-sm">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {isLoading ? (
          <p className="text-slate-500">{t('common.loading')}</p>
        ) : recentRecipes.length === 0 ? (
          <p className="text-slate-500">
            {t('dashboard.noRecipesYet')}{' '}
            <Link to="/app/search" className="text-brand-400 hover:underline">
              {t('dashboard.discover')}
            </Link>{' '}
            {t('dashboard.discoverOrImport')}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRecipes.map((r) => (
              <Link
                key={r.id}
                to={`/app/recipes/${r.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors"
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    className="w-full h-32 object-cover bg-slate-800"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-800 flex items-center justify-center text-slate-600">
                    {t('common.noImage')}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-white truncate">{r.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.source_domain && (
                      <>
                        <RecipeSource recipe={r} />
                        <span className="text-slate-600">·</span>
                      </>
                    )}
                    <p className="text-slate-500 text-sm">
                      {r.prep_time != null || r.cook_time != null
                        ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} ${t('recipeDetail.min')}`
                        : t('common.dash')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

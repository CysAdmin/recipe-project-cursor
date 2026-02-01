import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';

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
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-slate-800">
        {t('dashboard.hi')}{user?.display_name ? `, ${user.display_name}` : ''}
      </h1>
      <p className="text-slate-600 mb-2">{t('dashboard.subline')}</p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-4">
        <Link
          to="/app/recipes"
          className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <h2 className="font-semibold text-slate-800 mb-1">{t('dashboard.myRecipes')}</h2>
          <p className="text-slate-500 text-sm">
            {isLoading ? '…' : `${(data?.recipes || []).length} ${t('dashboard.saved')}`}
          </p>
        </Link>
        <Link
          to="/app/search"
          className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <h2 className="font-semibold text-slate-800 mb-1">{t('dashboard.discover')}</h2>
          <p className="text-slate-500 text-sm">{t('dashboard.discoverDesc')}</p>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-slate-800">{t('dashboard.recentRecipes')}</h2>
          <Link to="/app/recipes" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {isLoading ? (
          <p className="text-slate-500">{t('common.loading')}</p>
        ) : recentRecipes.length === 0 ? (
          <p className="text-slate-500">
            {t('dashboard.noRecipesYet')}{' '}
            <Link to="/app/search" className="text-brand-600 hover:underline">
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
                className="block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    className="w-full h-32 object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                    {t('common.noImage')}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-slate-800 truncate">{r.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.source_domain && (
                      <>
                        <RecipeSource recipe={r} />
                        <span className="text-slate-400">·</span>
                      </>
                    )}
                    <p className="text-slate-500 text-sm">
                      {r.prep_time != null || r.cook_time != null
                        ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} ${t('recipeDetail.min')}`
                        : t('common.dash')}
                    </p>
                  </div>
                  <RecipeTags recipe={r} className="mt-2 px-3 pb-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

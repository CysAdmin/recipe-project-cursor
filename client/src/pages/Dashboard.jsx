import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';

// Icons
const IconBook = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconSearch = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconClock = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconArrowRight = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['recipes', 'mine', user?.id],
    queryFn: () => recipesApi.list({ mine: '1' }),
    enabled: !!user?.id,
  });

  const recentRecipes = (data?.recipes || []).slice(0, 6);
  const totalRecipes = data?.total ?? data?.recipes?.length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Section */}
      <div className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          {t('dashboard.hi')}{user?.display_name ? `, ${user.display_name}` : ''}
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
          {t('dashboard.subline')}
        </p>
      </div>

      {/* Quick Actions Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* My Recipes Card */}
        <Link
          to="/app/recipes"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <IconBook className="w-6 h-6 text-white" />
              </div>
              <IconArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-xl mb-1">
                {t('dashboard.myRecipes')}
              </h2>
              <p className="text-white/90 text-sm font-medium">
                {isLoading ? '…' : `${totalRecipes} ${t('dashboard.saved')}`}
              </p>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </Link>

        {/* Discover Card */}
        <Link
          to="/app/search"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <IconSearch className="w-6 h-6 text-white" />
              </div>
              <IconArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-xl mb-1">
                {t('dashboard.discover')}
              </h2>
              <p className="text-white/90 text-sm font-medium">
                {t('dashboard.discoverDesc')}
              </p>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </Link>
      </div>

      {/* Recent Recipes Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {t('dashboard.recentRecipes')}
          </h2>
          {recentRecipes.length > 0 && (
            <Link 
              to="/app/recipes" 
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-sm group"
            >
              <span>{t('dashboard.viewAll')}</span>
              <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          </div>
        ) : recentRecipes.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                <IconBook className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {t('dashboard.noRecipesYet')}
              </h3>
              <p className="text-slate-600 text-sm">
                <Link to="/app/search" className="text-brand-600 hover:text-brand-700 font-medium hover:underline">
                  {t('dashboard.discover')}
                </Link>
                {' '}{t('dashboard.discoverOrImport')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRecipes.map((r) => (
              <Link
                key={r.id}
                to={`/app/recipes/${r.id}`}
                className="group block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <IconBook className="w-12 h-12 mb-2" />
                      <span className="text-sm">{t('common.noImage')}</span>
                    </div>
                  )}
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 text-lg line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {r.title}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {r.source_domain && (
                      <>
                        <RecipeSource recipe={r} />
                        <span className="text-slate-300">•</span>
                      </>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <IconClock className="w-4 h-4" />
                      <span>
                        {r.prep_time != null || r.cook_time != null
                          ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} ${t('recipeDetail.min')}`
                          : t('common.dash')}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <RecipeTags recipe={r} className="mt-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

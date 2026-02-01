import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipes as recipesApi } from '../api/client';
import RecipeSource from '../components/RecipeSource';
import RecipeTags from '../components/RecipeTags';
import TagFilterPills from '../components/TagFilterPills';
import { useAuth } from '../context/AuthContext';

export default function Recipes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['recipes', 'mine', user?.id, tagFilter || null],
    queryFn: () => recipesApi.list({ mine: '1', ...(tagFilter && { tag: tagFilter }) }),
    enabled: !!user?.id,
  });

  const importMutation = useMutation({
    mutationFn: (url) => recipesApi.importFromUrl(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'mine', user?.id] });
      setImportUrl('');
      setImportError('');
    },
    onError: (err) => {
      setImportError(err.data?.error || err.message || t('recipes.errorImport'));
    },
  });

  const handleImport = (e) => {
    e.preventDefault();
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true);
    setImportError('');
    importMutation.mutate(url, {
      onSettled: () => setImporting(false),
    });
  };

  const recipes = data?.recipes || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white mb-2">{t('recipes.title')}</h1>
      <p className="text-slate-400 mb-6">{t('recipes.subline')}</p>

      <div className="mb-6">
        <TagFilterPills selectedTag={tagFilter} onSelectTag={setTagFilter} />
      </div>

      <form onSubmit={handleImport} className="mb-8 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="importUrl" className="block text-sm font-medium text-slate-400 mb-1">
            {t('recipes.importFromUrl')}
          </label>
          <input
            id="importUrl"
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder={t('recipes.placeholderUrl')}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={importing || !importUrl.trim()}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {importing ? t('recipes.importing') : t('recipes.import')}
        </button>
        {importError && (
          <p className="w-full text-red-400 text-sm mt-1">{importError}</p>
        )}
      </form>

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : recipes.length === 0 ? (
        <p className="text-slate-500">
          {t('recipes.noRecipesBefore')}
          <Link to="/app/search" className="text-brand-400 hover:underline">
            {t('recipes.discoverLink')}
          </Link>
          {t('recipes.noRecipesAfter')}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Link
              key={r.id}
              to={`/app/recipes/${r.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors"
            >
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt=""
                  className="w-full h-40 object-cover bg-slate-800"
                />
              ) : (
                <div className="w-full h-40 bg-slate-800 flex items-center justify-center text-slate-600">
                  {t('common.noImage')}
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-white truncate">{r.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.source_domain && (
                    <>
                      <RecipeSource recipe={r} />
                      <span className="text-slate-600">·</span>
                    </>
                  )}
                  <p className="text-slate-500 text-sm">
                    {[r.prep_time, r.cook_time].filter(Boolean).length
                      ? `${[r.prep_time, r.cook_time].filter(Boolean).join(' + ')} ${t('recipeDetail.min')}`
                      : t('common.dash')}
                    {r.save_count != null && r.save_count > 1 && ` · ${r.save_count} ${t('recipeDetail.saved')}`}
                  </p>
                </div>
                <RecipeTags recipe={r} className="mt-2" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

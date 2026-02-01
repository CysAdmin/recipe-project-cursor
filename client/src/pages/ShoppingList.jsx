import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { shoppingLists as listApi, recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ShoppingList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState({}); // { recipeId: servings (number) }
  const [generatedItems, setGeneratedItems] = useState([]);

  const { data: recipesData, isLoading: loadingRecipes } = useQuery({
    queryKey: ['recipes', 'mine', user?.id],
    queryFn: () => recipesApi.list({ mine: '1', limit: 500 }),
    enabled: !!user?.id,
  });

  const generateMutation = useMutation({
    mutationFn: (items) => listApi.generateFromRecipes(items),
    onSuccess: (data) => {
      setGeneratedItems(data.items || []);
    },
  });

  const recipes = recipesData?.recipes ?? [];

  const toggleRecipe = (recipeId, servings = 1) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[recipeId] != null) {
        delete next[recipeId];
      } else {
        next[recipeId] = servings;
      }
      return next;
    });
  };

  const setServings = (recipeId, servings) => {
    const n = parseInt(servings, 10);
    if (Number.isNaN(n) || n < 1) return;
    setSelected((prev) => ({ ...prev, [recipeId]: n }));
  };

  const handleGenerate = () => {
    const items = Object.entries(selected)
      .filter(([, s]) => s != null && s >= 1)
      .map(([recipe_id, servings]) => ({ recipe_id: parseInt(recipe_id, 10), servings: servings || 1 }));
    generateMutation.mutate(items);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-slate-800">{t('shoppingList.title')}</h1>
      <p className="text-slate-600 mb-2">{t('shoppingList.sublineSelect')}</p>

      {loadingRecipes ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : recipes.length === 0 ? (
        <p className="text-slate-500 rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          {t('shoppingList.noRecipes')}
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-3">{t('shoppingList.selectRecipes')}</h2>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {recipes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <input
                    type="checkbox"
                    checked={selected[r.id] != null}
                    onChange={(e) => toggleRecipe(r.id, r.servings ?? 1)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="flex-1 text-slate-800 truncate">{r.title}</span>
                  {selected[r.id] != null && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
                      <span>{t('recipeDetail.servings')}</span>
                      <input
                        type="number"
                        min="1"
                        value={selected[r.id] ?? r.servings ?? 1}
                        onChange={(e) => setServings(r.id, e.target.value)}
                        className="w-16 px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 text-sm"
                      />
                    </label>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedCount === 0 || generateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {generateMutation.isPending ? t('shoppingList.generating') : t('shoppingList.generateList')}
              </button>
              {generatedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  {t('shoppingList.printList')}
                </button>
              )}
            </div>
          </div>

          {generateMutation.isError && (
            <p className="text-red-600 text-sm">{generateMutation.error?.data?.error || generateMutation.error?.message}</p>
          )}

          {generatedItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 print:border-0 print:shadow-none">
              <h2 className="font-display text-lg font-semibold text-slate-800 mb-4 print:text-black">
                {t('shoppingList.listTitle')}
              </h2>
              <ul className="space-y-2 list-disc list-inside text-slate-600 print:text-black">
                {generatedItems.map((item, i) => (
                  <li key={i}>{item.raw}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

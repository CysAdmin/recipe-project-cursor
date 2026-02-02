import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collections as collectionsApi } from '../api/client';

/**
 * Modal to choose a collection and add the given recipe to it.
 * Optionally create a new collection and add the recipe.
 */
export default function AddToCollectionModal({ recipe, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createMode, setCreateMode] = useState(false);
  const [newName, setNewName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
    enabled: !!recipe,
  });

  const addRecipeMutation = useMutation({
    mutationFn: ({ collectionId, recipeId }) => collectionsApi.addRecipe(collectionId, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      onClose();
    },
  });

  const createMutation = useMutation({
    mutationFn: (name) => collectionsApi.create({ name }),
    onSuccess: (res) => {
      const collectionId = res.collection?.id;
      if (collectionId && recipe?.id) {
        addRecipeMutation.mutate({ collectionId, recipeId: recipe.id });
      } else {
        onClose();
      }
    },
  });

  const handleAddToCollection = (collectionId) => {
    if (!recipe?.id) return;
    addRecipeMutation.mutate({ collectionId, recipeId: recipe.id });
  };

  const handleCreateAndAdd = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  const collections = data?.collections ?? [];

  if (!recipe) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget && !addRecipeMutation.isPending && !createMutation.isPending) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-collection-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-to-collection-title" className="font-semibold text-slate-800 mb-3">
          {t('addToCollection.title')}
        </h2>

        {createMode ? (
          <form onSubmit={handleCreateAndAdd} className="flex flex-col gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('addToCollection.placeholderName')}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              aria-label={t('addToCollection.placeholderName')}
              disabled={createMutation.isPending}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCreateMode(false)}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !newName.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {createMutation.isPending ? t('common.loading') : t('addToCollection.createNew')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4">
              {isLoading ? (
                <p className="text-slate-500 text-sm">{t('common.loading')}</p>
              ) : collections.length === 0 ? (
                <p className="text-slate-500 text-sm">{t('collections.noCollectionsYet')}</p>
              ) : (
                collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleAddToCollection(c.id)}
                    disabled={addRecipeMutation.isPending}
                    className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-slate-500 text-sm">
                      {t('collections.recipeCount', { count: c.recipe_count ?? 0 })}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreateMode(true)}
              className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              {t('addToCollection.createNew')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

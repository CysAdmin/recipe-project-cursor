import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collections as collectionsApi } from '../api/client';

function IconPlus({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconChevronRight({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Renders up to 4 recipe images as cover for a collection card (2x2 grid when 4, etc.) */
function CollectionCoverImages({ images, t }) {
  const imgs = (images || []).filter(Boolean).slice(0, 4);
  if (imgs.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
        {t('common.noImage')}
      </div>
    );
  }
  if (imgs.length === 1) {
    return (
      <img
        src={imgs[0]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  if (imgs.length === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-px">
        <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
        <img src={imgs[1]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (imgs.length === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-px">
        <img src={imgs[0]} alt="" className="w-full h-full object-cover row-span-2" />
        <img src={imgs[1]} alt="" className="w-full h-full object-cover" />
        <img src={imgs[2]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px">
      {imgs.map((src, i) => (
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function Collections() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => collectionsApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setCreateOpen(false);
      setNewName('');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  const collections = data?.collections ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-800">{t('collections.title')}</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <IconPlus className="w-5 h-5" />
          {t('collections.newCollection')}
        </button>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createMutation.isPending) setCreateOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-collection-title"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 id="create-collection-title" className="font-semibold text-slate-800 mb-3">
              {t('collections.createCollection')}
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('collections.collectionName')}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                aria-label={t('collections.collectionName')}
                disabled={createMutation.isPending}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
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
                  {createMutation.isPending ? t('common.loading') : t('collections.createCollection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : collections.length === 0 ? (
        <p className="text-slate-500">{t('collections.noCollectionsYet')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              to={`/app/collections/${c.id}`}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
            >
              <div className="w-full h-40 bg-slate-100 relative shrink-0">
                {CollectionCoverImages({ images: c.cover_images ?? [], t })}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-slate-800 truncate">{c.name}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {t('collections.recipeCount', { count: c.recipe_count ?? 0 })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

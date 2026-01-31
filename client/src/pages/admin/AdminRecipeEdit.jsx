import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminRecipeEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'recipes', id],
    queryFn: () => admin.recipes.get(id),
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  useEffect(() => {
    if (data?.recipe) {
      const r = data.recipe;
      setTitle(r.title || '');
      setDescription(r.description || '');
      setIngredients(Array.isArray(r.ingredients) ? r.ingredients : []);
      setPrepTime(r.prep_time != null ? String(r.prep_time) : '');
      setCookTime(r.cook_time != null ? String(r.cook_time) : '');
      setServings(r.servings != null ? String(r.servings) : '');
      setImageUrl(r.image_url || '');
      setSourceUrl(r.source_url || '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body) => admin.recipes.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] });
      navigate('/app/admin/recipes');
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      ingredients,
      prep_time: prepTime === '' ? null : parseInt(prepTime, 10),
      cook_time: cookTime === '' ? null : parseInt(cookTime, 10),
      servings: servings === '' ? null : parseInt(servings, 10),
      image_url: imageUrl.trim() || null,
      source_url: sourceUrl.trim() || null,
    };
    saveMutation.mutate(body);
  };

  const addIngredient = () => setIngredients((prev) => [...prev, '']);
  const setIngredient = (index, value) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) return <p className="text-slate-400">{t('admin.loading')}</p>;
  if (!data?.recipe) return <p className="text-red-400">{t('admin.recipeNotFound')}</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold text-white">{t('admin.editRecipe')}</h2>
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.ingredients')}</label>
          <div className="space-y-2">
            {ingredients.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setIngredient(i, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="px-2 text-red-400 hover:underline"
                >
                  {t('common.remove')}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="text-sm text-brand-400 hover:underline"
            >
              {t('admin.addIngredient')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.prepMin')}</label>
            <input
              type="number"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.cookMin')}</label>
            <input
              type="number"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('admin.servings')}</label>
            <input
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Bild-URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Quell-URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/admin/recipes')}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

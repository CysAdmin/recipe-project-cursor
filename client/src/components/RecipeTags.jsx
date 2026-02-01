import React from 'react';
import { useTranslation } from 'react-i18next';

/** Read-only tags for internal recipes. Shows recipe.tags (translated) and "favorite" when recipe.is_favorite. */
export default function RecipeTags({ recipe, className = '' }) {
  const { t } = useTranslation();
  const tags = Array.isArray(recipe?.tags) ? [...recipe.tags] : [];
  if (recipe?.is_favorite && !tags.includes('favorite')) {
    tags.push('favorite');
  }
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((key) => (
        <span
          key={key}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/80 text-slate-300"
        >
          {t(`tags.${key}`)}
        </span>
      ))}
    </div>
  );
}

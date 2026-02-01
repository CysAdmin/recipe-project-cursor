import React from 'react';
import { useTranslation } from 'react-i18next';

const IconCheck = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconHeart = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IconHeartRed = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IconSun = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z" />
  </svg>
);
const IconContainer = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

function TagIcon({ tagKey, isHighlight }) {
  const base = isHighlight ? 'text-white' : '';
  if (tagKey === 'quick' || tagKey === 'easy') return <IconCheck className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? 'text-white' : 'text-brand-600'}`} />;
  if (tagKey === 'after_work' || tagKey === 'vegetarian') return <IconHeart className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? 'text-white' : 'text-brand-600'}`} />;
  if (tagKey === 'comfort_food' || tagKey === 'favorite') return <IconHeartRed className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? 'text-white' : 'text-red-500'}`} />;
  if (tagKey === 'summer') return <IconSun className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? 'text-white' : 'text-amber-500'}`} />;
  if (tagKey === 'reheatable') return <IconContainer className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? 'text-white' : 'text-brand-600'}`} />;
  return null;
}

/** Read-only tags for internal recipes. activeFilter: tag key that is currently selected (shown in green with checkmark). */
export default function RecipeTags({ recipe, activeFilter, className = '' }) {
  const { t } = useTranslation();
  const tags = Array.isArray(recipe?.tags) ? [...recipe.tags] : [];
  if (recipe?.is_favorite && !tags.includes('favorite')) {
    tags.push('favorite');
  }
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((key) => {
        const isHighlight = activeFilter === key;
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
              isHighlight ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-700 border'
            }`}
          >
            <TagIcon tagKey={key} isHighlight={isHighlight} />
            {t(`tags.${key}`)}
          </span>
        );
      })}
    </div>
  );
}

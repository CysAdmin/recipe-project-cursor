import React from 'react';
import { useTranslation } from 'react-i18next';

const RECIPE_TAG_KEYS = ['quick', 'easy', 'after_work', 'vegetarian', 'comfort_food', 'summer', 'reheatable', 'favorite'];

const IconCheck = ({ className = 'w-4 h-4 text-brand-400' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconHeart = ({ className = 'w-4 h-4 text-brand-400' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IconHeartRed = ({ className = 'w-4 h-4 text-red-400' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IconSun = ({ className = 'w-4 h-4 text-amber-400' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
  </svg>
);
const IconContainer = ({ className = 'w-4 h-4 text-brand-400' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

function TagIcon({ tagKey, selected }) {
  if (tagKey === 'quick' || tagKey === 'easy') return <IconCheck className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-brand-600'}`} />;
  if (tagKey === 'after_work' || tagKey === 'vegetarian') return <IconHeart className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-brand-600'}`} />;
  if (tagKey === 'comfort_food' || tagKey === 'favorite') return <IconHeartRed className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-red-500'}`} />;
  if (tagKey === 'summer') return <IconSun className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-amber-500'}`} />;
  if (tagKey === 'reheatable') return <IconContainer className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-brand-600'}`} />;
  return null;
}

/** Pill-style tag filter: one selected tag, "Reset filters" link. */
export default function TagFilterPills({ selectedTag, onSelectTag, className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {RECIPE_TAG_KEYS.map((key) => {
        const selected = selectedTag === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectTag(selected ? '' : key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <TagIcon tagKey={key} selected={selected} />
            <span>{t(`tags.${key}`)}</span>
          </button>
        );
      })}
      {selectedTag && (
        <button
          type="button"
          onClick={() => onSelectTag('')}
          className="ml-1 text-sm text-blue-600 hover:underline"
        >
          {t('recipes.resetFilters')}
        </button>
      )}
    </div>
  );
}

/** Editable tag pills for recipe detail: toggle tags (excluding favorite). */
const EDITABLE_TAG_KEYS = ['quick', 'easy', 'after_work', 'vegetarian', 'comfort_food', 'summer', 'reheatable'];

export function RecipeTagPillsEditable({ tags = [], onTagsChange, disabled = false, className = '' }) {
  const { t } = useTranslation();

  const toggle = (key) => {
    if (disabled) return;
    const next = tags.includes(key) ? tags.filter((k) => k !== key) : [...tags, key];
    onTagsChange(next);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {EDITABLE_TAG_KEYS.map((key) => {
        const selected = tags.includes(key);
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => toggle(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
              selected
                ? 'bg-brand-600 text-white border border-brand-600'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <TagIcon tagKey={key} selected={selected} />
            <span>{t(`tags.${key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export { RECIPE_TAG_KEYS };

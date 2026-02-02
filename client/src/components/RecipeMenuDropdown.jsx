import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function IconDotsVertical({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

/**
 * Three-dots menu for a recipe: Open original, Copy link, Add to collection, Remove.
 * @param {Object} recipe - { id, source_url }
 * @param {boolean} isOpen - whether dropdown is visible
 * @param {function} onToggle - called when button is clicked (e.g. toggle open state)
 * @param {function} onClose - called when menu should close (click outside, or after action)
 * @param {function} onRemove - called when "Remove" is chosen. Parent should call unsave(id) and invalidate/redirect.
 * @param {function} onAddToCollection - called when "Add to collection" is chosen. Parent should open AddToCollectionModal with this recipe.
 */
export default function RecipeMenuDropdown({ recipe, isOpen, onToggle, onClose, onRemove, onAddToCollection }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isOpen, onClose]);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  const handleOpenOriginal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (recipe?.source_url) {
      window.open(recipe.source_url, '_blank');
      onClose();
    }
  };

  const handleCopyLink = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/app/recipes/${recipe?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (_) {
      // ignore
    }
  };

  const handleAddToCollection = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    onAddToCollection?.(recipe);
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(recipe);
    onClose();
  };

  if (!recipe) return null;

  return (
    <div ref={containerRef} className="absolute top-2 right-2 z-10">
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50 text-slate-500 hover:bg-white/90 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
        aria-label={t('recipeMenu.ariaLabel')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <IconDotsVertical />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[10rem] py-1 rounded-lg bg-white border border-slate-200 shadow-lg z-20"
          role="menu"
        >
          {recipe.source_url && (
            <button
              type="button"
              onClick={handleOpenOriginal}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-t-lg"
              role="menuitem"
            >
              {t('recipeMenu.openOriginal')}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 ${!recipe.source_url ? 'rounded-t-lg' : ''}`}
            role="menuitem"
          >
            {copySuccess ? t('recipeMenu.copyLinkSuccess') : t('recipeMenu.copyLink')}
          </button>
          {onAddToCollection && (
            <button
              type="button"
              onClick={handleAddToCollection}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              {t('recipeMenu.addToCollection')}
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
            role="menuitem"
          >
            {t('recipeMenu.remove')}
          </button>
        </div>
      )}
    </div>
  );
}

import React from 'react';

/**
 * Shows favicon + source domain for a recipe (e.g. from AllRecipes, Food Network).
 * Uses recipe.favicon_url if set, else Google favicon service with recipe.source_domain.
 */
export default function RecipeSource({ recipe, className = '' }) {
  const domain = recipe?.source_domain;
  const displayDomain = domain ? domain.replace(/^www\./i, '') : '';
  const faviconUrl = recipe?.favicon_url
    || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null);

  if (!domain) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-slate-500 text-sm ${className}`}>
      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded shrink-0"
          width={16}
          height={16}
        />
      )}
      <span className="truncate">{displayDomain}</span>
    </span>
  );
}

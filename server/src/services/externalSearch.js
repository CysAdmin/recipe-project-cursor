/**
 * External recipe search: aggregates results from external providers.
 * Used when internal (DB) search returns no results on the Discover page.
 * Provider logic is isolated here so it can be extended or replaced later.
 */

import { searchGutekueche } from './providers/gutekueche.js';
import { searchChefkoch } from './providers/chefkoch.js';

/**
 * Normalized external recipe hit (same shape for all providers).
 * @typedef {{ title: string, url: string, image_url?: string, source_name: string, source_domain?: string }} ExternalRecipeHit
 */

/**
 * Shuffle array in place (Fisher-Yates) and return it.
 * @param {ExternalRecipeHit[]} arr
 * @returns {ExternalRecipeHit[]}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PROVIDERS = { gutekueche: searchGutekueche, chefkoch: searchChefkoch };

/**
 * Search a single external provider. Used so the frontend can request each
 * provider separately and show results as soon as the first one returns.
 *
 * @param {string} query - Search term
 * @param {string} providerName - 'gutekueche' | 'chefkoch'
 * @param {{ limit?: number }} options - Optional limit (default 30, max 30)
 * @returns {Promise<ExternalRecipeHit[]>}
 */
export async function searchExternalByProvider(query, providerName, options = {}) {
  const limit = Math.min(options.limit ?? 30, 30);
  const q = String(query || '').trim();
  const fn = PROVIDERS[providerName];
  if (!q || !fn) return [];
  try {
    return await fn(q, { limit });
  } catch (err) {
    console.error(`External search (${providerName}) error:`, err);
    return [];
  }
}

/**
 * Search external recipe sources. Uses GuteKueche.at and Chefkoch.de.
 * All providers are queried; results are merged and shuffled.
 * Prefer using searchExternalByProvider from the frontend so results can
 * be shown as soon as the first provider returns.
 *
 * @param {string} query - Search term
 * @param {{ limit?: number }} options - Optional limit (default 60, max 60)
 * @returns {Promise<ExternalRecipeHit[]>}
 */
export async function searchExternal(query, options = {}) {
  const totalLimit = Math.min(options.limit ?? 60, 60);
  const q = String(query || '').trim();
  if (!q) return [];

  const perProvider = Math.ceil(totalLimit / 2);

  try {
    const [gutekuecheResults, chefkochResults] = await Promise.all([
      searchGutekueche(q, { limit: perProvider }),
      searchChefkoch(q, { limit: perProvider }),
    ]);
    const merged = [...gutekuecheResults, ...chefkochResults];
    return shuffle(merged).slice(0, totalLimit);
  } catch (err) {
    console.error('External search error:', err);
    return [];
  }
}

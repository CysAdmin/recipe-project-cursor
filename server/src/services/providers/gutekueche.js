/**
 * External search provider: GuteKueche.at
 * Fetches and parses the search results page.
 * Recipe URLs follow the pattern: https://www.gutekueche.at/<name>-rezept-<id>
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.gutekueche.at';
const SEARCH_URL = `${BASE_URL}/suche`;
const SOURCE_NAME = 'GuteKueche';

const USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
};

/**
 * Fetch search results HTML from GuteKueche.at
 * @param {string} query - Search term (e.g. "nudeln")
 * @returns {Promise<string>} Raw HTML
 */
export async function fetchSearchPage(query) {
  const url = `${SEARCH_URL}?s=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`GuteKueche search failed: ${res.status}`);
  return res.text();
}

/**
 * Parse GuteKueche search results HTML into a list of recipe hits.
 * @param {string} html - Raw HTML of the search page
 * @param {number} limit - Max number of results to return
 * @returns {{ title: string, url: string, image_url?: string, source_name: string }[]}
 */
export function parseSearchResults(html, limit = 20) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Recipe links: href contains "-rezept-" (e.g. /spaghetti-aglio-e-olio-rezept-12345)
  $('a[href*="-rezept-"]').each((_, el) => {
    if (results.length >= limit) return false; // break
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
    if (!fullUrl.includes('gutekueche.at') || !fullUrl.includes('-rezept-')) return;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    // Skip pagination / filter links (e.g. suche?s=...&group=...)
    if (fullUrl.includes('/suche?')) return;

    let title = $a.attr('title') || $a.text().trim();
    if (!title) {
      const heading = $a.closest('article').find('h2, h3').first().text().trim()
        || $a.closest('div').find('h2, h3').first().text().trim();
      title = heading || fullUrl.replace(/.*\/([^/]+)-rezept-\d+.*/, '$1').replace(/-/g, ' ');
    }
    if (!title) return;

    let image_url = null;
    const pickSrc = ($img) => {
      if (!$img || !$img.length) return null;
      const src = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('src');
      if (!src) return null;
      return src.startsWith('http') ? src : new URL(src, BASE_URL).href;
    };
    const isRecipeImage = (src) => src && src.includes('/storage/media/recipe/') && !src.includes('recipe-category');
    const toAbs = (src) => (src && src.startsWith('http') ? src : src ? new URL(src, BASE_URL).href : null);
    const $parent = $a.closest('article, .recipe-card, .search-result, [class*="recipe"], [class*="result"], .card, div');
    // GuteKueche: recipe image is before the heading (img or wrapper with img), e.g. <img src=".../recipe/103691/conv/..."> or <div><img ...></div> then <h3><a>
    const $heading = $a.closest('h2, h3');
    if ($heading.length) {
      const $prev = $heading.prev();
      if ($prev.length) {
        if ($prev.is('img')) {
          const src = $prev.attr('src') || $prev.attr('data-src');
          if (src && isRecipeImage(src)) image_url = toAbs(src);
        }
        if (!image_url) {
          const $imgInPrev = $prev.find('img[src*="/storage/media/recipe/"]').first();
          const src = $imgInPrev.length ? ($imgInPrev.attr('src') || $imgInPrev.attr('data-src')) : null;
          if (src && isRecipeImage(src)) image_url = toAbs(src);
        }
      }
    }
    if (!image_url) {
      const $prev = $a.prev();
      if ($prev.length && $prev.is('img')) {
        const src = $prev.attr('src') || $prev.attr('data-src');
        if (src && isRecipeImage(src)) image_url = toAbs(src);
      }
    }
    // Smallest ancestor that contains only this one recipe link (= this card), then take its recipe image
    if (!image_url) {
      let $el = $a.parent();
      while ($el.length) {
        if ($el.find('a[href*="-rezept-"]').length === 1) {
          const $img = $el.find('img[src*="/storage/media/recipe/"]').first();
          const src = $img.length ? ($img.attr('src') || $img.attr('data-src')) : null;
          if (src && isRecipeImage(src)) {
            image_url = toAbs(src);
            break;
          }
        }
        $el = $el.parent();
      }
    }
    if (!image_url) image_url = pickSrc($a.find('img').first());
    if (!image_url && $parent.length) {
      const $img = $parent.find('img').first();
      image_url = pickSrc($img);
    }
    const source_domain = new URL(fullUrl).hostname;

    results.push({
      title: title.trim(),
      url: fullUrl,
      image_url: image_url || undefined,
      source_name: SOURCE_NAME,
      source_domain,
    });
  });

  return results;
}

/**
 * Search GuteKueche.at for recipes.
 * @param {string} query - Search term
 * @param {{ limit?: number }} options
 * @returns {Promise<{ title: string, url: string, image_url?: string, source_name: string }[]>}
 */
export async function searchGutekueche(query, options = {}) {
  const limit = Math.min(options.limit ?? 20, 30);
  if (!query || !String(query).trim()) return [];
  const html = await fetchSearchPage(query);
  return parseSearchResults(html, limit);
}

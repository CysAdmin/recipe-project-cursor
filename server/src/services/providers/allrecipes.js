/**
 * External search provider: Allrecipes.com
 * Fetches and parses the search results page.
 * Search URL: https://www.allrecipes.com/search?q=<query>
 * Recipe URLs: https://www.allrecipes.com/recipe/<id>/<slug>/
 * Images: img with data-src or src (e.g. class="card__img ...")
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.allrecipes.com';
const SOURCE_NAME = 'Allrecipes';

const USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

/**
 * Build search URL for Allrecipes. Query is used as query param: ?q=<query>
 * @param {string} query - Search term (e.g. "salad")
 * @returns {string}
 */
function getSearchUrl(query) {
  return `${BASE_URL}/search?q=${encodeURIComponent(query.trim())}`;
}

/**
 * Fetch search results HTML from Allrecipes.com
 * @param {string} query - Search term
 * @returns {Promise<string>} Raw HTML
 */
export async function fetchSearchPage(query) {
  const url = getSearchUrl(query);
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Allrecipes search failed: ${res.status}`);
  return res.text();
}

/**
 * Parse Allrecipes search results HTML into a list of recipe hits.
 * Recipe links: /recipe/<id>/<slug>/
 * Image: img with data-src or src (card__img or nearby)
 *
 * @param {string} html - Raw HTML of the search page
 * @param {number} limit - Max number of results to return
 * @returns {{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]}
 */
export function parseSearchResults(html, limit = 20) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Recipe links: href contains "/recipe/" and numeric id (e.g. /recipe/16729/old-fashioned-potato-salad/)
  $('a[href*="/recipe/"]').each((_, el) => {
    if (results.length >= limit) return false;
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
    if (!fullUrl.includes('allrecipes.com') || !/\/recipe\/\d+\//.test(fullUrl)) return;
    const urlWithoutHash = fullUrl.split('#')[0].replace(/\/+$/, '') || fullUrl.split('#')[0];
    if (seen.has(urlWithoutHash)) return;
    seen.add(urlWithoutHash);

    // Slug from URL is always reliable (e.g. /recipe/16729/old-fashioned-potato-salad/ → "Old Fashioned Potato Salad")
    const slugMatch = urlWithoutHash.match(/\/recipe\/\d+\/([^/]+)\/?/);
    const slugTitle = slugMatch
      ? slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : null;

    const cleanRatings = (s) =>
      (s || '')
        .trim()
        .replace(/\s*\d{1,3}(,\d{3})*\s*Ratings?\s*$/i, '')
        .trim();

    // Reject strings that look like HTML or URLs (e.g. "<img src="...">" or attribute leakage)
    const isValidTitle = (s) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      return t.length > 0 && t.length < 200 && !/<|>|src=|href=/i.test(t) && !/^https?:\/\//i.test(t);
    };

    const candidates = [
      cleanRatings($a.attr('title')),
      cleanRatings($a.text()),
      cleanRatings($a.find('span').first().text()),
      cleanRatings($a.closest('article').find('h2, h3').first().text()),
      cleanRatings($a.closest('div').find('h2, h3').first().text()),
    ];
    let title = candidates.find((c) => isValidTitle(c)) || slugTitle || 'Recipe';
    title = title.trim() || slugTitle || 'Recipe';

    let image_url = null;
    const pickSrc = ($img) => {
      if (!$img || !$img.length) return null;
      const src = $img.attr('data-src') || $img.attr('src');
      if (!src) return null;
      return src.startsWith('http') ? src : new URL(src, BASE_URL).href;
    };
    const $parent = $a.closest('article, [class*="card"], [class*="recipe"], [class*="search"], div');
    if ($parent.length) {
      const $img = $parent.find('img[data-src], img[src]').first();
      image_url = pickSrc($img);
    }
    if (!image_url) image_url = pickSrc($a.find('img').first());

    const source_domain = new URL(urlWithoutHash).hostname;
    results.push({
      title,
      url: urlWithoutHash,
      image_url: image_url || undefined,
      source_name: SOURCE_NAME,
      source_domain,
    });
  });

  return results;
}

/**
 * Search Allrecipes.com for recipes.
 * @param {string} query - Search term
 * @param {{ limit?: number }} options
 * @returns {Promise<{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]>}
 */
export async function searchAllrecipes(query, options = {}) {
  const limit = Math.min(options.limit ?? 20, 30);
  if (!query || !String(query).trim()) return [];
  const html = await fetchSearchPage(query);
  return parseSearchResults(html, limit);
}

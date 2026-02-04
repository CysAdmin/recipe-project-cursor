/**
 * External search provider: Food Network UK (foodnetwork.co.uk)
 * Fetches and parses the search results page.
 * Search URL: https://foodnetwork.co.uk/search?q=<query>
 * Recipe URLs: https://foodnetwork.co.uk/recipes/<slug>
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://foodnetwork.co.uk';
const SOURCE_NAME = 'Food Network UK';

const USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

function getSearchUrl(query) {
  return `${BASE_URL}/search?q=${encodeURIComponent(query.trim())}`;
}

/**
 * Fetch search results HTML from Food Network UK
 * @param {string} query - Search term
 * @returns {Promise<string>} Raw HTML
 */
export async function fetchSearchPage(query) {
  const url = getSearchUrl(query);
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Food Network UK search failed: ${res.status}`);
  return res.text();
}

/**
 * Parse Food Network UK search results HTML into a list of recipe hits.
 * Recipe links: /recipes/<slug> (e.g. /recipes/baked-penne-with-roasted-vegetables)
 * @param {string} html - Raw HTML of the search page
 * @param {number} limit - Max number of results to return
 * @returns {{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]}
 */
export function parseSearchResults(html, limit = 20) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Recipe links: /recipes/<slug> (exclude /recipes only, /collections, /search)
  $('a[href*="/recipes/"]').each((_, el) => {
    if (results.length >= limit) return false;
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
    if (!fullUrl.includes('foodnetwork.co.uk')) return;
    const path = new URL(fullUrl).pathname.replace(/\/+$/, '') || '/';
    if (path === '/recipes' || path === '/recipes/') return;
    if (path.includes('/collections/')) return;
    const urlWithoutHash = fullUrl.split('#')[0].replace(/\/+$/, '') || fullUrl.split('#')[0];
    if (seen.has(urlWithoutHash)) return;
    seen.add(urlWithoutHash);

    const isValidTitle = (s) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      return t.length > 0 && t.length < 300 && !/<|>|src=|href=/i.test(t) && !/^https?:\/\//i.test(t);
    };

    const candidates = [
      $a.attr('title'),
      $a.text(),
      $a.closest('article').find('h2, h3').first().text(),
      $a.closest('div').find('h2, h3').first().text(),
    ];
    let title = candidates.find((c) => isValidTitle(c))?.trim();
    if (!title) {
      const slugMatch = path.match(/\/recipes\/([^/]+)/);
      const slug = slugMatch ? slugMatch[1] : '';
      title = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Recipe';
    }

    let image_url = null;
    const pickSrc = ($img) => {
      if (!$img || !$img.length) return null;
      const src = $img.attr('src') || $img.attr('data-src');
      if (src) return src.startsWith('http') ? src : new URL(src, BASE_URL).href;
      const srcset = $img.attr('srcset');
      if (srcset) {
        const first = srcset.split(',')[0].trim().split(/\s+/)[0];
        if (first) return first.startsWith('http') ? first : new URL(first, BASE_URL).href;
      }
      return null;
    };
    const $parent = $a.closest('article, [class*="card"], [class*="recipe"], [class*="search"], div');
    if ($parent.length) {
      const $img = $parent.find('img[src], img[data-src], img[srcset]').first();
      image_url = pickSrc($img);
    }
    if (!image_url) image_url = pickSrc($a.find('img').first());

    const source_domain = new URL(urlWithoutHash).hostname;
    results.push({
      title: title.trim() || 'Recipe',
      url: urlWithoutHash,
      image_url: image_url || undefined,
      source_name: SOURCE_NAME,
      source_domain,
    });
  });

  return results;
}

/**
 * Search Food Network UK for recipes.
 * @param {string} query - Search term
 * @param {{ limit?: number }} options
 * @returns {Promise<{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]>}
 */
export async function searchFoodnetworkuk(query, options = {}) {
  const limit = Math.min(options.limit ?? 20, 30);
  if (!query || !String(query).trim()) return [];
  const html = await fetchSearchPage(query);
  return parseSearchResults(html, limit);
}

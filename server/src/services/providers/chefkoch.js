/**
 * External search provider: Chefkoch.de
 * Fetches and parses the search results page.
 * Search URL: https://www.chefkoch.de/rs/s0/<query>/Rezepte.html
 * Recipe URLs: https://www.chefkoch.de/rezepte/<id>/<slug>.html
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.chefkoch.de';
const SOURCE_NAME = 'Chefkoch';

const USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
};

/**
 * Build search URL for Chefkoch. Query is used in path: /rs/s0/<query>/Rezepte.html
 * @param {string} query - Search term (e.g. "nudeln")
 * @returns {string}
 */
function getSearchUrl(query) {
  const segment = encodeURIComponent(query.trim().toLowerCase().replace(/\s+/g, '-'));
  return `${BASE_URL}/rs/s0/${segment}/Rezepte.html`;
}

/**
 * Fetch search results HTML from Chefkoch.de
 * @param {string} query - Search term
 * @returns {Promise<string>} Raw HTML
 */
export async function fetchSearchPage(query) {
  const url = getSearchUrl(query);
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Chefkoch search failed: ${res.status}`);
  return res.text();
}

/**
 * Parse Chefkoch search results HTML into a list of recipe hits.
 * Recipe links: /rezepte/<id>/<slug>.html
 * @param {string} html - Raw HTML of the search page
 * @param {number} limit - Max number of results to return
 * @returns {{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]}
 */
export function parseSearchResults(html, limit = 20) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Recipe links: href contains "/rezepte/" and numeric id (e.g. /rezepte/123456/Recipe-Name.html)
  $('a[href*="/rezepte/"]').each((_, el) => {
    if (results.length >= limit) return false;
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
    // Must be chefkoch.de and path like /rezepte/<id>/<slug>.html
    if (!fullUrl.includes('chefkoch.de') || !/\/rezepte\/\d+\//.test(fullUrl)) return;
    // Canonical URL without hash (for import)
    const urlWithoutHash = fullUrl.split('#')[0];
    if (seen.has(urlWithoutHash)) return;
    seen.add(urlWithoutHash);

    let title = $a.attr('title') || $a.text().trim();
    if (!title) {
      const heading = $a.closest('article').find('h2, h3').first().text().trim()
        || $a.closest('div').find('h2, h3').first().text().trim();
      title = heading;
    }
    if (!title) {
      const slug = urlWithoutHash.replace(/.*\/rezepte\/\d+\/([^/]+)\.html.*/, '$1');
      title = slug ? slug.replace(/-/g, ' ') : 'Rezept';
    }

    let image_url = null;
    const pickSrc = ($img) => {
      if (!$img || !$img.length) return null;
      const src = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('src');
      if (!src) return null;
      return src.startsWith('http') ? src : new URL(src, BASE_URL).href;
    };
    const $parent = $a.closest('article, [class*="recipe"], [class*="card"], [class*="search"], div');
    if ($parent.length) {
      const $img = $parent.find('img[src], img[data-src], img[data-lazy-src]').first();
      image_url = pickSrc($img);
    }
    if (!image_url) image_url = pickSrc($a.find('img').first());
    if (!image_url && $parent.length) {
      image_url = pickSrc($parent.find('img').first());
    }

    const source_domain = new URL(urlWithoutHash).hostname;
    const cleanTitle = title.trim().replace(/\s*Zum Rezept\s*/gi, '').trim() || title.trim();

    results.push({
      title: cleanTitle,
      url: urlWithoutHash,
      image_url: image_url || undefined,
      source_name: SOURCE_NAME,
      source_domain,
    });
  });

  return results;
}

/**
 * Search Chefkoch.de for recipes.
 * @param {string} query - Search term
 * @param {{ limit?: number }} options
 * @returns {Promise<{ title: string, url: string, image_url?: string, source_name: string, source_domain: string }[]>}
 */
export async function searchChefkoch(query, options = {}) {
  const limit = Math.min(options.limit ?? 20, 30);
  if (!query || !String(query).trim()) return [];
  const html = await fetchSearchPage(query);
  return parseSearchResults(html, limit);
}

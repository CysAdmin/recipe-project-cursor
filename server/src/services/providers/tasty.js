/**
 * External search provider: Tasty.co (BuzzFeed Tasty)
 * Fetches and parses the search results page.
 * Search URL: https://tasty.co/search?q=<query>&sort=popular
 * Recipe URLs: https://tasty.co/recipe/<slug>
 * Images: img with src (often buzzfeed.com thumbnailer)
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://tasty.co';
const SOURCE_NAME = 'Tasty';

const USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: `${BASE_URL}/`,
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function getSearchUrl(query) {
  return `${BASE_URL}/search?q=${encodeURIComponent(query.trim())}&sort=popular`;
}

export async function fetchSearchPage(query) {
  const url = getSearchUrl(query);
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });
  // Tasty often returns 406/403 for server requests (bot detection); fail silently and return no results
  if (!res.ok) {
    if (res.status === 406 || res.status === 403 || res.status === 429) return '';
    throw new Error(`Tasty search failed: ${res.status}`);
  }
  return res.text();
}

/**
 * Parse Tasty search results HTML.
 * Recipe links: /recipe/<slug> (e.g. /recipe/southwestern-taco-salad)
 * Image: img src or first src from srcset (buzzfeed.com thumbnailer)
 */
export function parseSearchResults(html, limit = 20) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  $('a[href*="/recipe/"]').each((_, el) => {
    if (results.length >= limit) return false;
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
    if (!fullUrl.includes('tasty.co') || !/\/recipe\/[^/]+/.test(fullUrl)) return;
    const urlWithoutHash = fullUrl.split('#')[0].replace(/\/+$/, '') || fullUrl.split('#')[0];
    if (seen.has(urlWithoutHash)) return;
    seen.add(urlWithoutHash);

    const isValidTitle = (s) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      return t.length > 0 && t.length < 200 && !/<|>|src=|href=/i.test(t) && !/^https?:\/\//i.test(t);
    };

    let title = $a.attr('title')?.trim() || $a.text().trim();
    if (!isValidTitle(title)) {
      const heading = $a.closest('article').find('h2, h3').first().text().trim()
        || $a.closest('div').find('h2, h3').first().text().trim();
      title = isValidTitle(heading) ? heading : null;
    }
    if (!title) {
      const slug = urlWithoutHash.replace(/.*\/recipe\/([^/]+)\/?.*/, '$1');
      title = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Recipe';
    }
    title = title.trim() || 'Recipe';

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
      const $img = $parent.find('img[src], img[data-src]').first();
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

export async function searchTasty(query, options = {}) {
  const limit = Math.min(options.limit ?? 20, 30);
  if (!query || !String(query).trim()) return [];
  const html = await fetchSearchPage(query);
  return parseSearchResults(html, limit);
}

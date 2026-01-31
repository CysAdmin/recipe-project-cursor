import * as cheerio from 'cheerio';

/**
 * Extract favicon URL from page HTML. Resolves relative hrefs against baseUrl.
 * @param {string} html - Raw HTML of the page
 * @param {string} baseUrl - Page URL (e.g. https://www.allrecipes.com/recipe/123/)
 * @returns {string|null} Absolute favicon URL or null
 */
export function extractFaviconFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl.replace(/\/[^/]*$/, '/');
  const resolve = (href) => {
    if (!href || typeof href !== 'string') return null;
    const trimmed = href.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return new URL(trimmed, new URL(baseUrl).origin).href;
    return new URL(trimmed, base).href;
  };
  const selectors = [
    'link[rel="icon"][href]',
    'link[rel="shortcut icon"][href]',
    'link[rel="apple-touch-icon"][href]',
  ];
  for (const sel of selectors) {
    const href = $(sel).attr('href');
    if (href) return resolve(href);
  }
  return null;
}

/**
 * Parse recipe from HTML using Schema.org Recipe JSON-LD (preferred) or fallback heuristics.
 * @param {string} html - Raw HTML of the page
 * @param {string} sourceUrl - Original URL for attribution
 * @returns {{ title: string, description?: string, ingredients: string[], prep_time?: number, cook_time?: number, servings?: number, image_url?: string } | null}
 */
export function parseRecipeFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  // 1. Try JSON-LD Schema.org Recipe
  const jsonLd = extractSchemaOrgRecipe($);
  if (jsonLd) {
    return normalizeParsedRecipe(jsonLd, sourceUrl);
  }

  // 2. Fallback: common selectors used by recipe sites
  const fallback = extractWithSelectors($);
  if (fallback) {
    return normalizeParsedRecipe(fallback, sourceUrl);
  }

  return null;
}

function extractSchemaOrgRecipe($) {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const recipe = item['@type'] === 'Recipe' ? item : item['@graph']?.find((n) => n['@type'] === 'Recipe');
        const r = recipe || (Array.isArray(item) ? item.find((n) => n['@type'] === 'Recipe') : null);
        if (r) return schemaToPlain(r);
      }
    } catch {
      // skip invalid JSON
    }
  }
  return null;
}

function schemaToPlain(schema) {
  const text = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : '');
  const num = (v) => (typeof v === 'number' ? v : parseInt(String(v).replace(/\D/g, ''), 10) || undefined);
  const image = (v) => {
    if (typeof v === 'string') return v;
    if (v?.url) return v.url;
    if (Array.isArray(v) && v[0]) return typeof v[0] === 'string' ? v[0] : v[0].url;
    return undefined;
  };

  let ingredients = schema.recipeIngredient;
  if (!Array.isArray(ingredients)) ingredients = ingredients ? [ingredients] : [];

  const prep = schema.prepTime ? parseISO8601Duration(schema.prepTime) : undefined;
  const cook = schema.cookTime ? parseISO8601Duration(schema.cookTime) : undefined;

  return {
    title: text(schema.name),
    description: text(schema.description),
    ingredients,
    prep_time: num(schema.prepTime) ?? prep,
    cook_time: num(schema.cookTime) ?? cook,
    servings: num(schema.recipeYield),
    image_url: image(schema.image),
  };
}

function parseISO8601Duration(str) {
  if (typeof str !== 'string') return undefined;
  const match = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

function extractWithSelectors($) {
  const selectors = {
    title: ['h1', '[class*="recipe-title"]', '[itemprop="name"]', 'meta[property="og:title"]'],
    description: ['[itemprop="description"]', '[class*="recipe-description"]', 'meta[property="og:description"]'],
    ingredients: ['[itemprop="recipeIngredient"]', '[class*="ingredient"] li', '.ingredients li', '[class*="recipe-ingredient"]'],
    image: ['meta[property="og:image"]', '[itemprop="image"]', 'img[class*="recipe"]'],
  };

  const title =
    $(selectors.title.join(', ')).first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim();
  if (!title) return null;

  let description = $(selectors.description.join(', ')).first().text().trim();
  if (!description) description = $('meta[property="og:description"]').attr('content') || '';

  const ingredientEls = $(selectors.ingredients.join(', '));
  const ingredients = [];
  ingredientEls.each((_, el) => {
    const t = $(el).text().trim();
    if (t) ingredients.push(t);
  });

  let image_url = $('meta[property="og:image"]').attr('content');
  if (!image_url) {
    const img = $(selectors.image.join(', ')).first();
    image_url = img.attr('content') || img.attr('src');
  }

  return {
    title,
    description: description || undefined,
    ingredients,
    image_url: image_url || undefined,
  };
}

function normalizeParsedRecipe(parsed, sourceUrl) {
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
    : typeof parsed.ingredients === 'string'
      ? [parsed.ingredients]
      : [];
  return {
    title: String(parsed.title || 'Untitled Recipe').trim(),
    description: parsed.description ? String(parsed.description).trim() : undefined,
    ingredients: ingredients.filter(Boolean).map((i) => String(i).trim()),
    prep_time: typeof parsed.prep_time === 'number' ? parsed.prep_time : undefined,
    cook_time: typeof parsed.cook_time === 'number' ? parsed.cook_time : undefined,
    servings: typeof parsed.servings === 'number' ? parsed.servings : undefined,
    image_url: parsed.image_url ? String(parsed.image_url).trim() : undefined,
    source_url: sourceUrl,
  };
}

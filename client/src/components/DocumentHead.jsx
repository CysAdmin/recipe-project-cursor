import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ROUTE_CONFIG = [
  { key: 'home', pattern: /^\/$/, canonical: '/', addJsonLd: true },
  { key: 'login', pattern: /^\/login$/, canonical: '/login' },
  { key: 'register', pattern: /^\/register$/, canonical: '/register' },
  { key: 'forgotPassword', pattern: /^\/forgot-password$/, canonical: '/forgot-password' },
  { key: 'resetPassword', pattern: /^\/reset-password$/, canonical: '/reset-password' },
  { key: 'verifyEmail', pattern: /^\/verify-email$/, canonical: '/verify-email' },
  { key: 'publicRecipe', pattern: /^\/recipes\/\d+$/, getCanonical: (pathname) => pathname },
];

const getAppUrl = () => {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
};

const APP_URL = getAppUrl();

const ensureLeadingSlash = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const upsertTag = (selector, create) => {
  let element = document.querySelector(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  return element;
};

export default function DocumentHead() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const routeConfig = useMemo(() => {
    return ROUTE_CONFIG.find((route) => route.pattern.test(location.pathname)) ?? {
      key: 'default',
      canonical: location.pathname,
    };
  }, [location.pathname]);

  const title = t(`seo.pageTitles.${routeConfig.key}`, t('seo.pageTitles.default'));
  const description = t(`seo.descriptions.${routeConfig.key}`, t('seo.descriptions.default'));

const canonicalPath =
  routeConfig.getCanonical?.(location.pathname) ??
  routeConfig.canonical ??
  location.pathname;

const canonicalUrl = APP_URL
  ? `${APP_URL}${ensureLeadingSlash(canonicalPath)}`
  : undefined;

  useEffect(() => {
    document.title = title;

    if (description) {
      const metaDescription = upsertTag('meta[name="description"]', () => {
        const tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        return tag;
      });
      metaDescription.setAttribute('content', description);
    }

    const ogTitle = upsertTag('meta[property="og:title"]', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:title');
      return tag;
    });
    ogTitle.setAttribute('content', title);

    const ogDescription = upsertTag('meta[property="og:description"]', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:description');
      return tag;
    });
    ogDescription.setAttribute('content', description);

    const ogUrl = upsertTag('meta[property="og:url"]', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('property', 'og:url');
      return tag;
    });
    ogUrl.setAttribute('content', canonicalUrl || window.location.href);

    const twitterTitle = upsertTag('meta[name="twitter:title"]', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:title');
      return tag;
    });
    twitterTitle.setAttribute('content', title);

    const twitterDescription = upsertTag('meta[name="twitter:description"]', () => {
      const tag = document.createElement('meta');
      tag.setAttribute('name', 'twitter:description');
      return tag;
    });
    twitterDescription.setAttribute('content', description);

    const canonicalLink = upsertTag('link[rel="canonical"]', () => {
      const tag = document.createElement('link');
      tag.setAttribute('rel', 'canonical');
      return tag;
    });
    canonicalLink.setAttribute('href', canonicalUrl || window.location.href);

    const jsonLdId = 'seo-json-ld';
    const existingJsonLd = document.getElementById(jsonLdId);

    if (routeConfig.addJsonLd && canonicalUrl) {
      const jsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'SimplyKeepIt',
        url: canonicalUrl,
        description,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: i18n.language,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
      };

      const scriptTag =
        existingJsonLd ||
        (() => {
          const tag = document.createElement('script');
          tag.type = 'application/ld+json';
          tag.id = jsonLdId;
          document.head.appendChild(tag);
          return tag;
        })();

      scriptTag.textContent = JSON.stringify(jsonLdData);
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }
  }, [title, description, canonicalUrl, routeConfig.addJsonLd, i18n.language]);

  return null;
}

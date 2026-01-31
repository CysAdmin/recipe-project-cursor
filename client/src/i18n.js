/**
 * i18n setup for multi-language UI.
 * Language is stored in localStorage (app_lang). User can change it in Profile & Settings.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

const STORAGE_KEY = 'app_lang';
const supportedLngs = ['de', 'en'];

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supportedLngs.includes(stored)) return stored;
  } catch (_) {}
  return undefined; // will use fallbackLng
}

i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: getStoredLanguage(),
  fallbackLng: 'de',
  supportedLngs,
  interpolation: { escapeValue: false },
});

export { STORAGE_KEY, supportedLngs };

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="font-display font-bold text-xl text-slate-800 hover:text-brand-600">
            {t('common.appName')}
          </Link>
          <Link
            to="/"
            className="text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            {t('privacy.backToHome')}
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-8">
          {t('privacy.title')}
        </h1>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <p className="lead">{t('privacy.intro')}</p>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.controllerTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.controller')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.dataTitle')}
            </h2>
            <p>{t('privacy.dataIntro')}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t('privacy.dataAccount')}</li>
              <li>{t('privacy.dataRecipes')}</li>
              <li>{t('privacy.dataCollections')}</li>
              <li>{t('privacy.dataAdmin')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.purposeTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.purpose')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.emailTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.email')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.retentionTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.retention')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.rightsTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.rights')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.cookiesTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.cookies')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-2">
              {t('privacy.changesTitle')}
            </h2>
            <p className="whitespace-pre-line">{t('privacy.changes')}</p>
          </section>
        </div>
        <p className="mt-10">
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            ← {t('privacy.backToHome')}
          </Link>
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <Link to="/datenschutz" className="hover:text-slate-700">{t('landing.privacy')}</Link>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const FEATURE_ICONS = ['🔍', '📚', '🏷️', '⚡', '🍽️', '💾'];

export default function Landing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="font-display font-bold text-xl text-slate-800">{t('common.appName')}</div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/app"
                className="px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
              >
                {t('landing.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  {t('landing.logIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
                >
                  {t('landing.signUp')}
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-6">
            {t('landing.headline')}
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl leading-relaxed mb-10">
            {t('landing.subline')}
          </p>
          {!user && (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
              >
                {t('landing.getStartedFree')}
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                {t('landing.learnMore')}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 sm:px-6 py-16 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            {t('landing.featuresTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4" aria-hidden>
                  {FEATURE_ICONS[i - 1]}
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{t(`landing.feature${i}Title`)}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{t(`landing.feature${i}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="px-4 sm:px-6 py-16 sm:py-20 text-center bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">{t('landing.ctaTitle')}</h2>
            <p className="text-slate-600 text-lg mb-8">{t('landing.ctaSubline')}</p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
            >
              {t('landing.ctaButton')}
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-2">
          <Link to="/datenschutz" className="hover:text-slate-700">{t('landing.privacy')}</Link>
        </div>
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  );
}

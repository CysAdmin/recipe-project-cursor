import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const FEATURE_ICONS = ['🔖', '📚', '🏷️', '⚡', '🍽️', '💾'];

export default function Landing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="font-display font-bold text-2xl bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            {t('common.appName')}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/app"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg hover:shadow-xl"
              >
                {t('landing.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:block px-6 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  {t('landing.logIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {t('landing.signUp')}
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-20 sm:py-32 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
            ✨ {t('landing.badge')}
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
            {t('landing.headline')}
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl lg:text-2xl leading-relaxed mb-10 max-w-2xl mx-auto">
            {t('landing.subline')}
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                {t('landing.getStartedFree')}
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                {t('landing.learnMore')}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 sm:px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 hover:scale-105"
              >
                <div className="text-5xl mb-6" aria-hidden>
                  {FEATURE_ICONS[i - 1]}
                </div>
                <h3 className="font-display font-bold text-slate-900 text-xl mb-3">
                  {t(`landing.feature${i}Title`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {t(`landing.feature${i}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="px-4 sm:px-6 py-20 sm:py-24 text-center relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-600 -z-10"></div>
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 -z-10"></div>
          
          <div className="max-w-3xl mx-auto relative">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-brand-50 text-lg sm:text-xl mb-10 leading-relaxed">
              {t('landing.ctaSubline')}
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-10 py-5 rounded-xl bg-white text-brand-600 font-bold text-lg hover:bg-slate-50 transition-all shadow-2xl hover:shadow-xl hover:scale-105"
            >
              {t('landing.ctaButton')}
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="font-display font-bold text-xl text-white">
              {t('common.appName')}
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/datenschutz" className="hover:text-white transition-colors">
                {t('landing.privacy')}
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm">
            <p>{t('landing.footer')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

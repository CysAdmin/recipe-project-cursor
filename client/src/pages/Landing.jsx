import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header: clear contrast on light */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <span className="font-display font-bold text-xl text-brand-600">{t('common.appName')}</span>
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <Link
                to="/app"
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors shadow-sm"
              >
                {t('landing.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-xl text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {t('landing.logIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors shadow-sm"
                >
                  {t('landing.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero: high-contrast text, subtle gradient background */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24 relative overflow-hidden">
        {/* Soft decorative gradient blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
        >
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-brand-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-100/50 rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-2xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
            {t('landing.headline')}
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            {t('landing.subline')}
          </p>
          {!user && (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30"
              >
                {t('landing.getStartedFree')}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                {t('landing.logIn')}
              </Link>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
        {t('landing.footer')}
      </footer>
    </div>
  );
}

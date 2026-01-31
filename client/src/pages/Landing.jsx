import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <span className="font-display font-bold text-xl text-brand-400">{t('common.appName')}</span>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/app"
                className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
              >
                {t('landing.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
                  {t('landing.logIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
                >
                  {t('landing.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            {t('landing.headline')}
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            {t('landing.subline')}
          </p>
          {!user && (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
              >
                {t('landing.getStartedFree')}
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
              >
                {t('landing.logIn')}
              </Link>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        {t('landing.footer')}
      </footer>
    </div>
  );
}

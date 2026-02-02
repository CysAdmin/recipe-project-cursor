import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import IdleTracker from './IdleTracker';

function IconHome({ className = 'w-6 h-6', active }) {
  const c = active ? 'text-brand-600' : 'text-slate-400';
  return (
    <svg className={`${className} ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function IconBook({ className = 'w-6 h-6', active }) {
  const c = active ? 'text-brand-600' : 'text-slate-400';
  return (
    <svg className={`${className} ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconSearch({ className = 'w-6 h-6', active }) {
  const c = active ? 'text-brand-600' : 'text-slate-400';
  return (
    <svg className={`${className} ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconUser({ className = 'w-6 h-6', active }) {
  const c = active ? 'text-brand-600' : 'text-slate-400';
  return (
    <svg className={`${className} ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const nav = [
    { to: '/app', end: true, labelKey: 'nav.dashboard' },
    { to: '/app/recipes', end: false, labelKey: 'nav.myRecipes' },
    { to: '/app/search', end: true, labelKey: 'nav.discover' },
    { to: '/app/admin', end: false, labelKey: 'nav.admin', adminOnly: true },
  ];

  const bottomNavItems = [
    { to: '/app', end: true, labelKey: 'nav.dashboard', Icon: IconHome },
    { to: '/app/recipes', end: false, labelKey: 'nav.myRecipes', Icon: IconBook },
    { to: '/app/search', end: true, labelKey: 'nav.discover', Icon: IconSearch },
    { to: '/app/profile', end: true, labelKey: 'nav.profile', Icon: IconUser },
  ];

  const handleLogout = () => {
    queryClient.removeQueries({ queryKey: ['recipes'] });
    queryClient.removeQueries({ queryKey: ['recipe'] });
    logout();
    navigate('/');
  };

  return (
    <>
      <IdleTracker />
      <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top header: full nav on desktop, logo + Profil on mobile */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <NavLink to="/app" className="font-display font-bold text-xl text-slate-800 hover:text-brand-600">
            {t('common.appName')}
          </NavLink>

          {/* Desktop nav + user (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ to, end, labelKey, adminOnly }) =>
              adminOnly && !user?.is_admin ? null : (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {t(labelKey)}
                </NavLink>
              )
            )}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'text-brand-600 font-medium' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              {user?.display_name || user?.email}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 text-sm"
            >
              {t('nav.logout')}
            </button>
          </div>

          {/* Mobile: only Profil link (logout is on Profile page) */}
          <div className="flex md:hidden items-center">
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-brand-600' : 'text-slate-600'}`
              }
            >
              {t('nav.profile')}
            </NavLink>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom navigation (only on small screens) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200"
        aria-label={t('nav.dashboard')}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {bottomNavItems.map(({ to, end, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} className="w-6 h-6 shrink-0" />
                  <span className="text-xs font-medium">{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      </div>
    </>
  );
}

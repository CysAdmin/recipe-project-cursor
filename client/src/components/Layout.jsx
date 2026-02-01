import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const nav = [
    { to: '/app', end: true, labelKey: 'nav.dashboard' },
    { to: '/app/recipes', end: false, labelKey: 'nav.myRecipes' },
    { to: '/app/search', end: true, labelKey: 'nav.discover' },
    { to: '/app/shopping-list', end: true, labelKey: 'nav.shoppingList' },
    { to: '/app/admin', end: false, labelKey: 'nav.admin', adminOnly: true },
  ];

  const handleLogout = () => {
    queryClient.removeQueries({ queryKey: ['recipes'] });
    queryClient.removeQueries({ queryKey: ['recipe'] });
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <NavLink to="/app" className="font-display font-bold text-xl text-slate-800 hover:text-brand-600">
            {t('common.appName')}
          </NavLink>
          <nav className="flex items-center gap-1">
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
          <div className="flex items-center gap-3">
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
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

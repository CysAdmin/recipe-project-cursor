import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const adminNav = [
    { to: '/app/admin/users', end: false, label: t('admin.users') },
    { to: '/app/admin/recipes', end: true, label: t('admin.recipes') },
  ];
  if (loading) return <div className="p-4 text-slate-400">{t('admin.loading')}</div>;
  if (!user?.is_admin) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-white">{t('admin.title')}</h1>
        <nav className="flex gap-2">
          {adminNav.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium ${
                  isActive ? 'bg-brand-600/30 text-brand-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

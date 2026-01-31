import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/app', end: true, label: 'Dashboard' },
  { to: '/app/recipes', end: false, label: 'My Recipes' },
  { to: '/app/search', end: true, label: 'Discover' },
  { to: '/app/meal-plan', end: true, label: 'Meal Plan' },
  { to: '/app/shopping-list', end: true, label: 'Shopping List' },
  { to: '/app/admin', end: false, label: 'Admin', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.removeQueries({ queryKey: ['recipes'] });
    queryClient.removeQueries({ queryKey: ['meal-schedules'] });
    queryClient.removeQueries({ queryKey: ['recipe'] });
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <NavLink to="/app" className="font-display font-bold text-xl text-brand-400">
            Recipe Planner
          </NavLink>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, end, label, adminOnly }) =>
              adminOnly && !user?.is_admin ? null : (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-600/20 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              )
            )}
          </nav>
          <div className="flex items-center gap-3">
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-200'}`
              }
            >
              {user?.display_name || user?.email}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              Log out
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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import Layout from './components/Layout';
import DocumentHead from './components/DocumentHead';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import RecipeByIngredients from './pages/RecipeByIngredients';
import RecipeDetail from './pages/RecipeDetail';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import Search from './pages/Search';
import Profile from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserForm from './pages/admin/AdminUserForm';
import AdminRecipes from './pages/admin/AdminRecipes';
import AdminRecipeEdit from './pages/admin/AdminRecipeEdit';

function PrivateRoute({ children }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">{t('app.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <DocumentHead />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route
        path="/app"
        element={
          <PrivateRoute>
            <OnboardingProvider>
              <Layout />
            </OnboardingProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/by-ingredients" element={<RecipeByIngredients />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:id" element={<CollectionDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/new" element={<AdminUserForm />} />
          <Route path="users/:id" element={<AdminUserForm />} />
          <Route path="recipes" element={<AdminRecipes />} />
          <Route path="recipes/:id" element={<AdminRecipeEdit />} />
        </Route>
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

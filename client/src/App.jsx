import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import Layout from './components/Layout';
import DocumentHead from './components/DocumentHead';

const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Recipes = React.lazy(() => import('./pages/Recipes'));
const RecipeByIngredients = React.lazy(() => import('./pages/RecipeByIngredients'));
const RecipeDetail = React.lazy(() => import('./pages/RecipeDetail'));
const Collections = React.lazy(() => import('./pages/Collections'));
const CollectionDetail = React.lazy(() => import('./pages/CollectionDetail'));
const Search = React.lazy(() => import('./pages/Search'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserForm = React.lazy(() => import('./pages/admin/AdminUserForm'));
const AdminRecipes = React.lazy(() => import('./pages/admin/AdminRecipes'));
const AdminRecipeEdit = React.lazy(() => import('./pages/admin/AdminRecipeEdit'));
const AdminLogs = React.lazy(() => import('./pages/admin/AdminLogs'));

function PageFallback() {
  const { t } = useTranslation();
  return <div className="flex items-center justify-center min-h-screen">{t('app.loading')}</div>;
}

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
      <Suspense fallback={<PageFallback />}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/datenschutz" element={<PrivacyPolicy />} />
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
          <Route path="logs" element={<AdminLogs />} />
        </Route>
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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

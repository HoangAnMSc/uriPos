import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import { AuthProvider } from './contexts/AuthContext';

const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const CouponsPage = lazy(() => import('./pages/coupons/CouponsPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const PosPage = lazy(() => import('./pages/pos/PosPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen label="Dang tai giao dien..." />}>
        <Routes>
          <Route path="/login" element={<SignInPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute moduleKey="dashboard">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute moduleKey="analytics">
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pos"
              element={
                <ProtectedRoute moduleKey="pos">
                  <PosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute moduleKey="users">
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="customers"
              element={
                <ProtectedRoute moduleKey="customers">
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute moduleKey="products">
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <ProtectedRoute moduleKey="coupons">
                  <CouponsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;

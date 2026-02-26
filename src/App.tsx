import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';

// Lazy loaded routes
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Reports = lazy(() => import('./pages/Reports'));
const Classes = lazy(() => import('./pages/Classes'));
const Admin = lazy(() => import('./pages/Admin'));
const Settings = lazy(() => import('./pages/Settings'));
const Guides = lazy(() => import('./pages/Guides'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50 text-blue-900">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      <p className="font-medium">Cargando módulo...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const DirectorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'DIRECTOR') return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <AuthProvider>
          <DataProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="admin" element={
                    <DirectorRoute>
                      <Admin />
                    </DirectorRoute>
                  } />
                  <Route path="settings" element={<Settings />} />
                  <Route path="guides" element={<Guides />} />
                </Route>
              </Routes>
            </Suspense>
          </DataProvider>
        </AuthProvider>
      </SettingsProvider>
    </HashRouter>
  );
}

export default App;

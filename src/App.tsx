/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './store/ThemeContext';
import { DataProvider } from './store/DataContext';
import { ToastProvider } from './store/ToastContext';
import { AuthProvider } from './store/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Visitors from './pages/Visitors';
import Security from './pages/Security';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import RolesAndAccess from './pages/RolesAndAccess';
import { useAutoReport } from './hooks/useAutoReport';

function AppContent() {
  useAutoReport();
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="security" element={<Security />} />
        <Route path="reports" element={<Reports />} />
        <Route path="roles" element={<RolesAndAccess />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <DataProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

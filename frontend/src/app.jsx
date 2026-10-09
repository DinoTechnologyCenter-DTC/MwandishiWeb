import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LangProvider, ThemeProvider } from './context.jsx';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Templates from './pages/Templates.jsx';
import Letters from './pages/Letters.jsx';
import Account from './pages/Account.jsx';
import Builder from './pages/Builder.jsx';
import { NotFound, Signin, Signup } from './pages/Auth.jsx';
import Admin from './pages/Admin.jsx';
import AdminStatus from './pages/AdminStatus.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Routes>
          {/* Public marketing front door — no app chrome. */}
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Old entry point, kept working for existing bookmarks. */}
            <Route path="/my-cvs" element={<Navigate to="/dashboard" replace />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/new-cv/mwandishi-ai" element={<Builder key="ai" initialMode="ai" />} />
            <Route path="/new-cv/manual" element={<Builder key="manual" initialMode="manual" />} />
            <Route path="/new-cv" element={<Builder key="choose" />} />
            <Route path="/cover-letters" element={<Letters />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route element={<AdminLayout />}>
            {/* Admin inbox — direct URL only, deliberately no sidebar link. */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/status" element={<AdminStatus />} />
          </Route>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </LangProvider>
    </ThemeProvider>
  );
}

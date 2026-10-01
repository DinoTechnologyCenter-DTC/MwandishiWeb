import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LangProvider, ThemeProvider } from './context.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Templates from './pages/Templates.jsx';
import Letters from './pages/Letters.jsx';
import Account from './pages/Account.jsx';
import Builder from './pages/Builder.jsx';
import { NotFound, Signin, Signup } from './pages/Auth.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/new-cv/mwandishi-ai" element={<Builder key="ai" initialMode="ai" />} />
            <Route path="/new-cv/manual" element={<Builder key="manual" initialMode="manual" />} />
            <Route path="/new-cv" element={<Builder key="choose" />} />
            <Route path="/cover-letters" element={<Letters />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </LangProvider>
    </ThemeProvider>
  );
}

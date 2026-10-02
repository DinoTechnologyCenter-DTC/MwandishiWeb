import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { SoonModal } from './Modal.jsx';
import { useLang } from '../context.jsx';
import { clearUser } from '../lib/store.js';

export default function Layout() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileShow, setMobileShow] = React.useState(false);
  const [soonOpen, setSoonOpen] = React.useState(false);
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMobile = React.useCallback(() => setMobileShow(false), []);
  const logout = React.useCallback(() => {
    try { clearUser(); } catch (e) { /* ignore */ }
    closeMobile();
    navigate('/signin');
  }, [closeMobile, navigate]);

  return (
    <React.Fragment>
      <div id="overlay" className={`overlay${mobileShow ? ' show' : ''}`} onClick={closeMobile}></div>
      <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} onOpenMobile={() => setMobileShow(true)} />
      <Sidebar
        collapsed={collapsed}
        mobileShow={mobileShow}
        onNavigate={closeMobile}
        onOpenSoon={() => { closeMobile(); setSoonOpen(true); }}
        onLogout={logout}
      />
      <main id="content" className={`content pt-10 pb-2${collapsed ? ' full' : ''}`} key={location.pathname}>
        <div className="container-fluid">
          <Outlet />
          <div className="row">
            <div className="col-12">
              <footer className="text-center py-1 mt-0 text-secondary">
                <p className="mb-0">Copyright © 2026 Mwandishi. {t('lp.fTag')} </p>
              </footer>
            </div>
          </div>
        </div>
      </main>
      <SoonModal open={soonOpen} onClose={() => setSoonOpen(false)} t={t} />
    </React.Fragment>
  );
}

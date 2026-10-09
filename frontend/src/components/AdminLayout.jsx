import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useLang } from '../context.jsx';

// Admin chrome: its own sidebar (Feedback Inbox, System Status), deliberately
// no link to it from the user sidebar and no user modals here.
export default function AdminLayout() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileShow, setMobileShow] = React.useState(false);
  const { t } = useLang();
  const location = useLocation();

  const closeMobile = React.useCallback(() => setMobileShow(false), []);

  return (
    <React.Fragment>
      <div id="overlay" className={`overlay${mobileShow ? ' show' : ''}`} onClick={closeMobile}></div>
      <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} onOpenMobile={() => setMobileShow(true)} />
      <Sidebar
        variant="admin"
        collapsed={collapsed}
        mobileShow={mobileShow}
        onNavigate={closeMobile}
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
    </React.Fragment>
  );
}

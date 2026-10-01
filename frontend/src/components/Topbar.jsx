import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang, useTheme } from '../context.jsx';
import { buildNotifs, clearUser, getCVs, getLetters, getUser } from '../lib/store.js';

function Avatar({ photo, name, size }) {
  const initial = ((name || 'M').trim().charAt(0) || 'M').toUpperCase();
  if (photo) {
    return <img src={photo} alt="" className={`avatar avatar-${size} rounded-circle`} />;
  }
  return (
    <span className={`avatar avatar-${size} rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold`}>
      {initial}
    </span>
  );
}

export default function Topbar({ collapsed, onToggleSidebar, onOpenMobile }) {
  const { t } = useLang();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = React.useState(null);
  const [, setUserTick] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => setUserTick((x) => x + 1);
    window.addEventListener('mrcv:user-changed', refresh);
    return () => window.removeEventListener('mrcv:user-changed', refresh);
  }, []);
  const user = getUser();
  const name = (user.name || '').trim() || 'anonymous';
  const handle = user.email ? `@${user.email.split('@')[0]}` : '@mwandishi';
  const notifs = React.useMemo(() => {
    try { return buildNotifs(getCVs(), getLetters(), getUser(), t); }
    catch (e) { return []; }
  }, [location.pathname, t]);
  const logout = () => { try { clearUser(); } catch (e) { /* ignore */ } navigate('/signin'); };
  const toggleMenu = (which) => setOpenMenu((m) => (m === which ? null : which));
  const toRoute = (href) => `/${String(href || '').replace(/\.html$/, '').replace(/^index$/, '')}`;

  return (
    <nav id="topbar" className={`navbar bg-white border-bottom fixed-top topbar px-3${collapsed ? ' full' : ''}`}>
      <button id="toggleBtn" className="d-none d-lg-inline-flex btn btn-light btn-icon btn-sm" onClick={onToggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <i className={`ti ${collapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'}`}></i>
      </button>
      <button id="mobileBtn" className="btn btn-light btn-icon btn-sm d-lg-none me-2" onClick={onOpenMobile}>
        <i className="ti ti-layout-sidebar-left-expand"></i>
      </button>
      <div>
        <ul className="list-unstyled d-flex align-items-center mb-0 gap-1">
          <li>
            <button id="themeToggle" className="btn-icon btn-sm btn-light btn rounded-circle border-0" title="Light / dark theme" onClick={toggle}>
              <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} id="themeIcon"></i>
            </button>
          </li>
          <li className={openMenu === 'bell' ? 'dropdown' : ''}>
            <a className="position-relative btn-icon btn-sm btn-light btn rounded-circle" href="#" role="button" onClick={(e) => { e.preventDefault(); toggleMenu('bell'); }} aria-expanded={openMenu === 'bell'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-bell">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
                <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
              </svg>
              {notifs.length > 0 ? (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mt-2 ms-n2" id="notifCount">
                  {notifs.length}
                  <span className="visually-hidden">unread messages</span>
                </span>
              ) : null}
            </a>
            {openMenu === 'bell' ? (
              <div className="dropdown-menu dropdown-menu-end dropdown-menu-md p-0 show" style={{ minWidth: '330px', position: 'absolute', inset: '0px 0px auto auto', transform: 'translate(0px, 42px)' }}>
                <ul className="list-unstyled p-0 m-0" id="notifList">
                  {notifs.length === 0 ? (
                    <li className="p-4 text-center text-secondary small">{t('notif.caughtUp')}</li>
                  ) : notifs.map((n, i) => (
                    <li className="p-3 border-bottom" key={i}>
                      <Link to={toRoute(n.link)} className="d-flex gap-3 text-decoration-none" onClick={() => setOpenMenu(null)}>
                        <span className={`icon-shape icon-sm bg-${n.cls} bg-opacity-10 text-${n.cls} rounded-2 flex-shrink-0`}><i className={`ti ${n.icon} fs-5`}></i></span>
                        <span className="flex-grow-1 small">
                          <span className="d-block fw-semibold">{n.title}</span>
                          <span className="d-block text-secondary">{n.text}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
          <li className={`ms-3 ${openMenu === 'user' ? 'dropdown' : ''}`}>
            <a href="#" role="button" onClick={(e) => { e.preventDefault(); toggleMenu('user'); }} aria-expanded={openMenu === 'user'}>
              <span id="navAvatar"><Avatar photo={user.photo} name={name} size="sm" /></span>
            </a>
            {openMenu === 'user' ? (
              <div className="dropdown-menu dropdown-menu-end p-0 show" style={{ minWidth: '200px', position: 'absolute', inset: '0px 0px auto auto', transform: 'translate(0px, 42px)' }}>
                <div>
                  <div className="d-flex gap-3 align-items-center border-dashed border-bottom px-3 py-3">
                    <span id="menuAvatar"><Avatar photo={user.photo} name={name} size="md" /></span>
                    <div>
                      <h4 className="mb-0 small" id="navUserName">{name}</h4>
                      <p className="mb-0 small" id="navUserHandle">{handle}</p>
                    </div>
                  </div>
                  <div className="p-3 d-flex flex-column gap-1 small lh-lg">
                    <Link to="/" onClick={() => setOpenMenu(null)}><span>{t('nav.mycvs')}</span></Link>
                    <Link to="/new-cv" onClick={() => setOpenMenu(null)}><span>{t('nav.newcv')}</span></Link>
                    <Link to="/templates" onClick={() => setOpenMenu(null)}><span>{t('nav.templates')}</span></Link>
                    <Link to="/cover-letters" onClick={() => setOpenMenu(null)}><span>{t('nav.letters')}</span></Link>
                    <Link to="/account" onClick={() => setOpenMenu(null)}><span>{t('nav.myaccount')}</span></Link>
                    <a href="#" onClick={(e) => { e.preventDefault(); setOpenMenu(null); logout(); }}><span>{t('nav.logout')}</span></a>
                  </div>
                </div>
              </div>
            ) : null}
          </li>
        </ul>
      </div>
    </nav>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLang } from '../context.jsx';
import logoUrl from '../assets/images/logo-leaf.png';

function Item({ to, icon, labelKey, fallback, onNavigate, end }) {
  const { t } = useLang();
  return (
    <li>
      <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <i className={`ti ${icon}`}></i>
        <span className="nav-text">{t(labelKey) || fallback}</span>
      </NavLink>
    </li>
  );
}

export default function Sidebar({ collapsed, mobileShow, onNavigate, onOpenSoon, onFeedback, onLogout, variant }) {
  const { t } = useLang();
  if (variant === 'admin') {
    return (
      <aside id="sidebar" className={`sidebar${collapsed ? ' collapsed' : ''}${mobileShow ? ' mobile-show' : ''}`}>
        <div className="logo-area">
          <NavLink to="/dashboard" className="d-inline-flex" onClick={onNavigate}>
            <img src={logoUrl} alt="" width="24" />
            <span className="logo-text ms-2 fw-bold text-primary">Mwandishi</span>
          </NavLink>
        </div>
        <ul className="nav flex-column">
          <li className="px-4 py-2"><small className="nav-text">{t('adm.admin')}</small></li>
          <Item to="/admin" end icon="ti-inbox" labelKey="adm.inbox" fallback="Feedback Inbox" onNavigate={onNavigate} />
          <Item to="/admin/status" icon="ti-activity" labelKey="adm.status" fallback="System Status" onNavigate={onNavigate} />
          <li className="mt-2 pt-2 border-top">
            <NavLink to="/dashboard" onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <i className="ti ti-arrow-left"></i>
              <span className="nav-text">{t('adm.back')}</span>
            </NavLink>
          </li>
        </ul>
      </aside>
    );
  }
  return (
    <aside id="sidebar" className={`sidebar${collapsed ? ' collapsed' : ''}${mobileShow ? ' mobile-show' : ''}`}>
      <div className="logo-area">
        <NavLink to="/dashboard" className="d-inline-flex" onClick={onNavigate}>
          <img src={logoUrl} alt="" width="24" />
          <span className="logo-text ms-2 fw-bold text-primary">Mwandishi</span>
        </NavLink>
      </div>
      <ul className="nav flex-column">
        <li className="px-4 py-2"><small className="nav-text">Mwandishi</small></li>
        <Item to="/dashboard" icon="ti-files" labelKey="nav.mycvs" fallback="My CVs" onNavigate={onNavigate} />
        <Item to="/templates" icon="ti-layout-grid" labelKey="nav.templates" fallback="Templates" onNavigate={onNavigate} />
        <Item to="/new-cv" icon="ti-plus" labelKey="nav.newcv" fallback="New CV" onNavigate={onNavigate} />
        <Item to="/cover-letters" icon="ti-mail" labelKey="nav.letters" fallback="Cover Letters" onNavigate={onNavigate} />
        <li>
          <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onOpenSoon(); }}>
            <i className="ti ti-upload"></i>
            <span className="nav-text">{t('nav.upload')}</span>
            <span className="badge bg-light text-secondary border ms-auto nav-text">{t('nav.soon')}</span>
          </a>
        </li>
        <li className="px-4 pt-4 pb-2"><small className="nav-text">{t('nav.account')}</small></li>
        <Item to="/account" icon="ti-user-circle" labelKey="nav.myaccount" fallback="My Account" onNavigate={onNavigate} />
        <li className="mt-2 pt-2 border-top">
          <NavLink to="/" end onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <i className="ti ti-home"></i>
            <span className="nav-text">{t('nav.home')}</span>
          </NavLink>
        </li>
        <li>
          <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onFeedback(); }}>
            <i className="ti ti-star"></i>
            <span className="nav-text">{t('nav.feedback') || 'Give Feedback'}</span>
          </a>
        </li>
      </ul>
    </aside>
  );
}

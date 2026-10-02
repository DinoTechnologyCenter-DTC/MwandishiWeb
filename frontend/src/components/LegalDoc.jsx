import React from 'react';
import { Link } from 'react-router-dom';
import { useLang, useTheme } from '../context.jsx';
import logoUrl from '../assets/images/logo-icon.svg';

// Shared shell for the privacy policy and terms of use. All copy lives in
// i18n.js; pages only declare which sections they show, in order.
export default function LegalDoc({ titleKey, subKey, introKey, sections, contactKey }) {
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();

  return (
    <div className="lp legal">
      <nav className="lp-nav py-2">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <Link to="/" className="navbar-brand">
              <img src={logoUrl} alt="" width="26" />
              <span>{t('lp.fTitle')}</span>
            </Link>
            <div className="d-flex align-items-center gap-2">
              <div className="btn-group btn-group-sm" role="group">
                {['EN', 'SW'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`btn lp-lang ${lang.toUpperCase() === code ? 'btn-primary' : 'btn-outline-secondary'}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost-secondary"
                onClick={toggle}
                title={t('nav.account')}
                aria-label="Toggle theme"
              >
                <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`}></i>
              </button>
              <Link to="/" className="btn btn-sm btn-primary">
                <span>{t('lg.back')}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="legal-body">
        <div className="container">
          <div className="legal-doc">
            <h1 className="lp-h2">{t(titleKey)}</h1>
            <p className="lp-sub2">{t(subKey)}</p>
            <p className="legal-meta">
              {t('lg.upd')}: {t('lg.date')}
            </p>
            <p className="legal-intro">{t(introKey)}</p>

            {sections.map(([headKey, paraKey, list]) => (
              <section className="legal-sec" key={headKey}>
                <h2>{t(headKey)}</h2>
                <p>{t(paraKey)}</p>
                {list && list.length ? (
                  <ul>
                    {list.map((k) => (
                      <li key={k}>{t(k)}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section className="legal-sec">
              <h2>{t(contactKey)}</h2>
              <p>
                <a href={`mailto:${t('lg.email')}`}>{t('lg.email')}</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="lp-foot">
        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-6">
              <div className="d-flex align-items-center gap-2">
                <img src={logoUrl} alt="" width="22" />
                <strong>{t('lp.fTitle')}</strong>
                <span className="d-none d-sm-inline">· {t('lp.fTag')}</span>
              </div>
            </div>
            <div className="col-12 col-md-6 text-md-end">
              <Link to="/privacy" className="legal-link">{t('lp.fPrivacy')}</Link>
              <span className="mx-2">·</span>
              <Link to="/terms" className="legal-link">{t('lp.fTerms')}</Link>
              <span className="mx-2">·</span>
              <span>{t('lp.fRights')} </span>
              <span>© 2026 </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

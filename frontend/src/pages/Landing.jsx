import React from 'react';
import { Link } from 'react-router-dom';
import { useLang, useTheme } from '../context.jsx';
import { TEMPLATES } from '../lib/store.js';
import TemplatePreview, { useLinkFor } from '../components/TemplatePreview.jsx';
import logoUrl from '../assets/images/logo-icon.svg';

// Marketing copy lives in i18n.js; these tables only carry layout metadata.
const STATS = [
  ['lp.s1v', 'lp.s1l', 'ti-layout-grid'],
  ['lp.s2v', 'lp.s2l', 'ti-language'],
  ['lp.s3v', 'lp.s3l', 'ti-file-type-pdf'],
  ['lp.s4v', 'lp.s4l', 'ti-lock'],
];

const PAINS = [
  ['ti-filter-off', 'lp.w1t', 'lp.w1s'],
  ['ti-file-off', 'lp.w2t', 'lp.w2s'],
  ['ti-copy', 'lp.w3t', 'lp.w3s'],
];

const FEATURES = [
  ['ti-message-circle-2', 'lp.f1t', 'lp.f1s'],
  ['ti-forms', 'lp.f2t', 'lp.f2s'],
  ['ti-eye', 'lp.f3t', 'lp.f3s'],
  ['ti-target-arrow', 'lp.f4t', 'lp.f4s'],
  ['ti-download', 'lp.f5t', 'lp.f5s'],
  ['ti-mail', 'lp.f6t', 'lp.f6s'],
  ['ti-brand-whatsapp', 'lp.f7t', 'lp.f7s'],
  ['ti-shield-lock', 'lp.f8t', 'lp.f8s'],
];

const STEPS = [
  ['lp.d1t', 'lp.d1s'],
  ['lp.d2t', 'lp.d2s'],
  ['lp.d3t', 'lp.d3s'],
  ['lp.d4t', 'lp.d4s'],
];

const FAQS = [
  ['lp.q1', 'lp.a1'],
  ['lp.q2', 'lp.a2'],
  ['lp.q3', 'lp.a3'],
  ['lp.q4', 'lp.a4'],
  ['lp.q5', 'lp.a5'],
  ['lp.q6', 'lp.a6'],
  ['lp.q7', 'lp.a7'],
];

// Template names, descriptions and previews come from the store via
// TemplatePreview, so this page can never drift from /templates.
function SectionHead({ eyebrow, title, sub, center }) {
  return (
    <div className={`mb-5${center ? ' text-center' : ''}`}>
      {eyebrow ? <div className="lp-eyebrow">{eyebrow}</div> : null}
      <h2 className="lp-h2">{title}</h2>
      {sub ? <p className="lp-sub2 mb-0 mx-auto">{sub}</p> : null}
    </div>
  );
}

export default function Landing() {
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const [openFaq, setOpenFaq] = React.useState(0);

  const tpls = TEMPLATES;

  return (
    <div className="lp">
      {/* ---------------------------------------------------------------- nav */}
      <nav className="lp-nav py-2">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <Link to="/" className="navbar-brand">
              <img src={logoUrl} alt="" width="26" />
              <span>{t('lp.fTitle')}</span>
            </Link>
            <div className="d-none d-lg-flex align-items-center gap-1">
              <a className="nav-link" href="#features">{t('lp.features')}</a>
              <a className="nav-link" href="#how">{t('lp.how')}</a>
              <a className="nav-link" href="#templates">{t('lp.tpl')}</a>
              <a className="nav-link" href="#faq">{t('lp.faq')}</a>
            </div>
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
              <Link to="/new-cv" className="btn btn-sm btn-primary">
                <span>{t('lp.open')}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --------------------------------------------------------------- hero */}
      <header className="lp-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <span className="lp-badge">
                <i className="ti ti-sparkles"></i>
                <span>{t('lp.badge')}</span>
              </span>
              <h1 className="lp-title mt-3">
                {t('lp.h1a')}<br />
                <em>{t('lp.h1b')}</em>
              </h1>
              <p className="lp-lead mb-4">{t('lp.sub')}</p>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Link to="/new-cv/mwandishi-ai" className="btn btn-primary btn-lg">
                  <i className="ti ti-sparkles"></i>
                  <span className="ms-1">{t('lp.ctaMain')}</span>
                </Link>
                <Link to="/templates" className="btn btn-outline-secondary btn-lg">
                  <i className="ti ti-layout-grid"></i>
                  <span className="ms-1">{t('lp.ctaAlt')}</span>
                </Link>
              </div>
              <Link to="/new-cv/manual" className="small text-secondary text-decoration-none">
                {t('lp.ctaManual')}
              </Link>
            </div>
            <div className="col-12 col-lg-5">
              <div className="lp-preview">
                <div className="lp-pv-head">
                  <div>
                    <div className="lp-pv-name">Joseph Mwakalinga</div>
                    <div className="lp-pv-role">IT Support Officer</div>
                  </div>
                  <div className="text-end">
                    <div className="lp-pv-contact">+255 754 000 000</div>
                    <div className="lp-pv-contact">joseph@example.co.tz</div>
                  </div>
                </div>
                <div className="lp-pv-sec">PROFESSIONAL SUMMARY</div>
                <div className="lp-pv-line w-90" />
                <div className="lp-pv-line w-75" />
                <div className="lp-pv-sec">WORK EXPERIENCE</div>
                <div className="lp-pv-line w-60" />
                <div className="lp-pv-line w-90" />
                <div className="lp-pv-sec">EDUCATION</div>
                <div className="lp-pv-line w-75" />
                <div className="lp-pv-sec">SKILLS</div>
                <div className="d-flex gap-2 mt-2">
                  <span className="tag">Networking</span>
                  <span className="tag">Windows</span>
                  <span className="tag">Helpdesk</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mt-4 pt-3">
            {STATS.map(([v, l, icon]) => (
              <div className="col-6 col-lg-3" key={v}>
                <div className="lp-stat">
                  <div className="v"><i className={`ti ${icon} me-2 text-primary`}></i>{t(v)}</div>
                  <div className="l">{t(l)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- problem */}
      <section className="lp-section lp-section-alt">
        <div className="container">
          <SectionHead eyebrow={t('lp.why')} title={t('lp.whySub')} />
          <div className="row g-4">
            {PAINS.map(([icon, title, body]) => (
              <div className="col-12 col-md-4" key={title}>
                <div className="lp-card">
                  <span className="ic"><i className={`ti ${icon}`}></i></span>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section className="lp-section" id="features">
        <div className="container">
          <SectionHead eyebrow={t('lp.features')} title={t('lp.featT')} sub={t('lp.featS')} center />
          <div className="row g-4">
            {FEATURES.map(([icon, title, body]) => (
              <div className="col-12 col-sm-6 col-lg-4" key={title}>
                <div className="lp-card">
                  <span className="ic"><i className={`ti ${icon}`}></i></span>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- how */}
      <section className="lp-section lp-section-alt" id="how">
        <div className="container">
          <SectionHead eyebrow={t('lp.how')} title={t('lp.howT')} sub={t('lp.howS')} />
          <div className="row g-4">
            {STEPS.map(([title, body], i) => (
              <div className="col-12 col-sm-6 col-lg-3" key={title}>
                <div className="lp-step">
                  <span className="n">{i + 1}</span>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- templates */}
      <section className="lp-section" id="templates">
        <div className="container">
          <SectionHead
            eyebrow={t('lp.tpl')}
            title={t('lp.tplT')}
            sub={t('lp.tplS')}
            center
          />
          <div className="row g-4">
            {tpls.map((x) => (
              <div className="col-12 col-sm-6 col-lg-4" key={x.slug}>
                <Link to={useLinkFor(x)} className="lp-tpl">
                  <TemplatePreview tpl={x} className="cv-frame cv-frame-sm mb-3" />
                  <h3>{x.name}</h3>
                  <p>{x.desc}</p>
                  <div className="tags">
                    {(x.badges || []).map((b) => <span className="tag" key={b}>{b}</span>)}
                  </div>
                  <div className="best">
                    {t('tpl.bestfor')} <b>{x.best}</b>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link to="/templates" className="btn btn-outline-secondary">
              <i className="ti ti-layout-grid"></i>
              <span className="ms-1">{t('lp.tplCta')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- privacy */}
      <section className="lp-section pt-0">
        <div className="container">
          <div className="lp-band">
            <div className="row align-items-center g-4">
              <div className="col-12 col-lg-8">
                <h2>{t('lp.privT')}</h2>
                <p className="mb-0">{t('lp.privS')}</p>
                <div className="row g-3 mt-3">
                  {['lp.priv1', 'lp.priv2', 'lp.priv3'].map((k) => (
                    <div className="col-12 col-md-4" key={k}>
                      <div className="tick"><i className="ti ti-circle-check"></i>{t(k)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-12 col-lg-4 text-lg-end">
                <Link to="/new-cv" className="btn btn-light btn-lg">
                  <i className="ti ti-arrow-right"></i>
                  <span className="ms-1">{t('lp.ctaMain')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="lp-section pt-0" id="faq">
        <div className="container">
          <SectionHead title={t('lp.faqT')} center />
          <div className="row justify-content-center">
            <div className="col-12 col-lg-9">
              <div className="lp-faq accordion" id="lpFaq">
                {FAQS.map(([q, a], i) => (
                  <div className="accordion-item" key={q}>
                    <h3 className="accordion-header">
                      <button
                        type="button"
                        className={`accordion-button${openFaq === i ? '' : ' collapsed'}`}
                        onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                        aria-expanded={openFaq === i}
                      >
                        {t(q)}
                      </button>
                    </h3>
                    {openFaq === i ? (
                      <div className="accordion-body">{t(a)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section className="lp-section pt-0">
        <div className="container">
          <div className="lp-cta">
            <h2>{t('lp.ctaT')}</h2>
            <p>{t('lp.ctaS')}</p>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              <Link to="/new-cv/mwandishi-ai" className="btn btn-primary btn-lg">
                <i className="ti ti-sparkles"></i>
                <span className="ms-1">{t('lp.ctaBtn')}</span>
              </Link>
              <Link to="/new-cv/manual" className="btn btn-outline-secondary btn-lg">
                <i className="ti ti-forms"></i>
                <span className="ms-1">{t('lp.ctaManual')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
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
              <span>{t('lp.fRights')} </span>
              <span>© 2026 </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

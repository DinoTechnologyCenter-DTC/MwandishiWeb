import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context.jsx';
import { useStore } from '../hooks.js';
import { deleteCV, duplicateCV, fmtDate, waLink } from '../lib/store.js';

function templateName(slug) {
  return { graduate: 'Graduate', government: 'Govt/NGO', banking: 'Banking', general: 'General', clinical: 'Clinical', exact: 'Exact Replica', barua: 'Barua' }[slug] || slug;
}

function MatchBadge({ score }) {
  const cls = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-secondary';
  return <span className={`badge ${cls}`}>{score}% match</span>;
}

export default function Dashboard() {
  const { t } = useLang();
  const { cvs, letters, refresh } = useStore();
  const avg = cvs.length ? Math.round(cvs.reduce((a, c) => a + (c.match || 0), 0) / cvs.length) : 0;
  const dls = cvs.reduce((a, c) => a + (c.downloads || 0), 0);
  const steps = [
    { done: cvs.length > 0, text: t('idx.s1') },
    { done: letters.length > 0, text: t('idx.s2') },
    { done: dls > 0, text: t('idx.s3') },
  ];
  const del = (id) => {
    if (!window.confirm(t('idx.delConfirm'))) return;
    deleteCV(id);
    refresh();
  };
  const dup = (id) => { duplicateCV(id); refresh(); };

  return (
    <React.Fragment>
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('idx.title')}</h1>
              <p className="mb-0">{t('idx.sub')}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/templates" className="btn btn-outline-secondary"><i className="ti ti-layout-grid"></i> <span>{t('idx.templates')}</span></Link>
              <Link to="/new-cv" className="btn btn-primary"><i className="ti ti-plus"></i> <span>{t('idx.newcv')}</span></Link>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-3 mb-3">
        {[[t('idx.sCvs'), cvs.length], [t('idx.sLetters'), letters.length], [t('idx.sMatch'), cvs.length ? `${avg}%` : '—'], [t('idx.sDl'), dls]].map(([label, val]) => (
          <div className="col-6 col-lg-3" key={label}>
            <div className="card h-100"><div className="card-body p-4">
              <h6 className="mb-3 text-secondary">{label}</h6>
              <h3 className="mb-0 fw-bold">{val}</h3>
            </div></div>
          </div>
        ))}
      </div>
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center px-4 py-3">
              <h4 className="mb-0 h5">{t('idx.mycvs')}</h4>
              <Link to="/new-cv" className="btn btn-sm btn-primary"><i className="ti ti-plus"></i> <span>{t('idx.newcv')}</span></Link>
            </div>
            <div className="list-group list-group-flush">
              {cvs.length === 0 ? (
                <div className="text-center py-5">
                  <i className="ti ti-files fs-1 text-secondary"></i>
                  <h3 className="h6 mt-3">{t('idx.emptyT')}</h3>
                  <p className="text-secondary small">{t('idx.emptyS')}</p>
                  <Link to="/new-cv" className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> {t('idx.createFirst')}</Link>
                </div>
              ) : cvs.map((cv) => (
                <div className="list-group-item p-3 d-flex flex-column flex-md-row gap-3 align-items-md-center" key={cv.id}>
                  <div className="icon-shape icon-md bg-primary bg-opacity-10 text-primary rounded-2 flex-shrink-0">
                    <i className="ti ti-file-text fs-4"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <strong>{cv.name}</strong>
                      <MatchBadge score={cv.match || 0} />
                      <span className="badge bg-light text-secondary border">{templateName(cv.template)}</span>
                    </div>
                    <small className="text-secondary">{cv.target || ''} · Updated {fmtDate(cv.updatedAt)} · {cv.downloads || 0} downloads</small>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <Link to={`/new-cv?id=${encodeURIComponent(cv.id)}`} className="btn btn-sm btn-outline-primary" title="Open"><i className="ti ti-edit"></i></Link>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => dup(cv.id)} title="Duplicate"><i className="ti ti-copy"></i></button>
                    <a className="btn btn-sm btn-outline-success" target="_blank" rel="noopener noreferrer" title="Share via WhatsApp" href={waLink(`My CV: ${cv.name} — made with Mwandishi`)}><i className="ti ti-brand-whatsapp"></i></a>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => del(cv.id)} title="Delete"><i className="ti ti-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card mb-3">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('idx.quick')}</h4></div>
            <div className="card-body p-3 d-grid gap-2">
              <Link to="/new-cv" className="btn btn-primary"><i className="ti ti-plus"></i> <span>{t('idx.startNew')}</span></Link>
              <Link to="/templates" className="btn btn-outline-secondary"><i className="ti ti-layout-grid"></i> <span>{t('idx.browse')}</span></Link>
              <Link to="/cover-letters" className="btn btn-outline-secondary"><i className="ti ti-mail"></i> <span>{t('idx.writeLetter')}</span></Link>
            </div>
          </div>
          <div className="card">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('idx.getting')}</h4></div>
            <div className="card-body p-3">
              <ul className="list-unstyled mb-0">
                {steps.map((s, i) => (
                  <li className="list-group-item d-flex align-items-center gap-2 border-0 px-0 py-2" key={i}>
                    <i className={`ti ${s.done ? 'ti-circle-check text-success' : 'ti-circle text-secondary'} fs-5`}></i>
                    <span className={s.done ? 'text-decoration-line-through text-secondary' : ''}>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

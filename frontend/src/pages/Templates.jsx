import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context.jsx';
import { TEMPLATES } from '../lib/store.js';
import Modal from '../components/Modal.jsx';
import TemplatePreview, { sheetFor, useLinkFor } from '../components/TemplatePreview.jsx';

const FILTERS = [
  ['all', 'tpl.all', 'All'],
  ['graduate', 'tpl.graduate', 'Graduate'],
  ['government', 'tpl.government', 'Government / NGO'],
  ['banking', 'tpl.banking', 'Banking / Telecom'],
  ['general', 'tpl.general', 'General'],
  ['barua', 'tpl.letter', 'Application Letter'],
];

export default function Templates() {
  const { t } = useLang();
  const [filter, setFilter] = React.useState('all');
  const [preview, setPreview] = React.useState(null);
  const shown = TEMPLATES.filter((x) => filter === 'all' || x.cat === filter);

  return (
    <React.Fragment>
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('tpl.title')}</h1>
              <p className="mb-0">{t('tpl.sub')}</p>
            </div>
            <div>
              <Link to="/new-cv" className="btn btn-primary"><i className="ti ti-plus"></i> <span>{t('tpl.newcv')}</span></Link>
            </div>
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex gap-2 flex-wrap">
            {FILTERS.map(([v, k, fb]) => (
              <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary active' : 'btn-outline-secondary'}`} onClick={() => setFilter(v)}>{t(k) || fb}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="row g-3 mb-3">
        {shown.map((tpl) => {
          const s = sheetFor(tpl);
          const useTo = useLinkFor(tpl);
          return (
            <div className="col-12 col-md-6 col-lg-4" key={tpl.slug}>
              <div className="card h-100">
                <div className="card-body p-3 d-flex flex-column">
                  <TemplatePreview tpl={tpl} className="cv-frame cv-frame-sm mb-3" />
                  <h3 className="h6 mb-1">{tpl.name}</h3>
                  <p className="small text-secondary mb-2">{tpl.desc}</p>
                  <p className="small mb-2"><i className="ti ti-briefcase text-primary"></i> {tpl.best}</p>
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {tpl.badges.map((b) => <span className="badge bg-light text-secondary border" key={b}>{b}</span>)}
                  </div>
                  <div className="d-flex gap-2 mt-auto">
                    <Link to={useTo} className="btn btn-primary btn-sm flex-grow-1">{t('tpl.use')}</Link>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setPreview(tpl)}>{t('tpl.preview')}</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview ? preview.name : ''} size="modal-xl" scrollable
        footer={<React.Fragment><button type="button" className="btn btn-outline-secondary" onClick={() => setPreview(null)}>{t('tpl.close')}</button><Link className="btn btn-primary" to={preview ? useLinkFor(preview) : '/new-cv'} onClick={() => setPreview(null)}>{t('tpl.use')}</Link></React.Fragment>}>
        {preview ? (() => { const s = sheetFor(preview); return <div className={s.cls} dangerouslySetInnerHTML={{ __html: s.html }}></div>; })() : null}
      </Modal>
    </React.Fragment>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context.jsx';
import { getBackendHealth, getFeedbackAdmin, ADMIN_KEY_KEY } from '../lib/store.js';

// Second admin tab: is the backend alive and what has the inbox collected?
// Health is public; totals reuse the tab's session passcode when unlocked.
export default function AdminStatus() {
  const { t } = useLang();
  const [health, setHealth] = React.useState(null);
  const [totals, setTotals] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const h = await getBackendHealth();
      if (!live) return;
      setHealth(h);
      let key = '';
      try { key = sessionStorage.getItem(ADMIN_KEY_KEY) || ''; } catch (e) { /* ignore */ }
      if (key) {
        const res = await getFeedbackAdmin(key, { limit: 1000 });
        if (!live) return;
        if (res.ok) {
          const dist = [0, 0, 0, 0, 0, 0];
          let sum = 0;
          res.items.forEach((fb) => {
            const r = Math.max(0, Math.min(5, fb.rating | 0));
            dist[r] += 1;
            sum += r;
          });
          setTotals({ total: res.items.length, avg: res.items.length ? sum / res.items.length : 0, dist });
        }
      }
    })();
    return () => { live = false; };
  }, []);

  const pill = (on) => (
    <span className={`badge ${on ? 'bg-success' : 'bg-secondary'}`}>{on ? t('adm.online') : t('adm.offline')}</span>
  );
  const chip = (label, on) => (
    <span className="border rounded px-2 py-1 d-inline-flex align-items-center gap-1" key={label}>
      <span className="small fw-semibold">{label}</span>
      {pill(!!on)}
    </span>
  );

  return (
    <div className="row justify-content-center">
      <div className="col-12">
        <div className="card mb-3">
          <div className="card-header bg-white px-4 py-3">
            <h4 className="mb-0 h5">{t('adm.sysBackend')}</h4>
          </div>
          <div className="card-body px-4 py-3">
            {!health ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <React.Fragment>
                <div className="d-flex flex-wrap gap-2">
                  {chip(t('adm.sysBackend'), health.ok)}
                  {chip(t('adm.svcPdf'), health.pdf)}
                  {chip(t('adm.svcDocx'), health.docx)}
                  {chip(t('adm.svcAi'), health.ai)}
                  {chip(t('adm.svcAiFb'), health.aiFallback)}
                </div>
                {health.pdfError ? <p className="text-danger small mb-0 mt-2">{health.pdfError}</p> : null}
              </React.Fragment>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header bg-white px-4 py-3">
            <h4 className="mb-0 h5">{t('adm.totals')}</h4>
          </div>
          <div className="card-body px-4 py-3">
            {!totals ? (
              <p className="mb-0">
                {t('adm.unlockFirst')}{' '}
                <Link to="/admin">{t('adm.goInbox')}</Link>
              </p>
            ) : (
              <React.Fragment>
                <p className="mb-1">
                  <span className="fw-semibold">{t('adm.total')}: </span>{totals.total}
                  <span className="fw-semibold ms-3">{t('adm.avg')}: </span>
                  {totals.total ? totals.avg.toFixed(1) : '—'}
                </p>
                {[5, 4, 3, 2, 1, 0].map((s) => (
                  <div className="d-flex align-items-center gap-2 py-1 border-bottom" key={s}>
                    <span className="text-warning fw-bold">{'★'.repeat(s) || '☆☆☆☆☆'}</span>
                    <span className="ms-auto">{totals.dist[s]}</span>
                  </div>
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

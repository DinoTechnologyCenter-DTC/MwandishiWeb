import React from 'react';
import { useLang } from '../context.jsx';
import { getFeedbackAdmin, fmtDateTime, ADMIN_KEY_KEY } from '../lib/store.js';

// Direct URL only — deliberately no sidebar link. The passcode lives in the
// tab's sessionStorage (never localStorage), so closing the tab locks it.
export default function Admin() {
  const { t } = useLang();
  const [key, setKey] = React.useState(() => {
    try { return sessionStorage.getItem(ADMIN_KEY_KEY) || ''; } catch (e) { return ''; }
  });
  const [input, setInput] = React.useState('');
  const [items, setItems] = React.useState(null);
  const [count, setCount] = React.useState(0);
  const [minRating, setMinRating] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (k, mr) => {
    setBusy(true);
    setError('');
    const res = await getFeedbackAdmin(k, { minRating: mr });
    setBusy(false);
    if (res.ok) {
      setItems(res.items);
      setCount(res.count);
      return true;
    }
    setError(res.status === 403 ? t('adm.badKey') : t('adm.noconnect'));
    return false;
  }, [t]);

  React.useEffect(() => {
    if (key) {
      load(key, 0).then((ok) => {
        if (!ok) {
          setKey('');
          try { sessionStorage.removeItem(ADMIN_KEY_KEY); } catch (e) { /* ignore */ }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = async () => {
    const k = input.trim();
    if (!k || busy) return;
    if (await load(k, minRating)) {
      setKey(k);
      setInput('');
      try { sessionStorage.setItem(ADMIN_KEY_KEY, k); } catch (e) { /* ignore */ }
    }
  };

  const lock = () => {
    setKey('');
    setInput('');
    setItems(null);
    setError('');
    try { sessionStorage.removeItem(ADMIN_KEY_KEY); } catch (e) { /* ignore */ }
  };

  const refilter = (mr) => {
    setMinRating(mr);
    if (key) load(key, mr);
  };

  const stars = (n) => ('★'.repeat(n) + '☆'.repeat(5 - n));

  return (
    <div className="row justify-content-center">
      <div className="col-12">
        <div className="card mb-3">
          <div className="card-header bg-white px-4 py-3 d-flex align-items-center gap-2">
            <h4 className="mb-0 h5">{t('adm.title')}</h4>
            {key ? (
              <React.Fragment>
                <span className="badge bg-light text-secondary border ms-auto">{count} {t('adm.received')}</span>
                <button className="btn btn-sm btn-outline-secondary" onClick={lock}>{t('adm.lock')}</button>
              </React.Fragment>
            ) : null}
          </div>
          <div className="card-body p-3 p-md-4">
            {!key ? (
              <React.Fragment>
                <label className="form-label fw-semibold" htmlFor="adm-key">{t('adm.key')}</label>
                <input id="adm-key" type="password" autoComplete="off" className="form-control mb-2"
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder={t('adm.keyPh')}
                  onKeyDown={(e) => { if (e.key === 'Enter') unlock(); }} />
                {error ? <p className="text-danger small mb-2">{error}</p> : null}
                <button className="btn btn-primary w-100" onClick={unlock} disabled={busy || !input.trim()}>
                  {busy
                    ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    : t('adm.unlock')}
                </button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="d-flex gap-2 flex-wrap align-items-center mb-3">
                  <span className="small fw-semibold">{t('adm.filter')}:</span>
                  {[0, 3, 4, 5].map((mr) => (
                    <button key={mr}
                      className={`btn btn-sm ${minRating === mr ? 'btn-primary active' : 'btn-outline-secondary'}`}
                      onClick={() => refilter(mr)}>
                      {mr === 0 ? t('adm.all') : `${mr}+ ★`}
                    </button>
                  ))}
                  {busy ? <span className="spinner-border spinner-border-sm ms-auto" role="status" aria-hidden="true"></span> : null}
                </div>
                {error ? <p className="text-danger small mb-2">{error}</p> : null}
                {!items || !items.length ? (
                  <p className="text-secondary mb-0">{t('adm.empty')}</p>
                ) : (
                  <div className="d-grid gap-2">
                    {items.map((fb) => (
                      <div className="border rounded p-3" key={fb.id || fb.at}>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <span className="border rounded px-2 py-1 d-inline-flex align-items-center gap-1" title={`${fb.rating || 0} / 5`}>
                            <span className="text-warning fw-bold">{fb.rating ? stars(fb.rating) : t('adm.norating')}</span>
                          </span>
                          {fb.page ? (
                            <span className="border rounded px-2 py-1 d-inline-flex align-items-center gap-1">
                              <span className="small text-secondary">{fb.page}</span>
                            </span>
                          ) : null}
                          <span className="border rounded px-2 py-1 d-inline-flex align-items-center gap-1">
                            <span className="small text-secondary">{fmtDateTime(fb.at)}</span>
                          </span>
                        </div>
                        {fb.improvement ? <p className="mb-1"><span className="fw-semibold">{t('adm.improve')}: </span>{fb.improvement}</p> : null}
                        {fb.problem ? <p className="mb-0"><span className="fw-semibold">{t('adm.problem')}: </span>{fb.problem}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

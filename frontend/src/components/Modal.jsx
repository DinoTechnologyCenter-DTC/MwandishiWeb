import React from 'react';
import { submitFeedback } from '../lib/store.js';

// Bootstrap-styled modal driven by React state (no bootstrap.js needed).
export default function Modal({ open, onClose, title, children, footer, size, scrollable }) {
  const boxRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // No size -> Bootstrap's default 500px dialog. Pass size="modal-sm" only for
  // short notices; forms need the room.
  return (
    <div className="modal fade show" tabIndex="-1" role="dialog" style={{ display: 'block', background: 'rgba(0,0,0,.45)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || ''}${scrollable ? ' modal-dialog-scrollable' : ''}`} role="document" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          {title ? (
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>
          ) : null}
          <div className="modal-body text-center p-4" ref={boxRef}>{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function SoonModal({ open, onClose, t }) {
  return (
    <Modal open={open} onClose={onClose} size="modal-sm">
      <div className="icon-shape icon-lg bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3">
        <i className="ti ti-clock fs-2"></i>
      </div>
      <h5 className="mb-2">{t('soon.title')}</h5>
      <p className="text-secondary small mb-3">{t('soon.body')}</p>
      <button type="button" className="btn btn-primary w-100" onClick={onClose}>{t('soon.close')}</button>
    </Modal>
  );
}

export function FeedbackModal({ open, onClose, t }) {
  const [stars, setStars] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [improve, setImprove] = React.useState('');
  const [problem, setProblem] = React.useState('');
  const [hint, setHint] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(null); // 'sent' | 'queued'
  React.useEffect(() => {
    if (open) {
      setStars(0); setHover(0); setImprove(''); setProblem('');
      setHint(''); setBusy(false); setDone(null);
    }
  }, [open ]);
  const send = async () => {
    if (busy) return;
    if (!stars && !improve.trim() && !problem.trim()) { setHint(t('fb.need')); return; }
    setBusy(true);
    setHint('');
    try {
      const res = await submitFeedback({
        rating: stars, improvement: improve, problem,
        page: (typeof location !== 'undefined' && location.pathname) || '',
      });
      setDone(res.sent ? 'sent' : 'queued');
    } catch (e) {
      setHint(t('fb.need'));
    } finally {
      setBusy(false);
    }
  };
  const lit = hover || stars;
  return (
    <Modal open={open} onClose={onClose} title={t('fb.title')}>
      {done ? (
        <React.Fragment>
          <div className="icon-shape icon-lg bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-3">
            <i className="ti ti-check fs-2"></i>
          </div>
          <p className="mb-1">{t('fb.thanks')}</p>
          {done === 'queued' ? <p className="text-secondary small mb-3">{t('fb.queued')}</p> : <div className="mb-3" />}
          <button type="button" className="btn btn-primary w-100" onClick={onClose}>{t('soon.close')}</button>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <p className="fw-semibold mb-2">{t('fb.rate')}</p>
          <div className="mb-3" role="radiogroup" aria-label={t('fb.rate')}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn-link p-1 text-decoration-none"
                aria-label={`${n} / 5`}
                onClick={() => setStars(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
              >
                <i className={`ti ${n <= lit ? 'ti-star-filled text-warning' : 'ti-star text-secondary'} fs-3`}></i>
              </button>
            ))}
          </div>
          <div className="text-start mb-2">
            <label className="form-label fw-semibold" htmlFor="fb-improve">{t('fb.improve')}</label>
            <textarea id="fb-improve" className="form-control" rows="2" value={improve}
              onChange={(e) => setImprove(e.target.value)} placeholder={t('fb.improvePh')} />
          </div>
          <div className="text-start mb-3">
            <label className="form-label fw-semibold" htmlFor="fb-problem">{t('fb.problem')}</label>
            <textarea id="fb-problem" className="form-control" rows="2" value={problem}
              onChange={(e) => setProblem(e.target.value)} placeholder={t('fb.problemPh')} />
          </div>
          {hint ? <p className="text-danger small mb-2">{hint}</p> : null}
          <button type="button" className="btn btn-primary w-100" onClick={send} disabled={busy}>
            {busy
              ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              : t('fb.send')}
          </button>
        </React.Fragment>
      )}
    </Modal>
  );
}

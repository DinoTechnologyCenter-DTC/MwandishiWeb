import React from 'react';

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
  return (
    <div className="modal fade show" tabIndex="-1" role="dialog" style={{ display: 'block', background: 'rgba(0,0,0,.45)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || 'modal-sm'}${scrollable ? ' modal-dialog-scrollable' : ''}`} role="document" onClick={(e) => e.stopPropagation()}>
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
    <Modal open={open} onClose={onClose}>
      <div className="icon-shape icon-lg bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3">
        <i className="ti ti-clock fs-2"></i>
      </div>
      <h5 className="mb-2">{t('soon.title')}</h5>
      <p className="text-secondary small mb-3">{t('soon.body')}</p>
      <button type="button" className="btn btn-primary w-100" onClick={onClose}>{t('soon.close')}</button>
    </Modal>
  );
}

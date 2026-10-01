import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context.jsx';
import { useStore } from '../hooks.js';
import { clearUser, saveUser, normalizeTZPhone, COUNTRIES, REGIONS } from '../lib/store.js';

function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c.name : (code || '');
}

export default function Account() {
  const { t, setLang } = useLang();
  const { cvs, letters } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = React.useState(() => {
    let u = {};
    try { u = JSON.parse(localStorage.getItem('mrcv.user')) || {}; } catch (e) { /* ignore */ }
    return { name: u.name || '', phone: u.phone || '', email: u.email || '', lang: u.lang || 'EN', country: u.country || 'TZ', region: u.region || '', photo: u.photo || '' };
  });
  const [savedTick, setSavedTick] = React.useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const regions = REGIONS[form.country] || [];
  const target = [countryName(form.country), form.region].filter(Boolean).join(' · ') || '—';
  const dls = cvs.reduce((a, c) => a + (c.downloads || 0), 0);

  const persist = (next) => {
    try { saveUser(next); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new Event('mrcv:user-changed')); } catch (e) { /* ignore */ }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  };
  const onSave = () => {
    const next = { ...form, phone: form.phone.trim() ? normalizeTZPhone(form.phone.trim()) : '' };
    setForm(next);
    persist(next);
  };
  const onLang = (e) => {
    const next = { ...form, lang: e.target.value };
    setForm(next);
    persist(next);
    setLang(e.target.value);
  };
  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const size = 128;
      const side = Math.min(img.width, img.height) || size;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const next = { ...form, photo: c.toDataURL('image/jpeg', 0.82) };
      setForm(next);
      persist(next);
    };
    img.src = url;
  };
  const wipe = () => {
    if (!window.confirm(t('acc.wipeConfirm'))) return;
    try { localStorage.removeItem('mrcv.v1'); } catch (e) { /* ignore */ }
    try { clearUser(); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new Event('mrcv:user-changed')); } catch (e) { /* ignore */ }
    navigate('/');
  };

  return (
    <React.Fragment>
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('acc.title')}</h1>
              <p className="mb-0">{t('acc.sub')}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body p-4 text-center">
              <div className="icon-shape icon-xl bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3">
                {form.photo
                  ? <img src={form.photo} alt="" className="avatar avatar-xl rounded-circle" />
                  : <span className="fs-3 fw-bold">{(((form.name || '').trim().charAt(0)) || 'A').toUpperCase()}</span>}
              </div>
              <h3 className="h5 mb-0">{form.name.trim() || 'anonymous'}</h3>
              <p className="text-secondary small mb-1">{form.email || t('acc.notsigned')}</p>
              <p className="small mb-3"><span className="text-secondary">{t('acc.target')}</span>: <strong id="profileTarget">{target}</strong></p>
              <div className="d-flex justify-content-center gap-4">
                <div><strong>{cvs.length}</strong><br /><small className="text-secondary">{t('acc.cvs')}</small></div>
                <div><strong>{letters.length}</strong><br /><small className="text-secondary">{t('acc.letters')}</small></div>
                <div><strong>{dls}</strong><br /><small className="text-secondary">{t('acc.downloads')}</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <div className="card mb-3">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('acc.profile')}</h4></div>
            <div className="card-body p-4">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="row g-3">
                  <div className="col-12 d-flex align-items-center gap-3">
                    <span>{form.photo
                      ? <img src={form.photo} alt="" className="avatar avatar-xl rounded-circle" />
                      : <span className="avatar avatar-xl rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold fs-4">{(((form.name || '').trim().charAt(0)) || 'A').toUpperCase()}</span>}
                    </span>
                    <div>
                      <div className="fw-semibold small mb-1">{t('acc.photo')}</div>
                      <label className="btn btn-sm btn-outline-secondary mb-0" htmlFor="u-photo">{t('acc.choose')}</label>
                      <input id="u-photo" type="file" accept="image/*" className="d-none" onChange={onPhoto} />
                      <button className="btn btn-sm btn-link link-danger text-decoration-none" type="button" onClick={() => { const n = { ...form }; delete n.photo; setForm({ ...n, photo: '' }); persist({ ...n, photo: '' }); }}><span>{t('acc.remove')}</span></button>
                      <div className="form-text">Stored only on this device.</div>
                    </div>
                  </div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-name">{t('acc.name')}</label><input id="u-name" className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. Amina Juma" /></div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-phone">{t('acc.phone')}</label><input id="u-phone" className="form-control" value={form.phone} onChange={set('phone')} onBlur={(e) => { if (e.target.value.trim()) setForm((f) => ({ ...f, phone: normalizeTZPhone(e.target.value.trim()) })); }} inputMode="tel" placeholder="0765 123 456" /></div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-email">{t('acc.email')}</label><input id="u-email" className="form-control" value={form.email} onChange={set('email')} inputMode="email" placeholder="you@example.com" /></div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-lang">{t('acc.lang')}</label>
                    <select id="u-lang" className="form-select" value={form.lang} onChange={onLang}><option value="EN">English</option><option value="SW">Kiswahili</option></select>
                  </div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-country">{t('acc.country')}</label>
                    <select id="u-country" className="form-select" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, region: '' }))}>
                      {COUNTRIES.map((c) => <option value={c.code} key={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6"><label className="form-label" htmlFor="u-regionSel">{t('acc.region')}</label>
                    {regions.length ? (
                      <select id="u-regionSel" className="form-select" value={regions.includes(form.region) ? form.region : ''} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}>
                        <option value="">—</option>
                        {regions.map((r) => <option value={r} key={r}>{r}</option>)}
                      </select>
                    ) : (
                      <React.Fragment>
                        <input id="u-region" className="form-control" list="regionList" value={form.region} onChange={set('region')} placeholder="e.g. Nairobi" />
                        <datalist id="regionList"></datalist>
                      </React.Fragment>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary mt-3" onClick={onSave} type="button"><i className="ti ti-device-floppy"></i> <span>{t('acc.save')}</span></button>
                <span className="text-success small ms-2">{savedTick ? t('acc.saved') : ''}</span>
              </form>
            </div>
          </div>
          <div className="card border-danger">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5 text-danger">{t('acc.danger')}</h4></div>
            <div className="card-body p-4 d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-danger" onClick={wipe} type="button"><i className="ti ti-trash"></i> <span>{t('acc.wipe')}</span></button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

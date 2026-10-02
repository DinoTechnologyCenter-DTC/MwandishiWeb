import React from 'react';
import { useLang } from '../context.jsx';
import { useStore } from '../hooks.js';
import Modal from '../components/Modal.jsx';
import AITextLoading from '../components/AITextLoading.jsx';
import {
  deleteLetter, downloadDoc, downloadFromBackend, fmtDate,
  buildLetter, upsertLetter, plainLetterToHTML, letterExportCSS,
  letterSheetHTML, getUser, COUNTRIES, parseLetterParts, composeLetterParts,
  sanitizeLetter, letterPrompt, chatViaBackend,
} from '../lib/store.js';

export default function Letters() {
  const { t } = useLang();
  const { cvs, letters, refresh } = useStore();
  const [mode, setMode] = React.useState(() => {
    try { return localStorage.getItem('mrcv.letterMode') || null; } catch (e) { return null; }
  });
  const [editingId, setEditingId] = React.useState(null);
  const [job, setJob] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [manager, setManager] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [poBox, setPoBox] = React.useState('');
  const [myAddress, setMyAddress] = React.useState('');
  const [langSel, setLangSel] = React.useState('EN');
  const [ad, setAd] = React.useState('');
  const [bg, setBg] = React.useState('');
  const [keys, setKeys] = React.useState('');
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);
  const [savedOpen, setSavedOpen] = React.useState(false);
  const [shots, setShots] = React.useState([]);
  const [shotErr, setShotErr] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef(null);
  const [aiNote, setAiNote] = React.useState('');
  const [cvId, setCvId] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const [showRaw, setShowRaw] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [parts, setParts] = React.useState(() => parseLetterParts(''));

  // ---- job-advert image attachments -------------------------------------------
// Held in page state only: they are staged for a later AI pass that can read
// images. Nothing is uploaded and no model sees them yet.
const SHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SHOT_MAX_BYTES = 10 * 1024 * 1024;
const SHOT_MAX_EDGE = 1400;
const SHOT_MAX_COUNT = 4;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('read'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => resolve(img);
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// Downscale before storing: phone screenshots are 3-5 MB of base64, which is
// far more than a letter prompt ever needs.
async function toShot(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, SHOT_MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}

// Address boxes hold one line per row.
const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

const cvMap = React.useMemo(() => Object.fromEntries(cvs.map((c) => [c.id, c.name])), [cvs]);
  const cvNameOf = React.useCallback(
    (id) => { const c = cvs.find((x) => x.id === id); return c ? String(c.name).split('—')[0].trim() : ''; },
    [cvs],
  );

  const [user, setUser] = React.useState({});
  React.useEffect(() => { setUser(getUser()); }, [cvs.length]);

  // The name field is free text. It follows the selected CV until the user
  // types their own, after which picking a different CV leaves it alone.
  const senderName = (nameInput || cvNameOf(cvId) || user.name || '').trim();
  const pickCv = (id) => {
    const wasDefault = !nameInput || nameInput === cvNameOf(cvId);
    setCvId(id);
    if (wasDefault) setNameInput(cvNameOf(id) || nameInput);
  };

  const cur = React.useMemo(() => ({
    cvId, cvName: senderName || 'Your Name',
    jobTitle: job.trim(), company: company.trim(),
    manager: manager.trim(), lang: langSel,
  }), [cvId, senderName, job, company, manager, langSel]);

  const sw = langSel === 'SW';

  const letterMeta = React.useMemo(() => {
    const co = COUNTRIES.find((c) => c.code === user.country);
    const loc = [user.region, co ? co.name : user.country].filter(Boolean).join(', ');
    return {
      sender: senderName.toUpperCase(),
      // One line per row, so PO box / area / city all fit like the reference.
      senderLines: lines(myAddress).length ? lines(myAddress) : (loc ? [loc] : []),
      contact: user.phone ? `${sw ? 'Mawasiliano' : 'Phone'}: ${user.phone}` : '',
    };
  }, [senderName, myAddress, user.phone, user.region, user.country, sw]);

  const body = React.useMemo(() => composeLetterParts(parts), [parts]);
  const previewHTML = React.useMemo(() => plainLetterToHTML(body, letterMeta), [body, letterMeta]);

  // Address and role changes replace the whole letter; the name does not, so a
  // late name correction cannot silently discard hand-written paragraphs.
  const generate = React.useCallback((name) => {
    const next = parseLetterParts(buildLetter({
      cvName: name, jobTitle: job, company, manager, lang: langSel,
    }));
    // department, company, then any PO box / street line, then the city.
    const city = address.trim() || next.to[next.to.length - 1] || '';
    next.to = next.to.slice(0, 2).concat(lines(poBox), city ? [city] : []);
    return next;
  }, [job, company, manager, langSel, address, poBox]);

  const dirty = React.useRef(false);
  React.useEffect(() => {
    dirty.current = false;
    setParts(generate(senderName));
  }, [cvId, generate]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevName = React.useRef(senderName);
  React.useEffect(() => {
    if (prevName.current === senderName) return;
    prevName.current = senderName;
    setParts((p) => {
      if (!dirty.current) return generate(senderName);
      // Hand-edited: retarget only the signature, never the prose.
      const closing = p.closing.slice();
      if (closing.length > 1) closing[1] = senderName;
      else if (closing.length === 1) closing[0] = senderName;
      return { ...p, closing };
    });
  }, [senderName]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn) => { dirty.current = true; setParts(fn); };
  const patchParts = (patch) => edit((p) => ({ ...p, ...patch }));
  const setToLine = (i, val) => edit((p) => {
    const to = p.to.slice();
    while (to.length <= i) to.push('');
    to[i] = val;
    return { ...p, to };
  });
  const setClosing = (i, val) => edit((p) => {
    const closing = p.closing.slice();
    while (closing.length <= i) closing.push('');
    closing[i] = val;
    return { ...p, closing };
  });
  const setPara = (i, val) => edit((p) => {
    const paras = p.paras.slice();
    paras[i] = val;
    return { ...p, paras };
  });
  const addPara = () => edit((p) => ({ ...p, paras: [...p.paras, ''] }));
  const rmPara = (i) => edit((p) => ({ ...p, paras: p.paras.filter((_, x) => x !== i) }));

  const showMode = (m) => {
    setMode(m);
    try { localStorage.setItem('mrcv.letterMode', m || ''); } catch (e) { /* ignore */ }
  };

  const exportName = (title) => `Cover-Letter-${(String(title || 'draft')).replace(/[^\w -]+/g, '') || 'draft'}`;
  const currentSheet = () => {
    const sheet = document.getElementById('cvSheet');
    return sheet ? sheet.outerHTML : letterSheetHTML(previewHTML);
  };

  // Pixel-accurate PDF of the rendered sheet, falling back to the print dialog.
  const doPrint = async () => {
    const ok = await downloadFromBackend('pdf', {
      html: currentSheet(), css: letterExportCSS(), filename: exportName(job),
    });
    if (!ok) window.print();
  };

  const save = () => {
    if (!cur.jobTitle || !cur.company) { window.alert(t('ltr.needBoth')); return; }
    upsertLetter({ id: editingId, cvId: cur.cvId, senderName, jobTitle: cur.jobTitle, company: cur.company, lang: cur.lang, body });
    setEditingId(null);
    refresh();
  };
  const dl = async () => {
    const name = exportName(cur.jobTitle);
    const ok = await downloadFromBackend('docx', {
      html: currentSheet(), css: letterExportCSS(), filename: name,
    });
    if (!ok) downloadDoc(`${name}.doc`, body, { headline: false });
  };
  const onList = async (act, l) => {
    if (act === 'del') {
      if (!window.confirm(t('ltr.delConfirm'))) return;
      deleteLetter(l.id);
      refresh();
    }
    if (act === 'dl') {
      const meta = { ...letterMeta, sender: ((l.senderName || cvMap[l.cvId] || '').split('—')[0].trim() || letterMeta.sender).toUpperCase() };
      const ok = await downloadFromBackend('docx', {
        html: letterSheetHTML(plainLetterToHTML(l.body, meta)),
        css: letterExportCSS(),
        filename: exportName(l.jobTitle),
      });
      if (!ok) downloadDoc(`${exportName(l.jobTitle)}.doc`, l.body, { headline: false });
    }
    if (act === 'edit') {
      setSavedOpen(false);
      setGenerated(false);
      setEditingId(l.id);
      pickCv(l.cvId);
      setNameInput(l.senderName || cvNameOf(l.cvId) || '');
      setJob(l.jobTitle);
      setCompany(l.company);
      setLangSel(l.lang);
      const savedTo = parseLetterParts(l.body).to;
      setManager(savedTo[0] && !/^(ndugu|dear|meneja wa ajira|the hiring manager)/i.test(savedTo[0]) ? savedTo[0] : '');
      setCompany(savedTo[1] || l.company);
      setPoBox(savedTo.length > 3 ? savedTo[savedTo.length - 2] : '');
      setAddress(savedTo.length ? savedTo[savedTo.length - 1] : '');
      dirty.current = true;
      setParts(parseLetterParts(l.body));
      document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Real AI via the backend (Groq). If it is unconfigured or unreachable we fall
  // back to the local template so the button always produces a usable letter.
  const addShots = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setShotErr('');
    const room = SHOT_MAX_COUNT - shots.length;
    if (room <= 0) { setShotErr(t('ai2.shotErrLimit')); return; }
    const usable = list.filter((f) => SHOT_TYPES.includes(f.type));
    if (usable.length !== list.length) setShotErr(t('ai2.shotErrType'));
    if (usable.some((f) => f.size > SHOT_MAX_BYTES)) {
      setShotErr(t('ai2.shotErrSize'));
      return;
    }
    const taken = usable.slice(0, room);
    if (usable.length > room) setShotErr(t('ai2.shotErrLimit'));
    try {
      const added = await Promise.all(taken.map(async (f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        dataUrl: await toShot(f),
      })));
      setShots((prev) => prev.concat(added).slice(0, SHOT_MAX_COUNT));
    } catch (e) {
      setShotErr(t('ai2.shotErrType'));
    }
  };

  // A screenshot pasted straight into the advert box is the quickest route.
  const onAdvertPaste = (e) => {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const files = items
      .filter((i) => i.kind === 'file' && SHOT_TYPES.includes(i.type))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (files.length) { e.preventDefault(); addShots(files); }
  };

  const rmShot = (id) => { setShots((prev) => prev.filter((x) => x.id !== id)); setShotErr(''); };

  // Progress copy for the dialog. Reading the image only appears when one was
  // attached, so the animation never claims work it is not doing.
  const loadTexts = React.useMemo(() => {
    const base = [t('ai2.load1'), t('ai2.load2'), t('ai2.load3')];
    if (shots.length) base.splice(1, 0, t('ai2.loadImg'));
    return base.concat([t('ai2.load4'), t('ai2.load5')]);
  }, [t, shots.length]);

  const aiReady = Boolean(cur.jobTitle && cur.company);

  const aiGenerate = async () => {
    if (!cur.jobTitle || !cur.company || aiBusy) return;
    setAiBusy(true);
    setAiNote('');
    const kws = topKeywords(ad);
    let text = '';
    try {
      const r = await chatViaBackend(
        [{ role: 'user', content: letterPrompt({ name: senderName, jobTitle: job, company, manager, lang: langSel, ad, bg, kws }) }],
        langSel,
      );
      if (r && typeof r.reply === 'string') text = sanitizeLetter(r.reply);
    } catch (e) { text = ''; }
    const usable = text.length > 80 && /(\n\s*\n)/.test(text);
    dirty.current = true;
    setParts(parseLetterParts(usable ? text : tailoredLetter({ ...cur, cvName: senderName }, kws, bg)));
    setKeys(kws.length ? `${t('ai2.matched')} ${kws.join(', ')}` : '');
    setAiNote(usable ? '' : t('ai2.fallback'));
    setGenerated(true);
    setAiBusy(false);
    setAiOpen(false);
    document.getElementById('cvSheet').scrollIntoView({ behavior: 'smooth' });
  };

  const newLetter = () => {
    setGenerated(false); setEditingId(null); setJob(''); setCompany(''); setManager(''); setAddress(''); setPoBox(''); setMyAddress('');
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  };

  const openRaw = () => { setRawText(body); setShowRaw(true); };
  const commitRaw = () => { dirty.current = true; setParts(parseLetterParts(rawText)); setShowRaw(false); };

  return (
    <React.Fragment>
      <div className="row no-print">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('ltr.title')}</h1>
              <p className="mb-0">{t('ltr.sub')}</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <div className="card px-3 py-2 text-center"><small className="text-secondary">{t('ltr.letters')}</small><br /><strong>{letters.length}</strong></div>
              <div className="card px-3 py-2 text-center"><small className="text-secondary">{t('ltr.cvsready')}</small><br /><strong>{cvs.length}</strong></div>
              <button className="btn btn-outline-secondary align-self-center" onClick={() => setSavedOpen(true)}>
                <i className="ti ti-mail"></i> {t('ltr.saved')} ({letters.length})
              </button>
              <button className="btn btn-primary align-self-center" onClick={newLetter}><i className="ti ti-plus"></i> {t('ltr.new')}</button>
              <a href="#cvSheet" className="btn btn-outline-secondary align-self-center d-lg-none"><i className="ti ti-eye"></i> {t('bld.preview')}</a>
            </div>
          </div>
        </div>
      </div>
      {!mode ? (
        <div className="row no-print mb-3">
          <div className="col-12">
            <div className="card">
              <div className="card-body p-3 p-md-4">
                <h2 className="h6 mb-2">{t('mode.choose')}</h2>
                <div className="row g-2">
                  <div className="col-md-6">
                    <button className="btn btn-outline-primary w-100 p-3 text-start" onClick={() => showMode('manual')}>
                      <i className="ti ti-edit fs-4 d-block mb-1"></i>
                      <strong>{t('mode.manual')}</strong><br />
                      <small className="text-secondary">{t('mode.manualSub')}</small>
                    </button>
                  </div>
                  <div className="col-md-6">
                    <button className="btn btn-outline-primary w-100 p-3 text-start" onClick={() => { showMode('ai'); setAiOpen(true); }}>
                      <i className="ti ti-sparkles fs-4 d-block mb-1"></i>
                      <strong>{t('mode.ai')}</strong><br />
                      <small className="text-secondary">{t('mode.aiSub')}</small>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row no-print mb-2">
          <div className="col-12">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary">{mode === 'ai' ? t('mode.ai') : t('mode.manual')}</span>
              <button className="btn btn-sm btn-link p-0" onClick={() => showMode(null)}><span>{t('mode.change')}</span></button>
            </div>
          </div>
        </div>
      )}
      <div className="row g-3">
        <div className="col-12 col-lg-6 no-print" id="builderCol">
          {mode === 'ai' ? (
            <div className="card mb-3 border-primary" id="aiCard">
              <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row align-items-md-center gap-3">
                <div className="icon-shape icon-lg bg-primary bg-opacity-10 text-primary rounded-2 flex-shrink-0"><i className="ti ti-sparkles fs-4"></i></div>
                <div className="flex-grow-1">
                  <h2 className="h6 mb-1">{t('ai2.cardTitle')}</h2>
                  <small className="text-secondary d-block">{keys || t('ai2.cardSub')}</small>
                  {aiNote ? <small className="text-secondary d-block mt-1"><i className="ti ti-info-circle"></i> {aiNote}</small> : null}
                </div>
                <button type="button" className="btn btn-primary flex-shrink-0" onClick={() => setAiOpen(true)}>
                  <i className="ti ti-sparkles"></i> <span>{t('ai2.open')}</span>
                </button>
              </div>
            </div>
          ) : null}

          {generated ? null : (
          <div className="card mb-3" id="details">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('ltr.details')}</h4></div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label" htmlFor="letterName">{t('ltr.yourname')}</label>
                  <div className="input-group">
                    <input id="letterName" className="form-control" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Amina Juma" autoComplete="name" />
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setNameInput(cvNameOf(cvId) || user.name || '')} title={t('ltr.nameFromCv')} disabled={!cvNameOf(cvId)}><i className="ti ti-id"></i></button>
                  </div>
                  <div className="form-text">{t('ltr.nameHint')}</div>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="letterMyAddress">{t('ltr.myaddress')}</label>
                  <textarea id="letterMyAddress" className="form-control" rows="3" value={myAddress} onChange={(e) => setMyAddress(e.target.value)} placeholder={`${sw ? 'S.L.P' : 'P.O. Box'} 15101\nTEMEKE\nDAR ES SALAAM`}></textarea>
                  <div className="form-text">{t('ltr.myaddressHint')}</div>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="letterCv">{t('ltr.usecv')}</label>
                  <select id="letterCv" className="form-select" value={cvId} onChange={(e) => pickCv(e.target.value)}>
                    <option value="">{t('ltr.nocv')}</option>
                    {cvs.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="letterJob">{t('ltr.job')}</label>
                  <input id="letterJob" className="form-control" value={job} onChange={(e) => setJob(e.target.value)} placeholder="e.g. Bank Teller" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="letterCompany">{t('ltr.company')}</label>
                  <input id="letterCompany" className="form-control" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. CRDB Bank" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="letterManager">{t('ltr.manager')}</label>
                  <input id="letterManager" className="form-control" value={manager} onChange={(e) => setManager(e.target.value)} placeholder={t('ltr.blank')} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="letterPoBox">{t('ltr.pobox')}</label>
                  <input id="letterPoBox" className="form-control" value={poBox} onChange={(e) => setPoBox(e.target.value)} placeholder={`${sw ? 'S.L.P' : 'P.O. Box'} 19875`} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="letterAddress">{t('ltr.address')}</label>
                  <input id="letterAddress" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dar es Salaam" />
                </div>
                <div className="col-md-6">
                  <label className="form-label d-block">{t('ltr.lang')}</label>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="letterLang" id="langEN" value="EN" checked={langSel === 'EN'} onChange={() => setLangSel('EN')} />
                    <label className="form-check-label" htmlFor="langEN">English</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="letterLang" id="langSW" value="SW" checked={langSel === 'SW'} onChange={() => setLangSel('SW')} />
                    <label className="form-check-label" htmlFor="langSW">Kiswahili</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
          {generated ? null : (
          <div className="card mb-3" id="content">
            <div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center">
              <h4 className="mb-0 h5">{t('ltr.custom')}</h4>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => (showRaw ? commitRaw() : openRaw())}>
                <i className={`ti ${showRaw ? 'ti-device-floppy' : 'ti-text'}`}></i> <span>{showRaw ? t('ltr.applyRaw') : t('ltr.editRaw')}</span>
              </button>
            </div>
            <div className="card-body p-4">
              {showRaw ? (
                <textarea id="letterRaw" className="form-control" rows="16" value={rawText} onChange={(e) => setRawText(e.target.value)} spellCheck="false"></textarea>
              ) : (
                <React.Fragment>
                  <label className="form-label d-block">{t('ltr.recipient')}</label>
                  {parts.to.map((line, i) => (
                    <div className="mb-2" key={`to${i}`}>
                      <input className="form-control" value={line} onChange={(e) => setToLine(i, e.target.value)}
                        placeholder={[`${sw ? 'k.m.' : 'e.g.'} ${sw ? 'RASILIMALI WA WATU' : 'HUMAN RESOURCE'}`, `${sw ? 'k.m.' : 'e.g.'} ${sw ? 'JINA LA KAMPUNI' : 'COMPANY NAME'}`, `${sw ? 'S.L.P' : 'P.O. Box'} 19875`, 'Dar es Salaam'][i] || ''}
                        aria-label={`${t('ltr.recipient')} ${i + 1}`} />
                    </div>
                  ))}
                  <button className="btn btn-sm btn-outline-secondary mb-3" type="button" onClick={() => setToLine(parts.to.length, '')}>
                    <i className="ti ti-plus"></i> <span>{t('ltr.addLine')}</span>
                  </button>
                  <div className="row g-3 mb-1">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="ltSalute">{t('ltr.salutation')}</label>
                      <input id="ltSalute" className="form-control" value={parts.salutation} onChange={(e) => patchParts({ salutation: e.target.value })} placeholder="Ndugu Meneja," />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="ltSubject">{t('ltr.subject')}</label>
                      <input id="ltSubject" className="form-control" value={parts.subject} onChange={(e) => patchParts({ subject: e.target.value })} placeholder={langSel === 'SW' ? 'YAH: MAOMBI YA KAZI YA …' : 'RE: APPLICATION FOR THE POSITION OF …'} />
                    </div>
                  </div>
                  <label className="form-label d-block mt-3">{t('ltr.paras')}</label>
                  {parts.paras.map((p, i) => (
                    <div className="mb-2" key={`p${i}`}>
                      <textarea className="form-control" rows="4" value={p} onChange={(e) => setPara(i, e.target.value)} aria-label={`${t('ltr.paras')} ${i + 1}`}></textarea>
                      {parts.paras.length > 1 ? (
                        <button className="btn btn-sm btn-link link-danger p-0 mt-1" type="button" onClick={() => rmPara(i)}><i className="ti ti-trash"></i> <span>{t('ltr.rmPara')}</span></button>
                      ) : null}
                    </div>
                  ))}
                  <button className="btn btn-sm btn-outline-primary mb-3" type="button" onClick={addPara}><i className="ti ti-plus"></i> <span>{t('ltr.addPara')}</span></button>
                  <label className="form-label d-block">{t('ltr.signoff')}</label>
                  {[0, 1, 2].map((i) => (
                    <div className="mb-2" key={`c${i}`}>
                      <input className="form-control" value={parts.closing[i] || ''} onChange={(e) => setClosing(i, e.target.value)}
                        placeholder={[sw ? 'Wako mtiifu,' : 'Yours faithfully,', senderName || (sw ? 'Jina Langu' : 'Your Name'), sw ? 'Viambatanisho: CV' : 'Attachments: CV'][i]} aria-label={`${t('ltr.signoff')} ${i + 1}`} />
                    </div>
                  ))}
                </React.Fragment>
              )}
            </div>
          </div>
          )}
          <div className="card" id="generator">
            <div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center">
              <h4 className="mb-0 h5">{t('ltr.generate')}</h4>
              <div className="d-flex gap-2">
                {generated ? (
                  <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setGenerated(false)}>
                    <i className="ti ti-edit"></i> <span>{t('ltr.editAgain')}</span>
                  </button>
                ) : null}
                <button className="btn btn-sm btn-primary" type="button" onClick={save}><i className="ti ti-device-floppy"></i> <span>{t('ltr.save')}</span></button>
              </div>
            </div>
            <div className="card-body p-3">
              <div className="form-text mb-0">{t('ltr.tip')}</div>
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h6"><span className="badge bg-primary me-2">1</span><span>{t('bld.export')}</span></h4></div>
            <div className="card-body p-3 d-flex gap-2 flex-wrap">
              <button className="btn btn-primary" type="button" onClick={doPrint}><i className="ti ti-printer"></i> <span>{t('bld.pdf')}</span></button>
              <button className="btn btn-outline-secondary" type="button" onClick={dl}><i className="ti ti-download"></i> .doc</button>
              <button className="btn btn-outline-success" type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank', 'noopener')}><i className="ti ti-brand-whatsapp"></i> WhatsApp</button>
              <div className="form-text w-100">{t('bld.pdfNote')}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6" id="cvCol">
          <div className="d-flex justify-content-between align-items-center mb-2 no-print">
            <small className="text-secondary">{t('preview.live')}</small>
          </div>
          <div className="position-sticky no-print-offset" style={{ top: '76px' }}>
            <div className="cv-sheet tpl-letter" id="cvSheet" dangerouslySetInnerHTML={{ __html: previewHTML }}></div>
          </div>
        </div>
      </div>
      <Modal
        open={aiOpen}
        onClose={() => { if (!aiBusy) setAiOpen(false); }}
        title={<span><i className="ti ti-sparkles text-primary"></i> {t('ai2.dialogTitle')}</span>}
        size="modal-lg"
        footer={(
          <React.Fragment>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAiOpen(false)} disabled={aiBusy}>{t('ai2.cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={aiGenerate} disabled={aiBusy || !aiReady}>
              {aiBusy ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="ti ti-sparkles"></i>}
              <span>{t('ai2.generate')}</span>
            </button>
          </React.Fragment>
        )}
      >
        <div className="text-start">
          {aiBusy ? <AITextLoading texts={loadTexts} /> : null}
          {!aiBusy && !aiReady ? (
            <div className="alert alert-warning py-2 px-3 small" role="alert">
              <i className="ti ti-alert-triangle"></i> {t('ai2.needDetails')}
            </div>
          ) : null}
          {aiBusy ? null : (
          <React.Fragment>
          <div className="mb-3">
            <label className="form-label" htmlFor="aiAd">{t('ai2.ad')}</label>
            <textarea id="aiAd" className="form-control" rows="6" value={ad} onChange={(e) => setAd(e.target.value)} onPaste={onAdvertPaste} placeholder="Paste the full job description here…"></textarea>
            <div
              className={`dropzone mt-2${dragOver ? ' is-over' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={t('ai2.shotDrop')}
              onClick={() => fileRef.current && fileRef.current.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (fileRef.current) fileRef.current.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addShots(e.dataTransfer ? e.dataTransfer.files : null);
              }}
            >
              <i className="ti ti-photo-plus dropzone-icon"></i>
              <span className="d-block">{t('ai2.shotDrop')}</span>
              <small className="text-secondary d-block">{t('ai2.shotDropHint')}</small>
              <input
                ref={fileRef}
                type="file"
                accept={SHOT_TYPES.join(',')}
                multiple
                className="d-none"
                onChange={(e) => { addShots(e.target.files); e.target.value = ''; }}
              />
            </div>
            {shotErr ? <div className="text-danger small mt-1"><i className="ti ti-alert-circle"></i> {shotErr}</div> : null}
            {shots.length ? (
              <div className="mt-2">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <small className="text-secondary">{t('ai2.shotCount').replace('{n}', shots.length)}</small>
                  <button type="button" className="btn btn-sm btn-link p-0" onClick={() => { setShots([]); setShotErr(''); }}>{t('ai2.shotClear')}</button>
                </div>
                <div className="shot-grid">
                  {shots.map((x) => (
                    <div className="shot" key={x.id}>
                      <img src={x.dataUrl} alt={x.name} />
                      <button type="button" className="shot-x" title={t('ai2.shotRemove')} aria-label={t('ai2.shotRemove')} onClick={() => rmShot(x.id)}>
                        <i className="ti ti-x"></i>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-secondary small mt-2"><i className="ti ti-info-circle"></i> {t('ai2.shotPending')}</div>
              </div>
            ) : null}
          </div>
          <div className="mb-2">
            <label className="form-label" htmlFor="aiBg">{t('ai2.bg')}</label>
            <textarea id="aiBg" className="form-control" rows="4" value={bg} onChange={(e) => setBg(e.target.value)} placeholder="e.g. 2 years shop experience, good with customers, diploma…"></textarea>
          </div>
          {keys ? <div className="text-secondary small"><i className="ti ti-bulb"></i> {keys}</div> : null}
          </React.Fragment>
          )}
        </div>
      </Modal>
      <Modal
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        title={`${t('ltr.saved')} (${letters.length})`}
        size="modal-lg"
        scrollable
        footer={<button type="button" className="btn btn-primary" onClick={() => setSavedOpen(false)}>{t('ai2.close')}</button>}
      >
        <div className="text-start">
          <div className="list-group list-group-flush">
            {letters.length === 0 ? (
              <div className="text-center py-5">
                <i className="ti ti-mail fs-1 text-secondary"></i>
                <h3 className="h6 mt-3">{t('ltr.noletters')}</h3>
                <p className="text-secondary small">{t('ltr.nolettersSub')}</p>
              </div>
            ) : letters.map((l) => (
              <div className="list-group-item p-3" key={l.id}>
                <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center">
                  <div className="icon-shape icon-md bg-info bg-opacity-10 text-info rounded-2 flex-shrink-0"><i className="ti ti-mail fs-4"></i></div>
                  <div className="flex-grow-1">
                    <strong>{l.jobTitle} — {l.company}</strong>
                    <span className="badge bg-light text-secondary border ms-1">{l.lang}</span><br />
                    <small className="text-secondary">
                      {t('ltr.from')} {(l.senderName || cvMap[l.cvId] || 'CV').split('—')[0].trim()} · Updated {fmtDate(l.updatedAt)}
                    </small>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onList('edit', l)} title="Edit"><i className="ti ti-edit"></i></button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => onList('dl', l)} title="Download .doc"><i className="ti ti-download"></i></button>
                    <a className="btn btn-sm btn-outline-success" target="_blank" rel="noopener noreferrer" title="Share via WhatsApp" href={`https://wa.me/?text=${encodeURIComponent(l.body)}`}><i className="ti ti-brand-whatsapp"></i></a>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onList('del', l)} title="Delete"><i className="ti ti-trash"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </React.Fragment>
  );
}

const AD_STOP = new Set('the,a,an,and,or,for,with,you,your,our,are,will,have,has,who,can,all,from,that,this,shall,should,would,position,role,work,team,company,job,required,requirements,experience,skills,ability,strong,plus,must,join,looking,seeking,ideal,apply,bank,tz,ajira,kazi,katika,kwa,na,ya,za,wa,hii,hiyo,kama,ili,ni,sana,tena,yetu,yako,yao,mimi,sisi,wewe,also,into,over,under,more,most,very,just,than,about,them,they,their,been,were,was,had,not,but'.split(','));

function topKeywords(text, n = 3) {
  const freq = {};
  (String(text).toLowerCase().match(/[a-z]{5,}/g) || []).forEach((w) => { if (!AD_STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w.replace(/^\w/, (c) => c.toUpperCase()));
}

function tailoredLetter(f, kws, bg) {
  const jt = f.jobTitle || 'the advertised position';
  const co = f.company || 'your organisation';
  const mgr = f.manager;
  const bgSnip = String(bg).split(/[.\n]+/).map((s) => s.trim()).filter(Boolean)[0] || (f.lang === 'SW' ? 'uzoefu wangu' : 'my experience');
  const kwTxt = kws.length ? kws.join(', ') : (f.lang === 'SW' ? 'sifa muhimu' : 'key requirements');
  const date = fmtDate(new Date());
  if (f.lang === 'SW') {
    return `${date}\n${mgr || 'Meneja wa Ajira'}\n${co}\nDar es Salaam, Tanzania\n\nNdugu Meneja,\n\nYAH: MAOMBI YA KAZI YA ${jt.toUpperCase()}\n\n${f.cvName ? `Mimi, ${f.cvName}, ninaomba` : 'Ninaomba'} kazi ya ${jt} kama ilivyotangazwa.\n\nKutokana na historia yangu — ${bgSnip} — ninafaa mahitaji yako muhimu (${kwTxt}). Wasifu wangu (CV) nilioambatanisha unaeleza elimu, ujuzi na uzoefu wangu zaidi.\n\nNitafurahi kupata fursa ya kujadili maombi yangu kwenye usaili.\n\nWako mtiifu,\n${f.cvName}\nViambatanisho: CV`;
  }
  return `${date}\n${mgr || 'The Hiring Manager'}\n${co}\nDar es Salaam, Tanzania\n\nDear ${mgr ? mgr : 'Sir/Madam'},\n\nRE: APPLICATION FOR THE POSITION OF ${jt.toUpperCase()}\n\n${f.cvName ? `I, ${f.cvName}, wish to apply` : 'I wish to apply'} for the above position as advertised.\n\nDrawing from my background — ${bgSnip} — I am a strong match for your key requirements (${kwTxt}). My CV, attached herewith, outlines my education, skills and experience in more detail.\n\nI would welcome the opportunity to discuss my application at an interview.\n\nYours faithfully,\n${f.cvName}\nAttachments: CV`;
}

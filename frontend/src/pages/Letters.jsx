import React from 'react';
import { useLang } from '../context.jsx';
import { useStore } from '../hooks.js';
import {
  deleteLetter, downloadDoc, downloadFromBackend, esc, fmtDate,
  buildLetter, upsertLetter, waLink,
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
  const [langSel, setLangSel] = React.useState('EN');
  const [body, setBody] = React.useState('');
  const [ad, setAd] = React.useState('');
  const [bg, setBg] = React.useState('');
  const [keys, setKeys] = React.useState('');
  const [cvId, setCvId] = React.useState('');

  const cvMap = React.useMemo(() => Object.fromEntries(cvs.map((c) => [c.id, c.name])), [cvs]);
  const cur = React.useMemo(() => {
    const cv = cvs.find((c) => c.id === cvId) || cvs[0];
    return {
      cvId: cv ? cv.id : '',
      cvName: cv ? cv.name.split('—')[0].trim() : 'Your Name',
      jobTitle: job.trim(), company: company.trim(), manager: manager.trim(), lang: langSel,
    };
  }, [cvs, cvId, job, company, manager, langSel]);

  React.useEffect(() => {
    setBody(buildLetter({ ...cur, jobTitle: cur.jobTitle, company: cur.company }));
  }, [cur.cvId, job, company, manager, langSel]);
  const showMode = (m) => {
    setMode(m);
    try { localStorage.setItem('mrcv.letterMode', m || ''); } catch (e) { /* ignore */ }
  };
  const refreshPreview = () => setBody(buildLetter(cur));

  const save = () => {
    if (!cur.jobTitle || !cur.company) { window.alert(t('ltr.needBoth')); return; }
    upsertLetter({ id: editingId, cvId: cur.cvId, jobTitle: cur.jobTitle, company: cur.company, lang: cur.lang, body });
    setEditingId(null);
    refresh();
  };
  const dl = async () => {
    const name = `Cover-Letter-${cur.jobTitle || 'draft'}`;
    const html = body.split('\n').map((p) => (p.trim() ? `<p>${esc(p.trim())}</p>` : '')).join('');
    const ok = await downloadFromBackend('docx', { html, css: 'body{font-family:Georgia,serif;font-size:12pt;}p{margin:0 0 8pt;}', filename: name });
    if (!ok) downloadDoc(`${name}.doc`, body, { headline: false });
  };
  const onList = async (act, l) => {
    if (act === 'del') {
      if (!window.confirm(t('ltr.delConfirm'))) return;
      deleteLetter(l.id);
      refresh();
    }
    if (act === 'dl') {
      const html = l.body.split('\n').map((p) => (p.trim() ? `<p>${esc(p.trim())}</p>` : '')).join('');
      const ok = await downloadFromBackend('docx', { html, css: 'body{font-family:Georgia,serif;font-size:12pt;}p{margin:0 0 8pt;}', filename: `Cover-Letter-${l.jobTitle}` });
      if (!ok) downloadDoc(`Cover-Letter-${l.jobTitle}.doc`, l.body, { headline: false });
    }
    if (act === 'edit') {
      setEditingId(l.id);
      setCvId(l.cvId);
      setJob(l.jobTitle);
      setCompany(l.company);
      setLangSel(l.lang);
      setBody(l.body);
      document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
    }
  };
  const aiGenerate = () => {
    if (!cur.jobTitle || !cur.company) { window.alert(t('ltr.needBoth')); return; }
    const kws = topKeywords(ad);
    const tailored = tailoredLetter(cur, kws, bg);
    setBody(tailored);
    setKeys(kws.length ? `${t('ai2.matched')} ${kws.join(', ')}` : '');
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <React.Fragment>
      {!mode ? (
        <div className="row no-print">
          <div className="col-12">
            <div className="card mb-3">
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
                    <button className="btn btn-outline-primary w-100 p-3 text-start" onClick={() => showMode('ai')}>
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
        <div className="row no-print">
          <div className="col-12">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge bg-primary">{mode === 'ai' ? t('mode.ai') : t('mode.manual')}</span>
              <button className="btn btn-sm btn-link p-0" onClick={() => showMode(null)}><span>{t('mode.change')}</span></button>
            </div>
          </div>
        </div>
      )}
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('ltr.title')}</h1>
              <p className="mb-0">{t('ltr.sub')}</p>
            </div>
            <div className="d-flex gap-2">
              <div className="card px-3 py-2 text-center"><small className="text-secondary">{t('ltr.letters')}</small><br /><strong>{letters.length}</strong></div>
              <div className="card px-3 py-2 text-center"><small className="text-secondary">{t('ltr.cvsready')}</small><br /><strong>{cvs.length}</strong></div>
              <button className="btn btn-primary align-self-center" onClick={() => { setEditingId(null); setJob(''); setCompany(''); setManager(''); document.getElementById('generator').scrollIntoView({ behavior: 'smooth' }); }}><i className="ti ti-plus"></i> {t('ltr.new')}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('ltr.saved')}</h4></div>
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
                      <small className="text-secondary">{t('ltr.from')} {cvMap[l.cvId] || 'CV'} · Updated {fmtDate(l.updatedAt)}</small>
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
        </div>
        <div className="col-12 col-lg-7" id="generator">
          {mode === 'ai' ? (
            <div className="card mb-3">
              <div className="card-body p-3 p-md-4">
                <h2 className="h6 mb-3"><i className="ti ti-sparkles text-primary"></i> <span>{t('mode.ai')}</span> <small className="text-secondary fw-normal">{t('ai.offline')}</small></h2>
                <div className="row g-2">
                  <div className="col-12"><label className="form-label" htmlFor="aiAd">{t('ai2.ad')}</label><textarea id="aiAd" className="form-control" rows="4" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Paste the full job description here…"></textarea></div>
                  <div className="col-12"><label className="form-label" htmlFor="aiBg">{t('ai2.bg')}</label><textarea id="aiBg" className="form-control" rows="3" value={bg} onChange={(e) => setBg(e.target.value)} placeholder="e.g. 2 years shop experience, good with customers, diploma…"></textarea></div>
                  <div className="col-12"><button className="btn btn-primary" onClick={aiGenerate}><i className="ti ti-sparkles"></i> <span>{t('ai2.generate')}</span></button> <span className="text-secondary small ms-2">{keys}</span></div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="card">
            <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h5">{t('ltr.generate')}</h4></div>
            <div className="card-body p-4">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="row g-3 mb-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="letterCv">{t('ltr.usecv')}</label>
                    <select id="letterCv" className="form-select" value={cur.cvId} onChange={(e) => setCvId(e.target.value)}>
                      {cvs.length === 0 ? <option value="">No CVs yet — create one first</option> : cvs.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
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
                <div className="mb-3">
                  <label className="form-label" htmlFor="letterBody">{t('ltr.body')}</label>
                  <textarea id="letterBody" className="form-control" rows="14" value={body} onChange={(e) => setBody(e.target.value)}></textarea>
                  <div className="form-text">{t('ltr.tip')}</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={save} type="button"><i className="ti ti-device-floppy"></i> <span>{t('ltr.save')}</span></button>
                  <button className="btn btn-outline-secondary" onClick={dl} type="button"><i className="ti ti-download"></i> <span>{t('ltr.dl')}</span></button>
                  <button className="btn btn-outline-success" onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank', 'noopener'); }} type="button"><i className="ti ti-brand-whatsapp"></i> WhatsApp</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
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
    return `${date}\n${mgr || 'Meneja wa Ajira'}\n${co}\nDar es Salaam, Tanzania\n\nNdugu Meneja,\n\nYAH: MAOMBI YA KAZI YA ${jt.toUpperCase()}\n\nMimi, ${f.cvName}, ninaomba kazi ya ${jt} kama ilivyotangazwa.\n\nKutokana na historia yangu — ${bgSnip} — ninafaa mahitaji yako muhimu (${kwTxt}). Wasifu wangu (CV) nilioambatanisha unaeleza elimu, ujuzi na uzoefu wangu zaidi.\n\nNitafurahi kupata fursa ya kujadili maombi yangu kwenye usaili.\n\nWako mtiifu,\n${f.cvName}\nViambatanisho: CV`;
  }
  return `${date}\n${mgr || 'The Hiring Manager'}\n${co}\nDar es Salaam, Tanzania\n\nDear ${mgr ? mgr : 'Sir/Madam'},\n\nRE: APPLICATION FOR THE POSITION OF ${jt.toUpperCase()}\n\nI, ${f.cvName}, wish to apply for the above position as advertised.\n\nDrawing from my background — ${bgSnip} — I am a strong match for your key requirements (${kwTxt}). My CV, attached herewith, outlines my education, skills and experience in more detail.\n\nI would welcome the opportunity to discuss my application at an interview.\n\nYours faithfully,\n${f.cvName}\nAttachments: CV`;
}

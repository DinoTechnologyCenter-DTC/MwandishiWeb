import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../context.jsx';
import {
  blankData, createCV, getCV, updateCV, TEMPLATE_LABELS, COUNTRIES, esc,
  waLink, downloadStyledDoc, downloadFromBackend, draftViaBackend,
  chatViaBackend, collectSheetCSS, cvThemedHTML, cvExactHTML, cvToHTML,
  normalizeTZPhone, parseLevel, withExportPatch,
} from '../lib/store.js';
import Modal from '../components/Modal.jsx';
import AITextLoading from '../components/AITextLoading.jsx';
import logoUrl from '../assets/images/logo-leaf.png';

const TPL_DEFAULTS = { graduate: '#008000', government: '#00C951', banking: '#008000', general: '#008000', clinical: '#244655', exact: '#244655' };
const FONTS = { poppins: "'Poppins',sans-serif", georgia: "Georgia,Gelasio,'Times New Roman',serif", arial: "Arial,'Liberation Sans',Helvetica,sans-serif" };
const SIZES = { s: '12px', m: '13px', l: '14.5px' };
const TZ_CITIES = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Moshi', 'Iringa', 'Tabora', 'Kigoma', 'Shinyanga', 'Mtwara', 'Lindi', 'Singida', 'Bukoba', 'Musoma', 'Zanzibar', 'Kariakoo', 'Ubungo', 'Kinondoni', 'Temeke'];
const SKILL_WORDS = ['computer', 'driving', 'teaching', 'cooking', 'tailoring', 'electrical', 'plumbing', 'networking', 'office', 'communication', 'leadership', 'teamwork', 'customer', 'sales', 'cashier', 'typing', 'english', 'kiswahili', 'first aid', 'carpentry', 'welding', 'hairdressing', 'photography', 'accounting'];

let uid = 1;

function formatReply(text) {
  const lines = String(text || '').split('\n');
  let html = '';
  let list = [];
  const flush = () => {
    if (list.length) {
      html += `<ol class="mb-1 ps-3">${list.map((li) => `<li>${esc(li)}</li>`).join('')}</ol>`;
      list = [];
    }
  };
  for (const ln of lines) {
    const m = ln.match(/^\s*\d+[.)]\s+(.+)$/);
    if (m) list.push(m[1].trim());
    else {
      flush();
      if (ln.trim()) html += `${esc(ln.trim())}<br>`;
    }
  }
  flush();
  return html.replace(/<br>$/, '');
}

function aiDraft(src, langCode) {
  const s = src || {};
  const sw = langCode === 'SW';
  const name = String(s.name || '').trim();
  const job = String(s.job || '').trim() || 'General Worker';
  const level = s.level || 'student';
  const about = String(s.about || '');
  const d = blankData();
  d.personal.fullName = name;
  d.personal.title = job;
  const ph = about.match(/(\+255|0)\s?\d{3}\s?\d{3}\s?\d{3}/);
  if (ph) d.personal.phone = normalizeTZPhone(ph[0]);
  const em = about.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (em) d.personal.email = em[0].replace(/[.,;]+$/, '');
  const city = TZ_CITIES.find((c) => about.toLowerCase().includes(c.toLowerCase()));
  if (city) d.personal.address = city;
  const summaries = {
    student: sw ? `Mwanafunzi mwenye bidii anayetafuta nafasi ya ${job}. Haraka kujifunza, mwenye nidhamu na tayari kuchangia tangu siku ya kwanza.`
      : `Motivated and hardworking student seeking a ${job} position. Quick to learn, disciplined and ready to contribute from day one.`,
    fresher: sw ? `Mhitimu mpya mwenye nguvu anayetafuta kazi ya ${job}. Niko tayari kutumia mafunzo yangu, kujifunza haraka na kutoa matokeo.`
      : `Energetic fresh graduate seeking a ${job} position. Eager to apply my training, learn fast and deliver results.`,
    experienced: sw ? `Mwenye uzoefu kama ${job} mwenye rekodi ya kazi ya kuaminika na yenye ubora. Mawasiliano mazuri, mchezaji wa timu na mtatuzi wa matatizo.`
      : `Experienced ${job} with a record of reliable, quality work. Strong communicator, team player and problem solver.`,
  };
  d.personal.summary = summaries[level] || summaries.student;
  const sentences = about.split(/[\n.]+/).map((x) => x.trim()).filter((x) => x.length > 4 && !/^\d[\d\s+]*$/.test(x) && !x.includes('@'));
  const empMatch = about.match(/(?:at|kwa|kwenye)\s+([A-Z][\w&'’.-]+(?:\s+[A-Z][\w&'’.-]+){0,3})/);
  const lower = about.toLowerCase();
  if (/degree|bachelor|shahada ya/i.test(about)) d.education = [{ school: '', qualification: sw ? 'Shahada ya Kwanza (weka chuo)' : 'Bachelor Degree (add university)', start: '', end: '' }];
  else if (/diploma|stashahada/i.test(about)) d.education = [{ school: '', qualification: 'Diploma (add school)', start: '', end: '' }];
  else if (/form six|acsee|advance|kidato cha sita/i.test(about)) d.education = [{ school: '', qualification: sw ? 'Kidato cha Sita — ACSEE' : 'Form Six — ACSEE', start: '', end: '' }];
  else if (/form four|csee|kidato cha nne/i.test(about)) d.education = [{ school: '', qualification: sw ? 'Kidato cha Nne — CSEE' : 'Form Four — CSEE', start: '', end: '' }];
  if (sentences.length) {
    d.experience = [{
      employer: empMatch ? empMatch[1].trim() : '',
      role: job, start: '', end: sw ? 'Sasa' : 'Present',
      bullets: sentences.slice(0, 6).join('\n'),
    }];
  }
  const found = SKILL_WORDS.filter((w) => lower.includes(w));
  d.skills = [...new Set(found)].map((w) => w.replace(/\b\w/g, (c) => c.toUpperCase())).join('\n');
  return d;
}

export default function Builder({ initialMode }) {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const cvIdRef = React.useRef(params.get('id') || null);
  const [, forceTick] = React.useState(0);
  const [template, setTemplate] = React.useState('graduate');
  const [theme, setTheme] = React.useState({ color: '#008000', font: 'poppins', size: 'm' });
  const [data, setData] = React.useState(blankData);
  const [entryMode, setEntryModeState] = React.useState(null);
  const [aiReveal, setAiReveal] = React.useState(null);
  const [aiShowForm, setAiShowForm] = React.useState(false);
  const [aiPreviewOpen, setAiPreviewOpen] = React.useState(false);
  const [saveState, setSaveState] = React.useState('');
  const [msgs, setMsgs] = React.useState([]);
  const [chips, setChips] = React.useState([]);
  const [chatInput, setChatInput] = React.useState('');
  const [aiStatus, setAiStatus] = React.useState(null); // { texts, step, total }
  const chatRef = React.useRef({ step: -1, name: '', job: '', level: 'student' });
  const convoRef = React.useRef(null);
  const aiReqRef = React.useRef(0);
  const aiSlotsRef = React.useRef({});
  const timers = React.useRef([]);
  const dirtyRef = React.useRef(false);

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== id);
      fn();
    }, ms);
    timers.current.push(id);
  };
  React.useEffect(() => () => timers.current.forEach((id) => clearTimeout(id)), []);

  // ---- init from URL / stored CV ----
  React.useEffect(() => {
    let tpl = params.get('template') || 'graduate';
    if (!TEMPLATE_LABELS[tpl] || tpl === 'barua') tpl = 'graduate';
    let id = params.get('id');
    if (id) {
      const ex = getCV(id);
      if (ex && ex.data) {
        setData(ex.data);
        setTemplate(ex.template || tpl);
        if (ex.theme) setTheme((th) => ({ ...th, ...ex.theme }));
        cvIdRef.current = id;
      } else { cvIdRef.current = null; }
    } else {
      setTemplate(tpl);
      setTheme((th) => ({ ...th, color: TPL_DEFAULTS[tpl] || '#008000' }));
    }
    let m = initialMode || params.get('mode') || null;
    try { m = m || localStorage.getItem('mrcv.cvMode') || null; } catch (e) { /* ignore */ }
    if (m !== 'manual' && m !== 'ai') m = null;
    setEntryModeState(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = React.useCallback(() => {
    let id = cvIdRef.current;
    if (!id) {
      const cv = createCV(template);
      id = cv.id;
      cvIdRef.current = id;
      try {
        const next = { id };
        if (entryMode) next.mode = entryMode;
        setParams(next, { replace: true });
      } catch (e) { /* ignore */ }
    }
    const name = (data.personal.fullName || '').trim();
    updateCV(id, {
      template, theme, data,
      match: completeness(data),
      target: (data.personal.title || '').trim(),
      name: name ? `${name} (${TEMPLATE_LABELS[template]})` : 'Untitled CV',
    });
    setSaveState(`${t('bld.savedAt')}${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }, [data, template, theme, entryMode, t]);

  React.useEffect(() => {
    if (!dirtyRef.current) return undefined;
    const id = setTimeout(() => persist(), 700);
    return () => clearTimeout(id);
  }, [data, template, theme, persist]);

  const touch = (fn) => { dirtyRef.current = true; fn(); };
  const patchData = (fn) => touch(() => setData((d) => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n; }));

  // ---- chat engine ----
  const pushMsg = (who, html, text) => {
    uid += 1;
    const m = { id: uid, who, html: html || null, text: text || null };
    setMsgs((arr) => [...arr, m]);
    return m.id;
  };
  React.useEffect(() => {
    try {
      const doc = document.documentElement;
      const near = doc.scrollHeight - window.scrollY - window.innerHeight < 160;
      if (near) window.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' });
    } catch (e) { /* ignore */ }
  }, [msgs]);

  const chatAdd = (who, html) => pushMsg(who, html, null);
  const chatSay = (text) => pushMsg('user', null, text);

  // Status text always names the request that is genuinely in flight, never a
  // rotating guess. `step`/`total` are set only while sections are applied.
  const busy = (textKey, step, total) => setAiStatus({ texts: [t(textKey)], step, total });

  const chatAsk = (html, chipList = []) => {
    setChips(chipList.map((c, i) => ({ key: `c${i}`, label: c.label, v: c.v, ai: false })));
    busy('ai.thinking');
    later(() => { setAiStatus(null); chatAdd('bot', html); }, 600);
  };
  const renderOptionChips = (text) => {
    const items = [...String(text || '').matchAll(/^\s*(\d+)[.)]\s+(.+)$/gm)].slice(0, 5);
    if (items.length < 2) { setChips([]); return; }
    setChips([
      ...items.map((m2) => ({ key: `n${m2[1]}`, label: m2[1], v: m2[1], ai: true })),
      { key: 'all', label: t('opt.all'), v: 'all', ai: true },
    ]);
  };

  const startScripted = () => {
    convoRef.current = null;
    Object.assign(chatRef.current, { step: 0, name: '', job: '', level: 'student' });
    chatAdd('bot', t('chat.hi'));
    later(() => chatAsk(t('chat.qName')), 800);
  };
  const scriptFromSlots = (s) => {
    convoRef.current = null;
    const c = chatRef.current;
    c.name = (s.name || '').trim();
    c.job = (s.job || '').trim();
    c.level = ['student', 'fresher', 'experienced'].includes(s.level) ? s.level : 'student';
    chatAdd('bot', t('chat.offline'));
    if (!c.name) { c.step = 0; later(() => chatAsk(t('chat.qName')), 700); }
    else if (!c.job) { c.step = 1; later(() => chatAsk(t('chat.qJob').replace('{name}', c.name.split(' ')[0])), 700); }
    else { c.step = 3; later(() => chatAsk(t('chat.qAbout')), 700); }
  };
  const showMode = (m) => {
    setEntryModeState(m);
    try { localStorage.setItem('mrcv.cvMode', m || ''); } catch (e) { /* ignore */ }
    if (m === 'ai') { setAiShowForm(false); setAiPreviewOpen(false); }
  };
  React.useEffect(() => {
    if (entryMode === 'ai' && convoRef.current === null) convoRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode]);

  const runGeneration = (input) => {
    const jobTitle = input.job || 'General Worker';
    busy('chat.generating');
    later(async () => {
      const ai = await draftViaBackend({ ...input, job: jobTitle, lang: lang === 'sw' ? 'SW' : 'EN' });
      const fresh = ai || aiDraft({ name: input.name, job: jobTitle, level: input.level, about: input.about }, lang === 'sw' ? 'SW' : 'EN');
      fresh.personal.fullName = input.name;
      fresh.personal.title = jobTitle;
      if (!(fresh.personal.address || '').trim() && (input.region || input.country)) {
        fresh.personal.address = [input.region, input.country].filter(Boolean).join(', ');
      }
      dirtyRef.current = true;
      setData(fresh);
      persistRef.current();
      const stages = [
        ['summary', 'chat.sSummary'], ['experience', 'chat.sExp'], ['education', 'chat.sEdu'],
        ['skills', 'chat.sSkills'], ['projects', 'chat.sProj'], ['referees', 'chat.sRef'],
      ];
      setAiReveal([]);
      let i = 0;
      const revealStep = () => {
        if (i >= stages.length) {
          setAiReveal(null);
          setAiStatus(null);
          chatAdd('bot', `${t('chat.done')}<br><button class="btn btn-sm btn-primary mt-2" data-chat-expand="1"><i class="ti ti-arrows-maximize"></i> ${t('preview.expand')}</button>`);
          const btn = document.getElementById('aiExpandBtn');
          if (btn) btn.classList.remove('d-none');
          return;
        }
        const [stageKey, stageLabel] = stages[i];
        // The loader now names the section actually being applied, with a counter,
        // instead of appending a separate log line per stage.
        busy(stageLabel, i + 1, stages.length);
        setAiReveal((r) => [...(r || []), stageKey]);
        i += 1;
        later(revealStep, 750);
      };
      later(revealStep, 800);
    }, 900);
  };
  const persistRef = React.useRef(persist);
  persistRef.current = persist;

  const levelChips = () => [
    { v: 'student', label: t('ai.lStudent') },
    { v: 'fresher', label: t('ai.lFresher') },
    { v: 'experienced', label: t('ai.lExperienced') },
  ];
  const chatSend = (text) => {
    const v = String(text || '').trim();
    if (!v) return;
    if (convoRef.current) {
      const convo = convoRef.current;
      chatSay(v);
      setChatInput('');
      setChips([]);
      convo.push({ role: 'user', content: v });
      busy('ai.waitReply');
      const req = (aiReqRef.current += 1);
      (async () => {
        const out = await chatViaBackend(convo, lang === 'sw' ? 'SW' : 'EN');
        // A newer request already owns the indicator; only the latest one clears it.
        if (req !== aiReqRef.current) return;
        setAiStatus(null);
        if (!out) { scriptFromSlots(aiSlotsRef.current); return; }
        aiSlotsRef.current = { name: out.name || '', job: out.job || '', level: out.level || '', country: out.country || '', region: out.region || '', about: out.about || '' };
        if (out.reply) {
          convo.push({ role: 'assistant', content: out.reply });
          chatAdd('bot', formatReply(out.reply));
          renderOptionChips(out.reply);
        }
        if (out.done) {
          const s = aiSlotsRef.current;
          runGeneration({ name: s.name, job: s.job, level: s.level || 'student', country: s.country, region: s.region, about: s.about });
        }
      })();
      return;
    }
    const c = chatRef.current;
    if (c.step < 0 || c.step > 3) return;
    chatSay(v);
    setChatInput('');
    setChips([]);
    if (c.step === 0) {
      c.name = v; c.step = 1;
      later(() => chatAsk(t('chat.qJob').replace('{name}', c.name.split(' ')[0])), 700);
    } else if (c.step === 1) {
      c.job = v; c.step = 2;
      later(() => chatAsk(t('chat.qLevel'), levelChips()), 700);
    } else if (c.step === 2) {
      const lvl = parseLevel(v);
      if (!lvl) { later(() => chatAsk(t('chat.qLevel'), levelChips()), 700); return; }
      c.level = lvl; c.step = 3;
      later(() => chatAsk(t('chat.qAbout')), 700);
    } else if (c.step === 3) {
      c.step = 4;
      runGeneration({ name: c.name, job: c.job, level: c.level, about: v });
    }
  };
  const onLogClick = (e) => {
    if (e.target.closest && e.target.closest('#chatExpand, [data-chat-expand]')) {
      setAiPreviewOpen(true);
      const el = document.getElementById('cvCol');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };
  const restartChat = () => {
    aiReqRef.current += 1;
    setMsgs([]);
    setChips([]);
    setAiReveal(null);
    setAiPreviewOpen(false);
    aiSlotsRef.current = {};
    convoRef.current = entryMode === 'ai' ? [] : null;
  };
  const onChip = (chip) => {
    if (chip.ai) {
      chatSend(chip.v === 'all' ? (lang === 'sw' ? 'zote, all of them' : 'all of them') : chip.v);
      return;
    }
    if (chatRef.current.step !== 2) return;
    chatRef.current.level = chip.v;
    chatSay(chip.label);
    setChips([]);
    chatRef.current.step = 3;
    later(() => chatAsk(t('chat.qAbout')), 700);
  };

  // ---- form helpers ----
  const setPath = (path, value) => patchData((d) => {
    const segs = path.split('.');
    let o = d;
    for (let i = 0; i < segs.length - 1; i += 1) o = o[segs[i]];
    o[segs[segs.length - 1]] = value;
  });
  const setRow = (list, idx, field, value) => patchData((d) => { d[list][idx][field] = value; });
  const addRow = (list, blank) => patchData((d) => { d[list].push(blank); });
  const delRow = (list, idx) => patchData((d) => {
    d[list].splice(idx, 1);
    if (!d[list].length) {
      const blanks = {
        education: [{ school: '', qualification: '', start: '', end: '' }],
        experience: [{ employer: '', role: '', start: '', end: '', bullets: '' }],
        projects: [{ name: '', desc: '' }],
        referees: [{ name: '', title: '', phone: '' }],
      };
      d[list] = blanks[list];
    }
  });
  const blanksFor = {
    education: { school: '', qualification: '', start: '', end: '' },
    experience: { employer: '', role: '', start: '', end: '', bullets: '' },
    projects: { name: '', desc: '' },
    referees: { name: '', title: '', phone: '' },
  };
  const normPhone = (v) => { if ((v || '').trim()) setPath('personal.phone', normalizeTZPhone(v)); };
  const fillProfile = () => {
    let u = {};
    try { u = JSON.parse(localStorage.getItem('mrcv.user')) || {}; } catch (e) { /* ignore */ }
    patchData((d) => {
      if (u.name) d.personal.fullName = u.name;
      if (u.phone) d.personal.phone = u.phone;
      if (u.email) d.personal.email = u.email;
      if (u.photo && !d.personal.photo) d.personal.photo = u.photo;
      const co = COUNTRIES.find((c) => c.code === u.country);
      const loc = [u.region, co ? co.name : u.country].filter(Boolean).join(', ');
      if (loc) d.personal.address = loc;
    });
  };
  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const size = 256;
      const side = Math.min(img.width, img.height) || size;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      patchData((d) => { d.personal.photo = c.toDataURL('image/jpeg', 0.85); });
    };
    img.src = url;
  };

  // ---- export ----
  const currentExportCSS = () => withExportPatch(collectSheetCSS({
    color: theme.color,
    fontStack: FONTS[theme.font] || FONTS.poppins,
    size: SIZES[theme.size] || SIZES.m,
  }) || exportCSS());
  const currentExportHTML = (singleFont) => cvThemedHTML(data, {
    color: theme.color,
    fontStack: FONTS[theme.font] || FONTS.poppins,
    size: SIZES[theme.size] || SIZES.m,
  }, template, { singleFont: !!singleFont });
  const doPrint = async () => {
    persistRef.current();
    const name = `${(data.personal.fullName || '').trim() || 'My'}-CV`;
    const exact = template === 'exact';
    const sheet = document.getElementById('cvSheet');
    const html = exact ? currentExportHTML(false) : (sheet ? sheet.outerHTML : currentExportHTML(false));
    const ok = await downloadFromBackend('pdf', { html, css: exact ? '' : currentExportCSS(), filename: name });
    const id = cvIdRef.current;
    if (id) { const cv = getCV(id); if (cv) updateCV(id, { downloads: (cv.downloads || 0) + 1 }); }
    if (!ok) window.print();
    thankOnce();
  };
  const doDoc = async () => {
    persistRef.current();
    const base = `${(data.personal.fullName || '').trim() || 'My'}-CV`;
    const exact = template === 'exact';
    // Send the structured CV first: the backend builds the .docx natively, which
    // keeps the accent rules, shading and uppercase that an HTML round-trip
    // through LibreOffice silently drops. The ATS "exact" template is left on
    // the legacy path because it is already table-based, which is the one thing
    // LibreOffice converts faithfully.
    const ok = await downloadFromBackend('docx', {
      data: exact ? null : data, theme, template,
      html: currentExportHTML(true), css: exact ? '' : currentExportCSS(),
      filename: `${base}.doc`,
    });
    if (!ok) downloadStyledDoc(`${base}.doc`, currentExportHTML(true), exact ? '' : currentExportCSS());
    thankOnce();
  };
  const doWa = (e) => {
    e.preventDefault();
    persistRef.current();
    window.open(waLink(`My CV: ${(data.personal.fullName || '').trim() || 'Untitled'} — ${(data.personal.title || '').trim()}\n${plainText(data).slice(0, 500)}`), '_blank', 'noopener');
  };
  const [thanksOpen, setThanksOpen] = React.useState(false);
  const lottieRef = React.useRef(null);
  React.useEffect(() => {
    if (!thanksOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [{ default: lottie }, anim] = await Promise.all([
          import('lottie-web'),
          import('../assets/animations/success-check.json'),
        ]);
        if (cancelled) return;
        const box = document.getElementById('thanksAnim');
        if (!box) return;
        if (!lottieRef.current) {
          lottieRef.current = lottie.loadAnimation({
            container: box, renderer: 'svg', loop: false, autoplay: false, animationData: anim.default || anim,
          });
        }
        lottieRef.current.goToAndPlay(0);
      } catch (e) { /* animation optional */ }
    })();
    return () => { cancelled = true; };
  }, [thanksOpen]);
  const thankOnce = () => {
    try {
      if (sessionStorage.getItem('mrcv.thanked')) return;
      sessionStorage.setItem('mrcv.thanked', '1');
    } catch (e) { /* ignore */ }
    setThanksOpen(true);
  };

  // ---- derived ----
  const score = React.useMemo(() => completeness(data), [data]);
  const sheetVars = {
    '--cv-accent': theme.color,
    '--cv-font': FONTS[theme.font] || FONTS.poppins,
    '--cv-size': SIZES[theme.size] || SIZES.m,
  };
  const previewHTML = React.useMemo(() => {
    if (template === 'exact') return cvExactHTML(data);
    return cvToHTML(data, aiReveal);
  }, [data, template, aiReveal]);
  const aiMode = entryMode === 'ai';
  const aiColCls = !aiMode ? 'col-12 d-none no-print' : (aiPreviewOpen ? 'col-12 col-lg-5 no-print' : 'col-12 no-print');
  const builderCls = !aiMode ? 'col-12 col-lg-6 no-print' : (aiShowForm ? 'col-12 no-print' : 'd-none');
  const cvCls = !aiMode ? 'col-12 col-lg-6' : (aiPreviewOpen ? 'col-12 col-lg-7' : 'd-none');
  const goBack = () => { if (initialMode) { navigate('/new-cv'); } else { setEntryModeState(null); try { localStorage.setItem('mrcv.cvMode', ''); } catch (e) { /* ignore */ } } };
  const aiBtns = (<React.Fragment>
    <button className="btn btn-sm btn-outline-secondary" title="Back" onClick={goBack}><i className="ti ti-arrow-left"></i></button>
    <button className="btn btn-sm btn-outline-secondary" onClick={restartChat}><i className="ti ti-plus"></i> <span>{t('chat.newchat')}</span></button>
    <button className="btn btn-sm btn-outline-secondary" id="aiEditBtn" onClick={() => setAiShowForm((v) => !v)}><i className="ti ti-edit"></i> <span className="d-none d-md-inline">{t('chat.edit')}</span></button>
    <button className={`btn btn-sm btn-outline-primary${data.personal.fullName ? '' : ' d-none'}`} id="aiExpandBtn" onClick={() => { setAiPreviewOpen((v) => !v); }}><i className="ti ti-arrows-maximize"></i> <span className="d-none d-md-inline">{t('preview.expand')}</span></button>
  </React.Fragment>);
  const aiSuggestions = [
    { key: 's1', label: t('ai.sug1'), v: lang === 'sw' ? 'Tengeneza CV kwa ajili yangu' : 'Create a CV for me' },
    { key: 's2', label: t('ai.sug2'), v: lang === 'sw' ? 'Boresha CV yangu iliyopo' : 'Improve my current CV' },
    { key: 's3', label: t('ai.sug3'), v: lang === 'sw' ? 'Mimi ni mhitimu mpya' : 'I am a fresh graduate' },
  ];

  return (
    <React.Fragment>
      <div className="row no-print">
        <div className="col-12">
          {!aiMode && (
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('bld.title')}</h1>
              <p className="mb-0"><span>{t('bld.intro')}</span> <span className="text-secondary small">{saveState}</span></p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/dashboard" className="btn btn-outline-secondary btn-sm"><i className="ti ti-arrow-left"></i> <span>{t('bld.mycvs')}</span></Link>
              <a href="#cvSheet" className="btn btn-outline-secondary btn-sm d-lg-none"><i className="ti ti-eye"></i> <span>{t('bld.preview')}</span></a>
            </div>
          </div>
          )}
          {!entryMode ? (
            <div className="mb-3">
              <div className="card">
                <div className="card-body p-3 p-md-4">
                  <h2 className="h6 mb-2">{t('mode.choose')}</h2>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 p-3 text-start" onClick={() => navigate('/new-cv/manual')}>
                        <i className="ti ti-edit fs-4 d-block mb-1"></i>
                        <strong>{t('mode.manual')}</strong><br />
                        <small className="text-secondary">{t('mode.manualSub')}</small>
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 p-3 text-start" onClick={() => navigate('/new-cv/mwandishi-ai')}>
                        <i className="ti ti-sparkles fs-4 d-block mb-1"></i>
                        <strong>{t('mode.ai')}</strong><br />
                        <small className="text-secondary">{t('mode.aiSub')}</small>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-2">
              {aiMode ? (
              !msgs.some((m) => m.who === 'user') ? (
              <div className="text-center mb-1">
                <img src={logoUrl} alt="Mwandishi" width="56" className="mb-1" />
                <div className="fs-3 fw-bold">Mwandishi <span className="text-primary">AI</span></div>
                <div className="text-secondary small">{t('ai.pickSub')}</div>
                <div className="d-flex justify-content-center gap-2 flex-wrap mt-2">{aiBtns}</div>
              </div>
              ) : (
              <div className="d-flex align-items-center gap-2 mb-3">
                <img src={logoUrl} alt="Mwandishi" width="30" />
                <strong className="fs-5">Mwandishi <span className="text-primary">AI</span></strong>
                <div className="ms-auto d-flex gap-2">{aiBtns}</div>
              </div>
              )
              ) : (
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary">{entryMode === 'ai' ? t('mode.ai') : t('mode.manual')}</span>
                <button className="btn btn-sm btn-link p-0" onClick={() => { if (initialMode) { navigate('/new-cv'); } else { setEntryModeState(null); try { localStorage.setItem('mrcv.cvMode', ''); } catch (e) { /* ignore */ } } }}><span>{t('mode.change')}</span></button>
              </div>
              )}
            </div>
          )}
          {entryMode === 'manual' ? (
            <React.Fragment>
              <div className="mb-3">
                <div className="card border-primary">
                  <div className="card-body p-3 d-flex flex-column flex-md-row align-items-md-center gap-2">
                    <div className="icon-shape icon-md bg-primary bg-opacity-10 text-primary rounded-2 flex-shrink-0">
                      <i className="ti ti-sparkles fs-4"></i>
                    </div>
                    <div className="flex-grow-1">
                      <strong>{t('ai.promoT')}</strong><br />
                      <small className="text-secondary">{t('ai.promoS')}</small>
                    </div>
                    <button className="btn btn-primary btn-sm flex-shrink-0" onClick={() => navigate('/new-cv/mwandishi-ai')}><i className="ti ti-sparkles"></i> <span>{t('ai.promoBtn')}</span></button>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center mb-3">
                <small className="text-secondary">{t('bld.template')}</small>
                <div className="btn-group btn-group-sm flex-wrap" role="group">
                  {[['graduate', 'Graduate Starter'], ['government', 'Govt / NGO'], ['banking', 'Banking'], ['general', 'General'], ['clinical', 'Two-Column'], ['exact', 'Exact Replica']].map(([v, label]) => (
                    <button key={v} className={`btn ${template === v ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { dirtyRef.current = true; setTemplate(v); setTheme((th) => ({ ...th, color: TPL_DEFAULTS[v] || th.color })); }}>{label}</button>
                  ))}
                </div>
                <div className="flex-grow-1 d-flex align-items-center gap-2" style={{ minWidth: '160px', maxWidth: '280px' }}>
                  <div className="progress flex-grow-1" style={{ height: '8px' }}><div className="progress-bar" style={{ width: `${score}%` }}></div></div>
                  <small className="text-secondary">{score}%</small>
                </div>
              </div>
              <div className="d-flex gap-3 flex-wrap align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <small className="text-secondary">{t('bld.color')}</small>
                  <div className="d-flex gap-1">
                    {['#008000', '#7C3AED', '#1D4ED8', '#0F766E', '#9A3412', '#262626'].map((c) => (
                      <button key={c} className={`btn rounded-circle p-0 theme-swatch${theme.color.toLowerCase() === c.toLowerCase() ? ' active' : ''}`} data-color={c} style={{ width: '24px', height: '24px', background: c }} title={c} onClick={() => { dirtyRef.current = true; setTheme((th) => ({ ...th, color: c })); }}></button>
                    ))}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <small className="text-secondary">{t('bld.font')}</small>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }} value={theme.font} onChange={(e) => { dirtyRef.current = true; setTheme((th) => ({ ...th, font: e.target.value })); }}>
                    <option value="poppins">Professional Sans</option>
                    <option value="georgia">Classic Serif</option>
                    <option value="arial">Compact Sans</option>
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <small className="text-secondary">{t('bld.size')}</small>
                  <div className="btn-group btn-group-sm">
                    {[['s', 'S'], ['m', 'M'], ['l', 'L']].map(([v, label]) => (
                      <button key={v} className={`btn ${theme.size === v ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { dirtyRef.current = true; setTheme((th) => ({ ...th, size: v })); }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ) : null}
        </div>
      </div>
      <div className="row g-0 g-lg-3 mb-3">
        <div id="aiCol" className={aiMode ? aiColCls : 'col-12 d-none no-print'}>
          {aiMode ? (
            <div className="d-flex flex-column" style={{ minHeight: msgs.length ? '62vh' : '0' }}>
              <div className="chat-log px-1 py-2 mb-2 flex-grow-1" id="chatLog" onClick={onLogClick}>
                {msgs.map((m) => (
                  <div className={`d-flex mb-3${m.who === 'user' ? ' justify-content-end' : ''}`} key={m.id}>
                    {m.who === 'user'
                      ? <div className="bubble-user">{m.text}</div>
                      : (
                        <div className="d-flex gap-2">
                          <div className="chat-avatar"><i className="ti ti-sparkles"></i></div>
                          <div className="bubble-bot" dangerouslySetInnerHTML={{ __html: m.html }}></div>
                        </div>
                      )}
                  </div>
                ))}
                {aiStatus && (
                  <div className="d-flex mb-3">
                    <div className="d-flex gap-2">
                      <div className="chat-avatar"><i className="ti ti-sparkles"></i></div>
                      <div className="bubble-bot">
                        <AITextLoading texts={aiStatus.texts} className="ai-load-compact" />
                        {aiStatus.total ? (
                          <small className="text-secondary d-block text-center mt-1">{t('ai.step')} {aiStatus.step}/{aiStatus.total}</small>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="d-flex gap-1 flex-wrap mb-2">
                {chips.map((c) => (
                  <button className="btn btn-sm btn-outline-primary" key={c.key} onClick={() => onChip(c)}>{c.label}</button>
                ))}
              </div>
              {aiMode && !msgs.some((m) => m.who === 'user') && (
              <div className="mb-2">
                <small className="text-secondary d-block mb-1">{t('ai.trySaying')}</small>
                <div className="d-flex gap-1 flex-wrap">
                  {aiSuggestions.map((s) => (
                    <button className="btn btn-sm btn-outline-secondary" key={s.key} onClick={() => chatSend(s.v)}>{s.label}</button>
                  ))}
                </div>
              </div>
              )}
              <div style={{ position: 'sticky', bottom: 0, background: 'var(--bs-body-bg)', zIndex: 5, paddingBottom: '4px' }}>
              <form className="d-flex gap-2 align-items-center chat-inputbar py-1" onSubmit={(e) => { e.preventDefault(); chatSend(chatInput); }}>
                <input id="chatInput" className="form-control" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={t('chat.sendPh')} />
                <button type="submit" id="chatSend" className="btn btn-primary flex-shrink-0" title="Send"><i className="ti ti-send"></i></button>
              </form>
            </div>
              <small className="ai-disclaimer d-block text-center mt-2 mb-1">
                <i className="ti ti-alert-triangle me-1"></i>{t('ai.disclaimer')}
              </small>
            </div>
          ) : null}
        </div>
        <div className={builderCls} id="builderCol">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="card mb-3">
              <div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><h4 className="mb-0 h6"><span className="badge bg-primary me-2">1</span><span>{t('bld.personal')}</span></h4><button className="btn btn-sm btn-outline-secondary" type="button" onClick={fillProfile} title="Fill from profile"><i className="ti ti-user"></i> <span>{t('bld.fill')}</span></button></div>
              <div className="card-body p-3">
                <div className="row g-2">
                  <div className="col-12"><label className="form-label" htmlFor="f-name">{t('fld.name')}</label><input id="f-name" className="form-control" value={data.personal.fullName} onChange={(e) => setPath('personal.fullName', e.target.value)} placeholder="e.g. Amina Juma" /></div>
                  <div className="col-12 d-flex align-items-center gap-2">
                    <span>{data.personal.photo ? <img src={data.personal.photo} className="rounded-circle" width="48" height="48" style={{ objectFit: 'cover' }} alt="" /> : null}</span>
                    <label className="btn btn-sm btn-outline-secondary mb-0" htmlFor="f-photo">{t('fld.photo')}</label>
                    <input id="f-photo" type="file" accept="image/*" className="d-none" onChange={onPhoto} />
                    <button className="btn btn-sm btn-link link-danger text-decoration-none" type="button" onClick={() => patchData((d) => { d.personal.photo = ''; })}><span>{t('acc.remove')}</span></button>
                  </div>
                  <div className="col-12"><label className="form-label" htmlFor="f-title">{t('fld.title')}</label><input id="f-title" className="form-control" value={data.personal.title} onChange={(e) => setPath('personal.title', e.target.value)} placeholder="e.g. Primary School Teacher" /></div>
                  <div className="col-md-6"><label className="form-label" htmlFor="f-phone">{t('fld.phone')}</label><input id="f-phone" className="form-control" value={data.personal.phone} onChange={(e) => setPath('personal.phone', e.target.value)} onBlur={(e) => { if (e.target.value.trim()) setPath('personal.phone', normalizeTZPhone(e.target.value)); }} inputMode="tel" placeholder="0765 123 456" /><div className="form-text">{t('bld.phoneHint')}</div></div>
                  <div className="col-md-6"><label className="form-label" htmlFor="f-email">{t('fld.email')}</label><input id="f-email" className="form-control" value={data.personal.email} onChange={(e) => setPath('personal.email', e.target.value)} inputMode="email" placeholder="you@example.com" /></div>
                  <div className="col-12"><label className="form-label" htmlFor="f-address">{t('fld.address')}</label><input id="f-address" className="form-control" value={data.personal.address} onChange={(e) => setPath('personal.address', e.target.value)} placeholder="e.g. Ubungo, Dar es Salaam" /></div>
                  <div className="col-12"><label className="form-label" htmlFor="f-summary">{t('fld.summary')}</label><textarea id="f-summary" className="form-control" rows="3" value={data.personal.summary} onChange={(e) => setPath('personal.summary', e.target.value)} placeholder="2–3 lines: who you are, experience, what you offer"></textarea></div>
                </div>
              </div>
            </div>
            <SectionCard n="2" title={t('bld.education')} addLabel={t('bld.add')} onAdd={() => addRow('education', { ...blanksFor.education })}>
              <div id="eduList">
                {data.education.map((e, i) => (
                  <div className="border rounded p-2 mb-2" key={i}>
                    <div className="row g-2">
                      <div className="col-12"><input className="form-control form-control-sm" value={e.school} onChange={(ev) => setRow('education', i, 'school', ev.target.value)} placeholder="School / university" /></div>
                      <div className="col-12"><input className="form-control form-control-sm" value={e.qualification} onChange={(ev) => setRow('education', i, 'qualification', ev.target.value)} placeholder="Qualification, e.g. Diploma in Teaching" /></div>
                      <div className="col-6"><input className="form-control form-control-sm" value={e.start} onChange={(ev) => setRow('education', i, 'start', ev.target.value)} placeholder="Start (e.g. 2019)" /></div>
                      <div className="col-6"><input className="form-control form-control-sm" value={e.end} onChange={(ev) => setRow('education', i, 'end', ev.target.value)} placeholder="End (e.g. 2021)" /></div>
                    </div>
                    <button className="btn btn-sm btn-link link-danger p-0 mt-1" type="button" onClick={() => delRow('education', i)}>{t('bld.remove')}</button>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard n="3" title={t('bld.experience')} addLabel={t('bld.add')} onAdd={() => addRow('experience', { ...blanksFor.experience })}>
              <div id="expList">
                {data.experience.map((e, i) => (
                  <div className="border rounded p-2 mb-2" key={i}>
                    <div className="row g-2">
                      <div className="col-md-6"><input className="form-control form-control-sm" value={e.role} onChange={(ev) => setRow('experience', i, 'role', ev.target.value)} placeholder="Role, e.g. Sales Assistant" /></div>
                      <div className="col-md-6"><input className="form-control form-control-sm" value={e.employer} onChange={(ev) => setRow('experience', i, 'employer', ev.target.value)} placeholder="Employer" /></div>
                      <div className="col-6"><input className="form-control form-control-sm" value={e.start} onChange={(ev) => setRow('experience', i, 'start', ev.target.value)} placeholder="Start" /></div>
                      <div className="col-6"><input className="form-control form-control-sm" value={e.end} onChange={(ev) => setRow('experience', i, 'end', ev.target.value)} placeholder="End / Present" /></div>
                      <div className="col-12"><textarea className="form-control form-control-sm" rows="3" value={e.bullets} onChange={(ev) => setRow('experience', i, 'bullets', ev.target.value)} placeholder={'Achievements, one per line:\nServed 50+ customers daily\nTrained 3 new staff'}></textarea></div>
                    </div>
                    <button className="btn btn-sm btn-link link-danger p-0 mt-1" type="button" onClick={() => delRow('experience', i)}>{t('bld.remove')}</button>
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="card mb-3">
              <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h6"><span className="badge bg-primary me-2">4</span><span>{t('bld.skills')}</span></h4></div>
              <div className="card-body p-3">
                <textarea className="form-control" rows="2" value={data.skills} onChange={(e) => setPath('skills', e.target.value)} placeholder="One per line or comma separated: e.g. Classroom management, Kiswahili, First aid"></textarea>
              </div>
            </div>
            <SectionCard n="5" title={t('bld.projects')} addLabel={t('bld.add')} onAdd={() => addRow('projects', { ...blanksFor.projects })}>
              <div id="projList">
                {data.projects.map((p, i) => (
                  <div className="border rounded p-2 mb-2" key={i}>
                    <input className="form-control form-control-sm mb-2" value={p.name} onChange={(ev) => setRow('projects', i, 'name', ev.target.value)} placeholder="Project name" />
                    <textarea className="form-control form-control-sm" rows="2" value={p.desc} onChange={(ev) => setRow('projects', i, 'desc', ev.target.value)} placeholder="What you did / result"></textarea>
                    <button className="btn btn-sm btn-link link-danger p-0 mt-1" type="button" onClick={() => delRow('projects', i)}>{t('bld.remove')}</button>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard n="6" title={<React.Fragment>{t('bld.referees')} <small className="text-secondary fw-normal">{t('bld.refNote')}</small></React.Fragment>} addLabel={t('bld.add')} onAdd={() => addRow('referees', { ...blanksFor.referees })}>
              <div id="refList">
                {data.referees.map((r, i) => (
                  <div className="border rounded p-2 mb-2" key={i}>
                    <div className="row g-2">
                      <div className="col-12"><input className="form-control form-control-sm" value={r.name} onChange={(ev) => setRow('referees', i, 'name', ev.target.value)} placeholder="Full name" /></div>
                      <div className="col-md-6"><input className="form-control form-control-sm" value={r.title} onChange={(ev) => setRow('referees', i, 'title', ev.target.value)} placeholder="Title, e.g. Head Teacher" /></div>
                      <div className="col-md-6"><input className="form-control form-control-sm" value={r.phone} onChange={(ev) => setRow('referees', i, 'phone', ev.target.value)} onBlur={(ev) => { if (ev.target.value.trim()) setRow('referees', i, 'phone', normalizeTZPhone(ev.target.value)); }} inputMode="tel" placeholder="Phone, e.g. 0765…" /></div>
                    </div>
                    <button className="btn btn-sm btn-link link-danger p-0 mt-1" type="button" onClick={() => delRow('referees', i)}>{t('bld.remove')}</button>
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="card mb-3">
              <div className="card-header bg-white px-4 py-3"><h4 className="mb-0 h6"><span className="badge bg-primary me-2">7</span><span>{t('bld.export')}</span></h4></div>
              <div className="card-body p-3 d-flex gap-2 flex-wrap">
                <button className="btn btn-primary" type="button" onClick={doPrint}><i className="ti ti-printer"></i> <span>{t('bld.pdf')}</span></button>
                <button className="btn btn-outline-secondary" type="button" onClick={doDoc}><i className="ti ti-download"></i> .doc</button>
                <button className="btn btn-outline-success" type="button" onClick={doWa}><i className="ti ti-brand-whatsapp"></i> WhatsApp</button>
                <div className="form-text w-100">{t('bld.pdfNote')}</div>
              </div>
            </div>
          </form>
        </div>
        <div className={cvCls} id="cvCol">
          <div className="d-flex justify-content-between align-items-center mb-2 no-print">
            <small className="text-secondary">{t('preview.live')}</small>
            <button className={`btn btn-sm btn-outline-secondary${aiMode ? '' : ' d-none'}`} onClick={() => setAiPreviewOpen(false)}><i className="ti ti-x"></i> <span>{t('preview.collapse')}</span></button>
          </div>
          <div className="position-sticky no-print-offset" style={{ top: '76px' }}>
            <div className={`cv-sheet tpl-${template}`} id="cvSheet" style={sheetVars} dangerouslySetInnerHTML={{ __html: previewHTML }}></div>
          </div>
        </div>
      </div>
      <Modal open={thanksOpen} onClose={() => setThanksOpen(false)}>
        <div id="thanksAnim" className="mx-auto" style={{ width: '150px', height: '150px' }}></div>
        <h4 className="mb-2">{t('thanks.title')}</h4>
        <p className="text-secondary mb-4">{t('thanks.body')}</p>
        <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => setThanksOpen(false)}>{t('thanks.close')}</button>
      </Modal>
    </React.Fragment>
  );

  }

function SectionCard({ n, title, addLabel, onAdd, children }) {
  return (
    <div className="card mb-3">
      <div className="card-header bg-white px-4 py-3 d-flex justify-content-between align-items-center"><h4 className="mb-0 h6"><span className="badge bg-primary me-2">{n}</span>{title}</h4><button className="btn btn-sm btn-outline-primary" type="button" onClick={onAdd}><i className="ti ti-plus"></i> <span>{addLabel}</span></button></div>
      <div className="card-body p-3">{children}</div>
    </div>
  );
}

function completeness(d) {
  const checks = [
    !!(d.personal.fullName || '').trim(),
    !!(d.personal.title || '').trim(),
    !!(d.personal.phone || '').trim(),
    !!(d.personal.email || '').trim(),
    !!(d.personal.summary || '').trim(),
    d.education.some((e) => (e.school || '').trim() && (e.qualification || '').trim()),
    d.experience.some((e) => (e.role || '').trim() && (e.employer || '').trim()),
    !!String(d.skills || '').trim(),
    d.referees.filter((r) => (r.name || '').trim() && (r.phone || '').trim()).length >= 2,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function plainText(d) {
  const p = d.personal;
  const out = [p.fullName, p.title, [p.phone, p.email, p.address].filter(Boolean).join(' | '), ''];
  if (p.summary) out.push('SUMMARY', p.summary, '');
  if (d.experience.some((e) => e.role)) {
    out.push('EXPERIENCE');
    d.experience.forEach((e) => { if (e.role || e.employer) { out.push(`${e.role} — ${e.employer} (${e.start} - ${e.end})`); String(e.bullets).split('\n').forEach((b) => { if (b.trim()) out.push(`- ${b.trim()}`); }); } });
    out.push('');
  }
  if (d.education.some((e) => e.school)) {
    out.push('EDUCATION');
    d.education.forEach((e) => { if (e.school || e.qualification) out.push(`${e.qualification} — ${e.school} (${e.start} - ${e.end})`); });
    out.push('');
  }
  if (String(d.skills).trim()) out.push('SKILLS', String(d.skills).trim(), '');
  const refs = d.referees.filter((r) => (r.name || '').trim());
  if (refs.length) { out.push('REFEREES'); refs.forEach((r) => out.push(`${r.name}${r.title ? `, ${r.title}` : ''}${r.phone ? ` — ${r.phone}` : ''}`)); }
  return out.join('\n');
}

function exportCSS(theme, template) {
  const accent = theme.color || '#008000';
  const font = FONTS[theme.font] || FONTS.poppins;
  const size = SIZES[theme.size] || SIZES.m;
  let extra = '';
  if (template === 'graduate') extra += '.cv-name{color:' + accent + ';}';
  if (template === 'banking') extra += '.cv-head{background:#262626;color:#fff;padding:12px 14px;}.cv-head .cv-name{color:#fff;}.cv-head .cv-contact{color:#d4d4d4;}.cv-title{color:#F0B100;}';
  if (template === 'government') extra += '.cv-head{text-align:center;}.cv-sec{border-bottom:3px double ' + accent + ';}';
  if (template === 'general') extra += '.cv-sec{border:none;border-left:4px solid ' + accent + ';padding-left:8px;}';
  return 'body{font-family:' + font + ';font-size:' + size + ';color:#262626;line-height:1.55;}'
    + '.cv-name{font-size:22px;font-weight:700;color:#171717;margin:0;}'
    + '.cv-title{font-size:13px;font-weight:700;color:' + accent + ';margin-bottom:4px;}'
    + '.cv-contact{font-size:12px;color:#737373;margin-bottom:12px;}'
    + '.cv-sec{font-size:12px;font-weight:700;text-transform:uppercase;color:#171717;border-bottom:2px solid ' + accent + ';padding-bottom:2px;margin:14px 0 6px;}'
    + '.cv-item{margin-bottom:8px;}.cv-dates{color:#737373;font-size:12px;}ul{margin:2px 0 0 18px;padding:0;}'
    + '.skill-chip{display:inline-block;border:1px solid #e5e5e5;border-radius:20px;padding:1px 10px;margin:0 4px 4px 0;font-size:12px;}' + extra;
}

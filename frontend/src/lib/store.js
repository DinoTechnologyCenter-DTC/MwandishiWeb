// Mwandishi local-first store — P0: works with no account, data stays on device.
const KEY = 'mrcv.v1';
const nowISO = () => new Date().toISOString();

export const TEMPLATES = [
  { slug: 'graduate', name: 'Graduate Starter', cat: 'graduate', mock: 'clean',
    desc: 'No experience? No problem. Education-first layout with projects and attachment section.',
    best: 'Students, fresh graduates, interns', badges: ['ATS-safe', 'EN/SW', 'Free'] },
  { slug: 'government', name: 'Government & NGO', cat: 'government', mock: 'formal',
    desc: 'Formal 2-page layout with referees block, made for Ajira portal and NGO applications.',
    best: 'Government, NGOs, teaching', badges: ['ATS-safe', 'Referees', 'Free'] },
  { slug: 'banking', name: 'Banking & Telecom', cat: 'banking', mock: 'compact',
    desc: 'Compact 1-page, skills-first layout recruiters at banks and telcos scan in seconds.',
    best: 'Banks, Vodacom / Tigo / Airtel', badges: ['ATS-safe', '1-page', 'Free'] },
  { slug: 'general', name: 'General Professional', cat: 'general', mock: 'clean',
    desc: 'Balanced 2-page CV for any role. Work history first, clean headings parsers love.',
    best: 'Any role, experienced hires', badges: ['ATS-safe', 'EN/SW', 'Free'] },
  { slug: 'clinical', name: 'Professional Two-Column', cat: 'general', mock: 'formal',
    desc: 'Teal two-column design converted from a pro layout. Best for email and hand-in; use an ATS-clean template for portals.',
    best: 'Doctors, nurses, consultants, hand-in CVs', badges: ['2-column', 'Free'] },
  { slug: 'exact', name: 'Exact Replica', cat: 'general', mock: 'formal',
    desc: 'Pixel-faithful pro layout: photo rail, two-tone name, fixed columns.',
    best: 'A classic, polished two-column look', badges: ['2-column', 'Photo', 'Free'] },
  { slug: 'barua', name: 'Application Letter (Barua ya Maombi)', cat: 'barua', kind: 'letter', mock: 'letter',
    desc: 'Swahili or English application-letter layout. Pairs with any CV for a complete application pack.',
    best: 'Barua za maombi kwa Kiswahili au Kiingereza', badges: ['Kiswahili', 'Letter', 'Free'], useLink: 'cover-letters.html#generator' },
];

function seedLetterEN(cvName, jobTitle, company) {
  return `${fmtDate(new Date())}\nThe Hiring Manager\n${company}\nDar es Salaam, Tanzania\n\nDear Sir/Madam,\n\nRE: APPLICATION FOR THE POSITION OF ${jobTitle.toUpperCase()}\n\nI, ${cvName}, wish to apply for the above position as advertised. My CV, attached herewith, outlines my education, skills and experience relevant to this role.\n\nI am hardworking, quick to learn and ready to contribute to ${company}. I would welcome the opportunity to discuss my application at an interview.\n\nYours faithfully,\n${cvName}\nAttachments: CV`;
}

function seedLetterSW(cvName, jobTitle, company) {
  return `${fmtDate(new Date())}\nMeneja wa Ajira\n${company}\nDar es Salaam, Tanzania\n\nNdugu Meneja,\n\nYAH: MAOMBI YA KAZI YA ${jobTitle.toUpperCase()}\n\nMimi, ${cvName}, ninaomba kazi ya ${jobTitle} kama ilivyotangazwa. Wasifu wangu (CV) nilioambatanisha unaeleza elimu, ujuzi na uzoefu wangu unaohusiana na kazi hii.\n\nNina bidii, nina uwezo wa kujifunza haraka na niko tayari kuchangia ${company}. Nitafurahi kupata fursa ya kujadili maombi yangu kwenye usaili.\n\nWako mtiifu,\n${cvName}\nViambatanisho: CV`;
}

function seed() {
  return {
    seq: 100,
    cvs: [
      { id: 'cv-master', name: 'Juma Mwansa — Master CV', template: 'general', lang: 'EN', target: 'General applications', match: 72, downloads: 3, updatedAt: nowISO() },
      { id: 'cv-crdb', name: 'Teller Application — CRDB', template: 'banking', lang: 'EN', target: 'CRDB Bank Teller', match: 86, downloads: 1, updatedAt: nowISO() },
    ],
    letters: [
      { id: 'lt-1', cvId: 'cv-crdb', jobTitle: 'Bank Teller', company: 'CRDB Bank', lang: 'EN', updatedAt: nowISO(),
        body: seedLetterEN('Juma Mwansa', 'Bank Teller', 'CRDB Bank') },
    ],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted -> reseed */ }
  const s = seed();
  save(s);
  return s;
}

export function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function uid(p) { const s = load(); s.seq += 1; save(s); return `${p}-${s.seq}`; }

export const getCVs = () => load().cvs;
export const getCV = (id) => load().cvs.find((c) => c.id === id);
export const getLetters = () => load().letters;

export function duplicateCV(id) {
  const s = load();
  const cv = s.cvs.find((c) => c.id === id);
  if (!cv) return;
  s.seq += 1;
  s.cvs.unshift({ ...cv, id: `cv-${s.seq}`, name: `${cv.name} (copy)`, downloads: 0, match: cv.match, updatedAt: nowISO() });
  save(s);
}

export function deleteCV(id) {
  const s = load();
  s.cvs = s.cvs.filter((c) => c.id !== id);
  save(s);
}

export function bumpDownloads(id) {
  const s = load();
  const cv = s.cvs.find((c) => c.id === id);
  if (cv) { cv.downloads += 1; cv.updatedAt = nowISO(); save(s); }
}

export function upsertLetter(letter) {
  const s = load();
  letter.updatedAt = nowISO();
  if (letter.id) {
    const i = s.letters.findIndex((l) => l.id === letter.id);
    if (i >= 0) s.letters[i] = letter; else s.letters.unshift(letter);
  } else {
    s.seq += 1;
    letter.id = `lt-${s.seq}`;
    s.letters.unshift(letter);
  }
  save(s);
  return letter;
}

export function deleteLetter(id) {
  const s = load();
  s.letters = s.letters.filter((l) => l.id !== id);
  save(s);
}

export function buildLetter({ cvName, jobTitle, company, manager, lang }) {
  const jt = jobTitle || 'the advertised position';
  const co = company || 'your organisation';
  // The generator can be used with no CV and no name typed yet, so never emit
  // "Mimi, ," or a dangling signature line: use a neutral phrase instead.
  const nm = String(cvName || '').trim();
  // With no name the "I, <name>," opening collapses entirely; substituting a
  // pronoun produced "I, I, wish to apply" and "Mimi, mimi, ninaomba".
  const sign = nm || (lang === 'SW' ? 'Mimi' : 'Your Name');
  if (lang === 'SW') {
    return `${fmtDate(new Date())}\n${manager || 'Meneja wa Ajira'}\n${co}\nDar es Salaam, Tanzania\n\nNdugu Meneja,\n\nYAH: MAOMBI YA KAZI YA ${jt.toUpperCase()}\n\n${nm ? `Mimi, ${nm}, ninaomba` : 'Ninaomba'} kazi ya ${jt} kama ilivyotangazwa. Wasifu wangu (CV) nilioambatanisha unaeleza elimu, ujuzi na uzoefu wangu unaohusiana na kazi hii.\n\nNina bidii, nina uwezo wa kujifunza haraka na niko tayari kuchangia ${co}. Nitafurahi kupata fursa ya kujadili maombi yangu kwenye usaili.\n\nWako mtiifu,\n${sign}\nViambatanisho: CV`;
  }
  return `${fmtDate(new Date())}\n${manager || 'The Hiring Manager'}\n${co}\nDar es Salaam, Tanzania\n\nDear ${manager ? manager : 'Sir/Madam'},\n\nRE: APPLICATION FOR THE POSITION OF ${jt.toUpperCase()}\n\n${nm ? `I, ${nm}, wish to apply` : 'I wish to apply'} for the above position as advertised. My CV, attached herewith, outlines my education, skills and experience relevant to this role.\n\nI am hardworking, quick to learn and ready to contribute to ${co}. I would welcome the opportunity to discuss my application at an interview.\n\nYours faithfully,\n${sign}\nAttachments: CV`;
}

export function fmtDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

export function fmtDateTime(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  const h24 = dt.getHours();
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${fmtDate(dt)} ${p(h12)}:${p(dt.getMinutes())} ${ap}`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function matchBadge(score) {
  const cls = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-secondary';
  return `<span class="badge ${cls}">${score}% match</span>`;
}

export function waLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function downloadDoc(filename, text, opts = {}) {
  // Real Word-renderable document: full HTML package Word/WPS/LibreOffice
  // recognise (not a bare <pre> fragment), UTF-8 BOM, sanitised filename.
  // Blank lines separate blocks; single ALL-CAPS lines become headings.
  // Pass { headline: false } for letters (no big name title on top).
  const headline = opts.headline !== false;
  const name = String(filename || 'document').replace(/[\\/:*?"<>|]/g, '-').replace(/(\.doc)?$/i, '.doc');
  const lines = String(text ?? '').split('\n').map((l) => l.trim());
  const blocks = [];
  let cur = [];
  lines.forEach((l) => { if (l) cur.push(esc(l)); else { if (cur.length) blocks.push(cur); cur = []; } });
  if (cur.length) blocks.push(cur);
  const isHeading = (t) => t.length >= 3 && t === t.toUpperCase() && /[A-Z]/.test(t);
  const body = blocks.map((b, i) => {
    if (headline && i === 0) return `<h1>${b[0]}</h1>` + (b.length > 1 ? `<p class="sub">${b.slice(1).join('<br>')}</p>` : '');
    if (b.length === 1 && isHeading(b[0])) return `<h2>${b[0]}</h2>`;
    return `<p>${b.join('<br>')}</p>`;
  }).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>CV</title><style>body{font-family:Georgia,serif;font-size:12pt;color:#111;}h1{font-size:20pt;margin:0 0 2pt;}p.sub{margin:0 0 10pt;color:#444;}h2{font-size:13pt;margin:12pt 0 4pt;border-bottom:1px solid #999;text-transform:uppercase;}p{margin:0 0 8pt;}</style></head><body>${body}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Single source of truth for exports: scrape the live compiled stylesheet for
// CV rules at download time, so exports can never drift from the website.
// Skips print rules, dark-theme rules (documents stay light paper) and
// gallery-only helpers. Resolves CSS vars from the live theme; maps the web
// font to an office-safe stack.
export function collectSheetCSS(theme) {
  const keep = (sel) => /(\.cv-sheet|\.tpl-|\.cv-(sec|head|name|title|contact|item|dates|bullets)|skill-chip)/.test(sel)
    && !/data-bs-theme/.test(sel);
  const out = [];
  let sheets = [];
  try { sheets = [...document.styleSheets]; } catch (e) { return ''; }
  for (const sh of sheets) {
    let rules = [];
    try { rules = [...(sh.cssRules || [])]; } catch (e) { continue; }
    for (const r of rules) {
      if (r.type === 4 && r.conditionText && !/print/.test(r.conditionText)) {
        for (const inner of r.cssRules || []) {
          if (inner.type === 1 && inner.selectorText && keep(inner.selectorText)) out.push(`${inner.selectorText}{${inner.style.cssText}}`);
        }
      } else if (r.type === 1 && r.selectorText && keep(r.selectorText)) {
        out.push(`${r.selectorText}{${r.style.cssText}}`);
      }
    }
  }
  if (!out.length) return '';
  const font = String((theme && theme.fontStack) || "'Poppins',sans-serif")
    .replace(/'Poppins',sans-serif/, 'Calibri,Arial,sans-serif');
  return out.join('\n')
    .replace(/var\(--cv-accent\)/g, (theme && theme.color) || '#008000')
    .replace(/var\(--cv-font\)/g, font)
    .replace(/var\(--cv-size\)/g, (theme && theme.size) || '13px');
}

// Backend file export: tries the FastAPI service first, returns false when
// unreachable so callers fall back to local export (offline-first).
export function backendBase() {
  try {
    if (window.MRCV_BACKEND_URL) return String(window.MRCV_BACKEND_URL).replace(/\/$/, '');
    const h = location.hostname || '';
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8000/api';
    return '/api';
  } catch (e) {
    return '';
  }
}

// ---- user feedback ----
// Goes to the admin inbox (POST /api/feedback) when the backend is reachable;
// otherwise queued on-device (offline-first) so nothing is ever lost. The
// queue is retried on every later submit.
const FB_KEY = 'mrcv.feedback';
// Tab-scoped admin passcode: closing the tab locks the inbox again.
export const ADMIN_KEY_KEY = 'mrcv.adminKey';
export function getFeedbackQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(FB_KEY) || '[]');
    return Array.isArray(q) ? q : [];
  } catch (e) { return []; }
}
function saveFeedbackQueue(q) {
  try { localStorage.setItem(FB_KEY, JSON.stringify(q)); } catch (e) { /* ignore */ }
}
export async function flushFeedbackQueue() {  const base = backendBase();
  const q = getFeedbackQueue();
  if (!base || !q.length) return q.length;
  const left = [];
  for (const entry of q) {
    try {
      const r = await fetch(`${base}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!r.ok) left.push(entry);
    } catch (e) { left.push(entry); }
  }
  saveFeedbackQueue(left);
  return left.length;
}
export async function submitFeedback({ rating, improvement, problem, page }) {
  const entry = {
    rating: Math.max(0, Math.min(5, Math.round(rating || 0))),
    improvement: String(improvement || '').trim().slice(0, 2000),
    problem: String(problem || '').trim().slice(0, 2000),
    page: String(page || '').slice(0, 120),
    at: nowISO(),
    v: 1,
  };
  const base = backendBase();
  if (base) {
    try {
      const r = await fetch(`${base}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (r.ok) {
        // Piggyback: drain anything queued while offline.
        flushFeedbackQueue().catch(() => {});
        return { sent: true };
      }
    } catch (e) { /* fall through to the local queue */ }
  }
  const q = getFeedbackQueue();
  q.push(entry);
  saveFeedbackQueue(q);
  return { sent: false, queued: true };
}

// Public backend health for the admin System Status tab. No key needed;
// returns { ok:false } when unreachable so the page can say so honestly.
export async function getBackendHealth() {
  const base = backendBase();
  if (!base) return { ok: false };
  try {
    const r = await fetch(`${base}/health`);
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, ...(await r.json()) };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

// Admin inbox reader. The passcode travels as X-Admin-Key and is never stored
// anywhere except the tab's sessionStorage (see pages/Admin.jsx).
export async function getFeedbackAdmin(key, { minRating = 0, limit = 200 } = {}) {  const base = backendBase();
  if (!base) return { ok: false, status: 0 };
  try {
    const r = await fetch(
      `${base}/feedback?min_rating=${Math.max(0, Math.min(5, minRating | 0))}&limit=${Math.max(1, Math.min(1000, limit | 0))}`,
      { headers: { 'X-Admin-Key': key || '' } },
    );
    if (!r.ok) return { ok: false, status: r.status };
    const body = await r.json();
    return { ok: true, count: body.count || 0, items: Array.isArray(body.items) ? body.items : [] };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

// Render an export and hand back the bytes. Split out from downloadFromBackend
// so the share flow can reuse the very same file instead of paying for a second
// headless-Chrome render. Returns null when the backend is unreachable so
// callers keep the local-first fallback.
export async function fetchExportBlob(kind, payload) {  const base = backendBase();
  if (!base) return null;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(`${base}/export/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    // Prefer the server's filename; otherwise normalise ours to one correct
    // extension (strip any existing one first, or "cv.pdf" becomes "cv.pdf.pdf").
    const wantExt = kind === 'pdf' ? '.pdf' : '.docx';
    const m = (r.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
    const mine = payload.filename || (kind === 'pdf' ? 'cv' : 'cv');
    const filename = m ? m[1] : mine.replace(/\.[a-z0-9]+$/i, '') + wantExt;
    return { blob, filename };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export async function downloadFromBackend(kind, payload) {
  const r = await fetchExportBlob(kind, payload);
  if (!r) return false;
  saveBlob(r.blob, r.filename);
  return true;
}

/* ---------------- sharing the real file ---------------- */
// WhatsApp's click-to-chat URL carries text only, so it can never attach the
// document. navigator.share({files}) is the one web API that hands a real file
// to a native share sheet (WhatsApp included) — but only where the OS exposes
// it, in practice Android Chrome and iOS Safari. Everything else falls back to
// the text link, so callers must feature-detect with canShare rather than
// assume navigator.share exists.
export function canShareFile(blob, filename) {
  try {
    if (!navigator.share || !navigator.canShare || typeof File === 'undefined') return false;
    return navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] });
  } catch (e) {
    return false;
  }
}

// Same question, answerable synchronously from a throwaway probe file. Callers
// need this before any await: deciding whether to open a fallback window only
// works while the click is still a user gesture, or the popup gets blocked.
export function supportsFileShare() {
  try {
    if (!navigator.share || !navigator.canShare || typeof File === 'undefined') return false;
    return navigator.canShare({
      files: [new File([new Blob([''])], 'probe.pdf', { type: 'application/pdf' })],
    });
  } catch (e) {
    return false;
  }
}

// 'shared'  - the file reached the share sheet
// 'cancelled' - the user closed the sheet (not an error, do not fall back)
// 'unsupported' - no file sharing here; caller should use the text fallback
export async function shareFile(blob, filename, text) {
  const file = new File([blob], filename, { type: blob.type });
  try {
    await navigator.share({ files: [file], text, title: filename });
    return 'shared';
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

// AI conversation turn (Groq via backend): null when unreachable so the
// caller falls back to the scripted questions.
export async function chatViaBackend(messages, lang) {
  const base = backendBase();
  if (!base) return null;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 75000);
  try {
    const r = await fetch(`${base}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, lang }),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || typeof j.reply !== 'string') return null;
    return j;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(to);
  }
}

// AI draft from the backend (Groq Llama): map model JSON into blankData shape.
// Pure + defensive: unknown fields dropped, arrays capped, never throws.
export function aiJsonToData(d) {
  const s = (v) => String(v ?? '').trim();
  const arr = (v) => (Array.isArray(v) ? v : []);
  const src = d && typeof d === 'object' ? d : {};
  const data = blankData();
  data.personal.summary = s(src.summary);
  data.personal.phone = normalizeTZPhone(s(src.phone)) || s(src.phone);
  data.personal.email = s(src.email);
  data.personal.address = s(src.address);
  const edu = arr(src.education).filter((e) => e && (e.school || e.qualification));
  if (edu.length) {
    data.education = edu.slice(0, 4).map((e) => ({
      school: s(e.school), qualification: s(e.qualification), start: s(e.start), end: s(e.end),
    }));
  }
  const exp = arr(src.experience).filter((e) => e && (e.employer || e.role));
  if (exp.length) {
    data.experience = exp.slice(0, 5).map((e) => ({
      employer: s(e.employer),
      role: s(e.role),
      start: s(e.start),
      end: s(e.end),
      bullets: arr(e.bullets).map(s).filter(Boolean).join('\n'),
    }));
  }
  const sk = arr(src.skills).map(s).filter(Boolean);
  if (sk.length) data.skills = [...new Set(sk)].join('\n');
  return data;
}

// POST answers to the backend AI; null when unreachable/unconfigured
// so the caller falls back to the offline rule-based draft.
export async function draftViaBackend(input) {
  const base = backendBase();
  if (!base) return null;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 75000);
  try {
    const r = await fetch(`${base}/ai/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j.draft) return null;
    return aiJsonToData(j.draft);
  } catch (e) {
    return null;
  } finally {
    clearTimeout(to);
  }
}

// Parse a typed experience-level answer ("2", "fresher", "mhitimu", ...).
// Returns 'student' | 'fresher' | 'experienced' or null when unrecognized.
export function parseLevel(v) {
  const lv = String(v || '').toLowerCase().trim();
  if (/^(1|student|mwanafunzi)\b/.test(lv)) return 'student';
  if (/^(2|fresh|fresher|mhitimu)/.test(lv)) return 'fresher';
  if (/^(3|exper|mwenye uzoefu|uzoefu)/.test(lv)) return 'experienced';
  return null;
}

// Notifications: actionable next steps built from local data.
// tr() is injected (keeps this module free of i18n imports).
export function buildNotifs(cvs, letters, user, tr) {
  const t = tr || ((k) => k);
  const items = [];
  if (!user.name) items.push({ icon: 'ti-user', cls: 'primary', title: t('notif.profileT'), text: t('notif.profileS'), link: 'account.html' });
  if (!cvs.length) items.push({ icon: 'ti-files', cls: 'success', title: t('notif.firstT'), text: t('notif.firstS'), link: 'new-cv.html' });
  else if (!cvs.some((c) => (c.downloads || 0) > 0)) items.push({ icon: 'ti-download', cls: 'warning', title: t('notif.dlT'), text: t('notif.dlS'), link: 'index.html' });
  if (cvs.length && !letters.length) items.push({ icon: 'ti-mail', cls: 'info', title: t('notif.letterT'), text: t('notif.letterS'), link: 'cover-letters.html' });
  return items.slice(0, 4);
}

// Styled .doc export: full Word package carrying the live web design
// (accent color, font, size, template rules) — true WYSIWYG.
// Paper-only overrides appended to every export (see currentExportCSS).
// collectSheetCSS scrapes the live site sheet so exports can never drift from
// the preview, but that sheet is written for the on-screen card, so it drags
// in preview chrome (border/radius/shadow/padding) and lays the CV out with
// flexbox, which LibreOffice's DOCX filter flattens into run-together text
// ("...Hospital2021 - Present", "Patient careIV administration"). The rules
// below are !important so they beat the scraped ones, and deliberately use
// only constructs that Chrome's print path and Writer's HTML import both
// honour, so the PDF and the DOCX render the same.
export const EXPORT_PATCH = `
.cv-sheet{border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;padding:0!important;width:auto!important;max-width:none!important;min-height:0!important;overflow:visible!important}
.tpl-banking .cv-head{margin:0!important;border-radius:0!important}
.tpl-clinical.cv-sheet{column-gap:24px!important}
.cv-head,.cv-sec,.cv-item,.cv-item-head,.cv-bullets li,.skill-chip{break-inside:avoid;page-break-inside:avoid}
.cv-sec{break-after:avoid;page-break-after:avoid}
.cv-item-head{display:table!important;width:100%!important;border-collapse:collapse!important}
.cv-item-head td{border:0!important;padding:0!important;vertical-align:bottom!important}
.cv-item-head .cv-h-left{text-align:left!important;padding-right:12px!important}
.cv-item-head .cv-dates{text-align:right!important;white-space:nowrap!important}
.skill-chip{margin:0 0 4px 0!important}
.cv-sheet p,.cv-sheet li,.cv-sheet div{orphans:2;widows:2}
`;

// ---- shared export theme constants ----
// These live here, not in the pages, so the Builder and the Dashboard cannot
// drift apart and start rendering the same CV differently.
export const TPL_DEFAULTS = { graduate: '#008000', government: '#00C951', banking: '#008000', general: '#008000', clinical: '#244655', exact: '#244655' };
export const FONTS = { poppins: "'Poppins',sans-serif", georgia: "Georgia,Gelasio,'Times New Roman',serif", arial: "Arial,'Liberation Sans',Helvetica,sans-serif" };
export const SIZES = { s: '12px', m: '13px', l: '14.5px' };

export const DEFAULT_THEME = { color: '#008000', font: 'poppins', size: 'm' };

// Old CVs saved before a field existed must still export: fill from the
// template default rather than rendering undefined colours.
export function themeFor(cv) {
  const template = (cv && cv.template) || 'graduate';
  const th = (cv && cv.theme) || {};
  return {
    color: th.color || TPL_DEFAULTS[template] || DEFAULT_THEME.color,
    font: th.font || DEFAULT_THEME.font,
    size: th.size || DEFAULT_THEME.size,
  };
}

// Standalone stylesheet for the headless export path. Self-sufficient, so it
// works with no rendered sheet in the DOM (the Dashboard has none).
export function exportCSS(theme, template) {
  const th = { ...DEFAULT_THEME, ...(theme || {}) };
  const accent = th.color || '#008000';
  const font = FONTS[th.font] || FONTS.poppins;
  const size = SIZES[th.size] || SIZES.m;
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

// Seeded demo rows carry no `data` at all, and CVs saved by older builds can be
// missing individual fields. Merging over blankData means an export can never
// throw on a sparse record.
export function cvDataFor(cv) {
  const d = (cv && cv.data) || {};
  const b = blankData();
  const arr = (v, fallback) => (Array.isArray(v) ? v : fallback);
  return {
    ...b, ...d,
    personal: { ...b.personal, ...(d.personal || {}) },
    education: arr(d.education, b.education),
    experience: arr(d.experience, b.experience),
    projects: arr(d.projects, b.projects),
    referees: arr(d.referees, b.referees),
    skills: d.skills || '',
  };
}

// Export payload with no DOM dependency. The Builder prefers its live sheet
// (higher fidelity, keeps on-screen tweaks); anything else uses this.
export function exportPayloadFor(cv) {
  const template = (cv && cv.template) || 'graduate';
  const theme = themeFor(cv);
  const exact = template === 'exact';
  return {
    html: cvThemedHTML(cvDataFor(cv), {
      color: theme.color,
      fontStack: FONTS[theme.font] || FONTS.poppins,
      size: SIZES[theme.size] || SIZES.m,
    }, template, { singleFont: false }),
    css: exact ? '' : exportCSS(theme, template),
  };
}

export function plainText(raw) {
  const d = raw || {};
  const p = d.personal || {};
  const experience = Array.isArray(d.experience) ? d.experience : [];
  const education = Array.isArray(d.education) ? d.education : [];
  const referees = Array.isArray(d.referees) ? d.referees : [];
  const out = [p.fullName, p.title, [p.phone, p.email, p.address].filter(Boolean).join(' | '), ''];
  if (p.summary) out.push('SUMMARY', p.summary, '');
  if (experience.some((e) => e.role)) {
    out.push('EXPERIENCE');
    experience.forEach((e) => { if (e.role || e.employer) { out.push(`${e.role} — ${e.employer} (${e.start} - ${e.end})`); String(e.bullets).split('\n').forEach((b) => { if (b.trim()) out.push(`- ${b.trim()}`); }); } });
    out.push('');
  }
  if (education.some((e) => e.school)) {
    out.push('EDUCATION');
    education.forEach((e) => { if (e.school || e.qualification) out.push(`${e.qualification} — ${e.school} (${e.start} - ${e.end})`); });
    out.push('');
  }
  if (String(d.skills).trim()) out.push('SKILLS', String(d.skills).trim(), '');
  const refs = referees.filter((r) => (r.name || '').trim());
  if (refs.length) { out.push('REFEREES'); refs.forEach((r) => out.push(`${r.name}${r.title ? `, ${r.title}` : ''}${r.phone ? ` — ${r.phone}` : ''}`)); }
  return out.join('\n');
}

/* Hands the real PDF to the OS share sheet where that is possible.
   navigator.share({files}) is the only web route to a native share sheet with a
   real attachment; wa.me itself carries text and nothing else. Desktop has no
   file sharing, so there we open the text link (synchronously, while the click
   is still a gesture, or the popup gets blocked) and drop the PDF into the
   downloads for the user to attach by hand.

   Callers pass their own payload so each surface can export at its own
   fidelity, but the sharing decision lives here exactly once. */
export async function shareCVWhatsApp({ cv, payload, onShared }) {
  const data = cvDataFor(cv);
  const personal = data.personal || {};
  const who = `${(personal.fullName || '').trim() || 'Untitled'} — ${(personal.title || '').trim()}`;
  const caption = `My CV: ${who}`;
  const text = `${caption}\n\n${plainText(data)}`;
  // Bare stem: the export layer owns the extension.
  const stem = `${(personal.fullName || '').trim() || 'My'}-CV`;

  if (!supportsFileShare()) {
    window.open(waLink(text), '_blank', 'noopener');
    const ok = await downloadFromBackend('pdf', { ...payload, filename: stem });
    if (!ok) downloadStyledDoc(stem, payload.html, payload.css);
    return 'fallback';
  }

  const got = await fetchExportBlob('pdf', { ...payload, filename: stem });
  if (!got) { window.open(waLink(text), '_blank', 'noopener'); return 'fallback'; }

  // With a real attachment attached, a short caption beats dumping the whole CV
  // as text as well; the full text is for the text-only fallback.
  const res = await shareFile(got.blob, got.filename, caption);
  if (res === 'shared') { if (onShared) onShared(); return 'shared'; }
  if (res === 'cancelled') return 'cancelled';

  // Declined or the sheet refused the file: do not lose the CV, and still give
  // them the text so the message is not empty.
  saveBlob(got.blob, got.filename);
  window.open(waLink(text), '_blank', 'noopener');
  return 'fallback';
}

// Idempotent: safe to call on a sheet that already carries the patch.
export function withExportPatch(css) {
  const s = String(css || '');
  return s.includes('.cv-item-head{display:table!important') ? s : s + EXPORT_PATCH;
}

export function downloadStyledDoc(filename, sheetHTML, cssText) {
  const name = String(filename || 'document').replace(/[\\/:*?"<>|]/g, '-').replace(/(\.doc)?$/i, '.doc');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>CV</title><style>${cssText}</style></head><body>${sheetHTML}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const TEMPLATE_LABELS = { graduate: 'Graduate', government: 'Govt/NGO', banking: 'Banking', general: 'General', clinical: 'Clinical', exact: 'Exact', barua: 'Barua' };

export function blankData() {
  return {
    personal: { fullName: '', title: '', phone: '', email: '', address: '', summary: '', photo: '' },
    education: [{ school: '', qualification: '', start: '', end: '' }],
    experience: [{ employer: '', role: '', start: '', end: '', bullets: '' }],
    skills: '',
    projects: [{ name: '', desc: '' }],
    referees: [{ name: '', title: '', phone: '' }, { name: '', title: '', phone: '' }],
  };
}

export function createCV(template) {
  const s = load();
  s.seq += 1;
  const cv = { id: `cv-${s.seq}`, name: 'Untitled CV', template: template || 'general', lang: 'EN', target: '', match: 0, downloads: 0, updatedAt: nowISO(), data: blankData() };
  s.cvs.unshift(cv);
  save(s);
  return cv;
}

export function updateCV(id, patch) {
  const s = load();
  const cv = s.cvs.find((c) => c.id === id);
  if (!cv) return null;
  Object.assign(cv, patch, { updatedAt: nowISO() });
  save(s);
  return cv;
}

export function normalizeTZPhone(raw) {
  const d = String(raw || '').replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(d)) return `+255${d.slice(1)}`;
  if (/^255\d{9}$/.test(d)) return `+${d}`;
  return raw;
}

// ---- device-local user profile ----
const USER_KEY = 'mrcv.user';
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; }
  catch (e) { return {}; }
}
export function saveUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u || {})); }
export function clearUser() { localStorage.removeItem(USER_KEY); }

// ---- target country / region ----
export const COUNTRIES = [
  { code: 'TZ', name: 'Tanzania' }, { code: 'KE', name: 'Kenya' }, { code: 'UG', name: 'Uganda' },
  { code: 'RW', name: 'Rwanda' }, { code: 'BI', name: 'Burundi' }, { code: 'CD', name: 'DR Congo' },
  { code: 'NG', name: 'Nigeria' }, { code: 'GH', name: 'Ghana' }, { code: 'ZA', name: 'South Africa' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' }, { code: 'AE', name: 'UAE' },
];

export const REGIONS = {
  TZ: ['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Zanzibar North', 'Zanzibar South', 'Zanzibar West'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu'],
  UG: ['Kampala', 'Wakiso', 'Gulu', 'Mbarara', 'Jinja'],
  RW: ['Kigali', 'Musanze', 'Huye', 'Rusizi'],
  BI: ['Bujumbura', 'Gitega', 'Ngozi'],
  CD: ['Kinshasa', 'Lubumbashi', 'Goma'],
  NG: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'],
  GH: ['Accra', 'Kumasi', 'Tamale'],
  ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  GB: ['London', 'Manchester', 'Birmingham'],
  US: ['New York', 'California', 'Texas'],
  CA: ['Toronto', 'Vancouver', 'Ontario'],
  DE: ['Berlin', 'Munich', 'Hamburg'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
};

// ---- shared CV renderer (single real template: Graduate Starter) ----
export function bulletsHTML(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  return `<ul class="cv-bullets">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

export function datesHTML(s, e) {
  const t = [s, e].map((x) => String(x || '').trim()).filter(Boolean).join(' – ');
  return t ? `<span class="cv-dates">${esc(t)}</span>` : '';
}

// Two-column role/employer + dates row as a borderless table. Writer only
// honours real table markup, so this is what keeps the columns from merging
// in the exported DOCX. The left cell is always present; the dates cell is
// omitted when there are no dates.
export function itemHeadHTML(left, s, e) {
  const t = [s, e].map((x) => String(x || '').trim()).filter(Boolean).join(' – ');
  const right = t ? `<td class="cv-dates">${esc(t)}</td>` : '';
  return `<table class="cv-item-head"><tbody><tr><td class="cv-h-left">${esc(left)}</td>${right}</tr></tbody></table>`;
}

export function cvToHTML(data, only = null) {
  const show = (key) => !only || only.includes(key);
  const p = data.personal;
  const contact = [p.phone, p.email, p.address].map((x) => String(x || '').trim()).filter(Boolean).join(' · ');
  const skills = String(data.skills || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  return `
    <div class="cv-head">
      <div class="cv-name">${esc(p.fullName) || '<span class="text-secondary">Your Name</span>'}</div>
      ${p.title ? `<div class="cv-title">${esc(p.title)}</div>` : ''}
      ${contact ? `<div class="cv-contact">${esc(contact)}</div>` : ''}
    </div>
    ${show('summary') && p.summary ? `<div class="cv-sec">Summary</div><div>${esc(p.summary)}</div>` : ''}
    ${show('experience') && data.experience.some((e) => e.role || e.employer) ? `<div class="cv-sec">Experience</div>${data.experience.filter((e) => e.role || e.employer).map((e) => `
      <div class="cv-item">${itemHeadHTML(`${esc(e.role)}${e.employer ? ` — ${esc(e.employer)}` : ''}`, e.start, e.end)}${bulletsHTML(e.bullets)}</div>`).join('')}` : ''}
    ${show('education') && data.education.some((e) => e.school || e.qualification) ? `<div class="cv-sec">Education</div>${data.education.filter((e) => e.school || e.qualification).map((e) => `
      <div class="cv-item">${itemHeadHTML(`${esc(e.qualification)}${e.school ? ` — ${esc(e.school)}` : ''}`, e.start, e.end)}</div>`).join('')}` : ''}
    ${show('skills') && skills.length ? `<div class="cv-sec">Skills</div><div>${skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join(' ')}</div>` : ''}
    ${show('projects') && data.projects.some((x) => x.name || x.desc) ? `<div class="cv-sec">Projects</div>${data.projects.filter((x) => x.name || x.desc).map((x) => `
      <div class="cv-item">${itemHeadHTML(esc(x.name), '', '')}<div>${esc(x.desc)}</div></div>`).join('')}` : ''}
    ${show('referees') && data.referees.some((r) => r.name) ? `<div class="cv-sec">Referees</div>${data.referees.filter((r) => r.name).map((r) => `
      <div class="cv-item"><strong>${esc(r.name)}</strong>${r.title ? ` — ${esc(r.title)}` : ''}${r.phone ? `<br><span class="cv-dates">${esc(r.phone)}</span>` : ''}</div>`).join('')}` : ''}`;
}

// Export-ready HTML with the design inlined (accent, font, size, template
// rules as style="" attributes). LibreOffice ignores class CSS, so files
// must carry their looks inline; Chrome uses these + the scraped stylesheet.
// opts.singleFont: request only the first family (Word/LibreOffice take the
// whole stack as one broken name otherwise); browsers keep the full stack.
export function cvThemedHTML(data, theme, template, opts = {}) {
  const accent = (theme && theme.color) || '#008000';
  const fullStack = (theme && theme.fontStack) || "'Poppins',sans-serif";
  const font = opts.singleFont ? fullStack.split(',')[0].replace(/['"]/g, '') : fullStack;
  const size = (theme && theme.size) || '13px';
  const st = (s) => ` style="${s}"`;
  if (template === 'exact') return cvExactExport(data, { accent, font, size });
  let h = cvToHTML(data);
  const headExtra = template === 'banking'
    ? 'background:#262626;color:#ffffff;padding:12px 14px;margin-bottom:12px;'
    : (template === 'government' ? 'text-align:center;margin-bottom:12px;' : 'margin-bottom:12px;');
  h = h.replace('<div class="cv-head">', `<div${st(headExtra)}>`);
  const nameColor = template === 'banking' ? '#ffffff' : ((template === 'graduate' || template === 'clinical') ? accent : '#171717');
  h = h.split('<div class="cv-name">').join(`<div${st(`font-size:22px;font-weight:700;color:${nameColor};margin:0;`)}>`);
  const titleColor = template === 'banking' ? '#F0B100' : accent;
  h = h.split('<div class="cv-title">').join(`<div${st(`font-size:13px;font-weight:700;color:${titleColor};margin-bottom:4px;`)}>`);
  h = h.split('<div class="cv-contact">').join(`<div${st('font-size:12px;color:#737373;margin-bottom:12px;')}>`);
  let sec = `font-size:12px;font-weight:700;color:#171717;border-bottom:2px solid ${accent};padding-bottom:2px;margin:14px 0 6px;`;
  if (template === 'government') sec = `font-size:12px;font-weight:700;color:#171717;border-bottom:3px double ${accent};padding-bottom:2px;margin:14px 0 6px;`;
  if (template === 'general') sec = `font-size:12px;font-weight:700;color:#171717;border:none;border-left:4px solid ${accent};padding-left:8px;margin:14px 0 6px;`;
  h = h.split('<div class="cv-sec">').join(`<div${st(sec)}>`);
  h = h.split('<span class="cv-dates">').join(`<span${st('color:#737373;font-size:12px;')}`);
  h = h.split('<table class="cv-item-head">').join(`<table${st('width:100%;border-collapse:collapse;border:0;font-weight:700;')}>`);
  h = h.split('<td class="cv-h-left">').join(`<td${st('border:0;padding:0 12px 0 0;vertical-align:bottom;text-align:left;')}>`);
  h = h.split('<td class="cv-dates">').join(`<td${st('border:0;padding:0;vertical-align:bottom;text-align:right;white-space:nowrap;font-weight:400;color:#737373;font-size:12px;')}>`);
  return `<div${st(`font-family:${font};font-size:${size};color:#262626;line-height:1.55;`)}>${h}</div>`;
}

// Exact replica pro layout: fixed photo rail (photo,
// contact, skills) + main column (two-tone name, profile, experience,
// education, referees). Screen version uses CSS grid; export uses tables.
export function cvExactHTML(data) {
  const p = data.personal;
  const parts = String(p.fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || '';
  const last = parts.join(' ');
  const contact = [p.phone, p.email, p.address].map((x) => String(x || '').trim()).filter(Boolean);
  const photo = p.photo
    ? `<img src="${p.photo}" class="cv-exact-photo" alt="">`
    : `<span class="cv-exact-initials">${esc(((first.charAt(0) || '') + (last.charAt(0) || '') || 'CV').toUpperCase())}</span>`;
  const skills = String(data.skills || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const expList = data.experience.filter((e) => e.role || e.employer);
  const eduList = data.education.filter((e) => e.school || e.qualification);
  const refList = data.referees.filter((r) => r.name);
  const sec = (t, inner) => inner ? `<div class="cv-exact-sec">${t}</div>${inner}` : '';
  return `
    <div class="cv-exact-cols">
      <div class="cv-exact-rail">
        <div class="cv-exact-photoWrap">${photo}</div>
        ${sec('CONTACT', contact.map((c) => `<div class="cv-exact-line">${esc(c)}</div>`).join(''))}
        ${sec('SKILLS', skills.map((s) => `<div class="cv-exact-line">${esc(s)}</div>`).join(''))}
      </div>
      <div class="cv-exact-main">
        <div class="cv-exact-name"><span class="first">${esc(first) || 'Your'}</span> <span class="last">${esc(last) || 'Name'}</span></div>
        ${p.title ? `<div class="cv-exact-role">${esc(p.title)}</div>` : ''}
        ${sec('PROFILE', p.summary ? `<div>${esc(p.summary)}</div>` : '')}
        ${sec('WORK EXPERIENCE', expList.map((e) => `
          <div class="cv-item">${itemHeadHTML(`${esc(e.role)}${e.employer ? ` — ${esc(e.employer)}` : ''}`, e.start, e.end)}${bulletsHTML(e.bullets)}</div>`).join(''))}
        ${sec('EDUCATION', eduList.map((e) => `
          <div class="cv-item">${itemHeadHTML(`${esc(e.qualification)}${e.school ? ` — ${esc(e.school)}` : ''}`, e.start, e.end)}</div>`).join(''))}
        ${sec('REFEREES', refList.map((r) => `
          <div class="cv-item"><strong>${esc(r.name)}</strong>${r.title ? ` — ${esc(r.title)}` : ''}${r.phone ? `<br><span class="cv-dates">${esc(r.phone)}</span>` : ''}</div>`).join(''))}
      </div>
    </div>`;
}

// Table-based export twin of cvExactHTML (Word/LibreOffice-proof).
// Uses legacy primitives only (table/cell attrs, font tags, paragraphs):
// LibreOffice drops class CSS, so everything rides inline or on attributes.
export function cvExactExport(data, t) {
  const p = data.personal;
  const parts = String(p.fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || '';
  const last = parts.join(' ');
  const contact = [p.phone, p.email, p.address].map((x) => String(x || '').trim()).filter(Boolean);
  const skills = String(data.skills || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const photo = p.photo
    ? `<p align="center"><img src="${p.photo}" width="110"></p>`
      : `<p align="center"><font color="${t.accent}" size="6"><b>${esc(((first.charAt(0) || '') + (last.charAt(0) || '') || 'CV').toUpperCase())}</b></font></p>`;
  const secH = (txt) => `<p><font color="${t.accent}" size="3"><b>${txt}</b></font></p>`;
  const para = (txt) => `<p>${esc(txt)}</p>`;
  const rail = `${photo}`
    + (contact.length ? secH('CONTACT') + contact.map((c) => para(c)).join('') : '')
    + (skills.length ? secH('SKILLS') + skills.map((s) => para(s)).join('') : '');
  const expList = data.experience.filter((e) => e.role || e.employer);
  const eduList = data.education.filter((e) => e.school || e.qualification);
  const refList = data.referees.filter((r) => r.name);
  const li = (b) => `<ul>` + String(b || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('') + `</ul>`;
  const head = (role, emp, dates) => `<p><b>${esc(role)}${emp ? ` — ${esc(emp)}` : ''}</b>${dates ? ` <font color="#737373">(${esc(dates)})</font>` : ''}</p>`;
  const main = `<p><font color="#171717" size="6">${esc(first) || 'Your'}</font> <font color="${t.accent}" size="6"><b>${esc(last) || 'Name'}</b></font></p>`
    + (p.title ? `<p><b>${esc(p.title)}</b></p>` : '')
    + (p.summary ? secH('PROFILE') + para(p.summary) : '')
    + (expList.length ? secH('WORK EXPERIENCE') + expList.map((e) => head(e.role, e.employer, [e.start, e.end].filter(Boolean).join(' - ')) + li(e.bullets)).join('') : '')
    + (eduList.length ? secH('EDUCATION') + eduList.map((e) => head(`${e.qualification}${e.school ? ` — ${e.school}` : ''}`, '', [e.start, e.end].filter(Boolean).join(' - '))).join('') : '')
    + (refList.length ? secH('REFEREES') + refList.map((r) => para(`${r.name}${r.title ? `, ${r.title}` : ''}${r.phone ? ` — ${r.phone}` : ''}`)).join('') : '');
  return `<div style="font-family:${t.font};font-size:${t.size};color:#262626;"><table width="100%" border="0" cellpadding="10" cellspacing="0"><tr>`
    + `<td width="32%" valign="top" bgcolor="#EFEDEA">${rail}</td>`
    + `<td width="68%" valign="top" bgcolor="#FFFFFF">${main}</td>`
    + `</tr></table></div>`;
}

export const SAMPLE_EXACT = {
  personal: {
    fullName: 'Kai Carter',
    title: 'General Practitioner',
    phone: '678-555-0103',
    email: 'kai@lamnahealthcare.com',
    address: 'www.lamnahealthcare.com',
    summary: 'Experienced and compassionate GP dedicated to delivering excellent patient care. Known for strong diagnostic skills and a patient-centered approach. Committed to promoting health and wellness through personalized treatment plans.',
  },
  education: [
    { school: 'Jasper University', qualification: "Dean's List, Medical Research Award", start: 'September 20XX', end: 'June 20XX' },
    { school: 'Bellows College', qualification: 'Bachelor of Science in Biology, Cum Laude', start: 'September 20XX', end: 'May 20XX' },
  ],
  experience: [
    { employer: 'Lamna Healthcare', role: 'General Practitioner', start: 'December 20XX', end: 'present', bullets: 'Implemented evidence-based medicine for accurate diagnosis\nSpearheaded a community health fair, provided free screenings to over 200 residents' },
    { employer: 'City Hospital', role: 'Medical Officer', start: 'April 20XX', end: 'August 20XX', bullets: 'Provided emergency medical care with a focus on trauma cases\nCollaborated with specialists to enhance patient outcomes' },
    { employer: 'Tyler Stein MD', role: 'Family Physician', start: 'August 20XX', end: 'July 20XX', bullets: 'Managed a diverse patient caseload\nLed a smoking cessation program, +30% successful quit attempts' },
  ],
  skills: 'Clinical diagnosis\nPatient-centered care\nHealth promotion\nChronic disease management\nElectronic health records',
  projects: [{ name: '', desc: '' }],
  referees: [{ name: '', title: '', phone: '' }, { name: '', title: '', phone: '' }],
};

export const SAMPLE_CV = {
  personal: {
    fullName: 'Amina Juma',
    title: 'BSc Computer Science Graduate',
    phone: '+255765123456',
    email: 'amina.juma@example.com',
    address: 'Ubungo, Dar es Salaam',
    summary: 'Motivated Computer Science graduate from the University of Dar es Salaam with hands-on IT support experience and a final-year project in mobile payments. Quick to learn, hardworking and ready to contribute from day one.',
  },
  education: [
    { school: 'University of Dar es Salaam', qualification: 'BSc in Computer Science', start: '2020', end: '2023' },
    { school: 'Kilakala Secondary School', qualification: 'ACSEE — Division I', start: '2018', end: '2020' },
  ],
  experience: [
    {
      employer: 'Vodacom Tanzania — IT Department',
      role: 'IT Support Intern (Field Attachment)',
      start: 'Jun 2022',
      end: 'Aug 2022',
      bullets: 'Resolved 30+ staff support tickets on hardware, email and network issues\nDocumented common fixes, cutting repeat tickets by 20%\nAssisted rollout of 50 new workstations across two floors',
    },
  ],
  skills: 'Computer troubleshooting\nMS Office & Google Workspace\nBasic networking\nKiswahili & English\nTeamwork',
  projects: [
    { name: 'M-Pesa Fee Calculator App', desc: 'Android class project that computes mobile-money charges offline. Presented to 60 students and lecturers.' },
  ],
  referees: [
    { name: 'Dr. Neema Shirima', title: 'Lecturer, UDSM', phone: '+255754987654' },
    { name: 'Mr. Baraka Mziray', title: 'Supervisor, Vodacom Tanzania', phone: '+255713456789' },
  ],
};

// ---- application letter renderer (Barua) ----
// Letter layout follows the Tanzanian formal-letter flow: a right-aligned
// sender block, a left-aligned recipient block, an indented salutation, a
// centred subject line, a justified body with a first-line indent, then a
// right-aligned closing block.
export function letterToHTML(l) {
  // The date belongs to the right-aligned sender block, as its last line.
  const sender = [l.sender, ...(l.senderLines || []), l.date].filter(Boolean);
  const to = [l.recipient, ...String(l.address || '').split('\n')].filter(Boolean);
  return `
    <div class="lt-block lt-right lt-sender">${sender.map((x) => `<div>${esc(x)}</div>`).join('')}</div>
    <div class="lt-block lt-left lt-to">${to.map((x) => `<div>${esc(x)}</div>`).join('')}</div>
    ${l.salutation ? `<div class="lt-block lt-salute">${esc(l.salutation)}</div>` : ''}
    ${l.ref ? `<div class="lt-block lt-subject">${esc(l.ref)}</div>` : ''}
    ${(l.body || []).map((x) => `<p class="lt-para">${esc(x)}</p>`).join('')}
    <div class="lt-block lt-center lt-close">
      <div>${esc(l.close)}</div>
      ${l.signature ? `<div>${esc(l.signature)}</div>` : ''}
      <div>${esc(l.name)}</div>
      ${l.contact ? `<div class="lt-contact">${esc(l.contact)}</div>` : ''}
    </div>`;
}

export const SAMPLE_LETTER = {
  sender: 'DATIVA LUCAS',
  senderLines: ['S.L.P 15101', 'TEMEKE', 'DAR ES SALAAM'],
  date: '28/09/2026',
  recipient: 'HUMAN RESOURCE',
  address: 'MOFAT COMPANY LIMITED,\nS.L.P 19875,\nDAR ES SALAAM.',
  salutation: 'NDG,',
  ref: 'YAH: MAOMBI YA NAFASI YA KAZI YA PASSENGER SERVICE OFFICER',
  body: [
    'Rejea mada tajwa hapo juu, mimi ni mkazi wa kata Charambe mwenye umri wa miaka 23. Nimeandika barua hii kwako Meneja wa Rasilimali Watu kuomba nafasi ya kazi katika kampuni yako.',
    'Mimi nina nia na uwezo wa kufanya kazi kwa bidii, kufuata taratibu na maelekezo ya kazi, kushughulikia changamoto za wateja kwa utulivu na kuhakikisha huduma inayotolewa kwa abiria inakuwa ya kiwango kizuri.',
    'Pia niko tayari kujifunza zaidi na kuendelea ujuzi wangu kulingana na mahitaji ya kampuni. Kwa heshima naomba kuwasilisha maombi yangu ya nafasi ya kazi ya Passenger Service Officer katika kampuni yako, nimeambatanisha nakala za vyeti pamoja na CV.',
    'Nitashukuru iwapo ombi langu litakubaliwa.',
  ],
  close: 'Wako katika ujenzi wa Taifa',
  signature: 'D.Lucas',
  name: 'Dativa Lucas.',
  contact: 'Mawasiliano: +255 616 196 332',
};

// The stylesheet that carries the formal-letter layout into the PDF (Chromium)
// and DOCX (LibreOffice) renderers. Both backends wrap html+css the same way,
// so one sheet serves both. Page margins come from .cv-sheet padding because
// the PDF endpoint forces its own 10mm Chromium margin over any @page rule.
export function letterExportCSS() {
  return `@page { size: A4; margin: 0; }
body { margin: 0; padding: 0; background: #fff; }
.cv-sheet, .tpl-letter {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 16pt;
  color: #000;
  background: #fff;
  padding: 1in;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.lt-block { margin: 0 0 10pt; }
.lt-right { text-align: right; }
.lt-left { text-align: left; }
.lt-center { text-align: center; }
.lt-sender { line-height: 30.7pt; margin-bottom: 15pt; }
.lt-salute { text-indent: 24pt; }
.lt-subject { text-align: center; margin-bottom: 12pt; }
.lt-para { margin: 0 0 10pt; text-align: justify; text-indent: 66pt; }
.lt-to > div, .lt-close > div { line-height: 16pt; }
.lt-to > div:not(:last-child), .lt-close > div:not(:last-child) { margin-bottom: 10pt; }
.lt-close { margin-top: 12pt; }
.lt-contact { margin-top: 6pt; }`;
}

export function letterSheetHTML(inner) {
  return `<div class="cv-sheet tpl-letter">${inner}</div>`;
}

// Split a plain-text letter into its formal parts. One parser serves three
// callers: the preview, the exporters and the Custom editor, so a field edited
// in the editor always reaches the rendered sheet.
export function parseLetterParts(text) {
  const empty = { date: '', to: [], salutation: '', subject: '', paras: [], closing: [] };
  const blocks = String(text || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) return empty;
  const rows = (b) => b.split('\n').map((x) => x.trim()).filter(Boolean);
  const first = (b) => rows(b)[0] || '';
  const isSubject = (b) => /^(yah\s*:|re\s*:|subject\s*:)/i.test(first(b));
  const isSalute = (b) => rows(b).length === 1 && first(b).length <= 42 && /[,،.]$/.test(first(b)) && !isSubject(b);
  const isClose = (b) => /^(wako|yours|your sincerely|salamu|regards|best regards)/i.test(first(b));

  const head = rows(blocks[0]);
  const hasDate = head.length > 1;
  const rest = blocks.slice(1);
  const salutation = (rest.find(isSalute) || '').trim();
  const subject = (rest.find(isSubject) || '').trim();
  const mid = rest.filter((b) => b !== salutation && b !== subject);
  const closeAt = mid.findIndex(isClose);

  const to = hasDate ? head.slice(1) : head;
  const paras = (closeAt === -1 ? mid : mid.slice(0, closeAt)).map((b) => b.replace(/\s*\n\s*/g, ' '));

  // A single unclassified block is prose the user typed, not a mailing address.
  // Keep it in the body so the Custom editor opens on something editable.
  if (!hasDate && !salutation && !subject && !paras.length && !mid.length && to.length === 1) {
    return { ...empty, paras: [to[0]] };
  }

  return {
    date: hasDate ? head[0] : '',
    to,
    salutation,
    subject,
    paras,
    closing: closeAt === -1 ? [] : rows(mid.slice(closeAt).join('\n\n')),
  };
}

// Inverse of parseLetterParts. Blank parts are dropped so a half-filled editor
// never emits runs of empty lines into the letter.
export function composeLetterParts(p) {
  const blocks = [
    [p.date, ...(p.to || [])].filter(Boolean).join('\n'),
    p.salutation,
    p.subject,
    ...(p.paras || []).filter(Boolean),
    (p.closing || []).filter(Boolean).join('\n'),
  ];
  return blocks.filter((b) => String(b).trim()).join('\n\n').trim();
}

// Render the plain-text letter through the formal-letter layout: sender/date
// block right, recipient left, indented salutation, centred subject, justified
// body, closing block centred.
export function plainLetterToHTML(text, meta = {}) {
  const p = parseLetterParts(text);
  if (!p.date && !p.to.length && !p.subject && !p.salutation && !p.paras.length && !p.closing.length) return '';
  const sender = [meta.sender, ...(meta.senderLines || []), p.date].filter(Boolean);
  return `
    ${sender.length ? `<div class="lt-block lt-right lt-sender">${sender.map((x) => `<div>${esc(x)}</div>`).join('')}</div>` : ''}
    ${p.to.length ? `<div class="lt-block lt-left lt-to">${p.to.map((x) => `<div>${esc(x)}</div>`).join('')}</div>` : ''}
    ${p.salutation ? `<div class="lt-block lt-salute">${esc(p.salutation)}</div>` : ''}
    ${p.subject ? `<div class="lt-block lt-subject">${esc(p.subject)}</div>` : ''}
    ${p.paras.map((x) => `<p class="lt-para">${esc(x)}</p>`).join('')}
    ${p.closing.length ? `<div class="lt-block lt-center lt-close">${p.closing.map((x) => `<div>${esc(x)}</div>`).join('')}${meta.contact ? `<div class="lt-contact">${esc(meta.contact)}</div>` : ''}</div>` : ''}`;
}

// Model output is not trustworthy formatting-wise: strip code fences, markdown
// emphasis and chat preambles so parseLetterParts sees only the letter.
export function sanitizeLetter(raw) {
  // Anything that is not a string cannot be laid out, and guessing would put
  // "42" into the recipient block.
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  s = s.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '');
  s = s.replace(/^\s*(here(?:'s| is)[^\n:]{0,80}:|cover letter:?|letter:?)\s*/i, '');
  s = s.split('\n')
    .map((r) => r
      .replace(/\*\*/g, '')
      .replace(/(^|\s)\*([^*\n]+)\*(\s|$)/g, '$1$2$3')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*]\s+(?=\S)/, '')
      .trimEnd())
    .join('\n');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

// Instruction for the letter endpoint. The layout contract is spelled out
// because parseLetterParts keys off blank lines and the RE:/YAH: prefix.
export function letterPrompt({ name, jobTitle, company, manager, lang, ad, bg, kws }) {
  const sw = String(lang).toUpperCase() === 'SW';
  const shape = [
    'Reply with ONLY the letter text. No markdown, no code fences, no commentary, no labels.',
    'Use exactly this layout, with one blank line between blocks:',
    'Block 1, one line each: today\'s date (DD/MM/YYYY), the hiring manager or department,',
    `the company name, the company address or city.`,
    'Block 2: a greeting ending in a comma.',
    `Block 3: a subject line starting "${sw ? 'YAH' : 'RE'}:".`,
    'Block 4-6: two or three short prose paragraphs. The first states the role being applied',
    'for and why. The next gives concrete evidence of fit. The last thanks them and asks for',
    'an interview.',
    'Block 7: a sign-off ending in a comma, then the full name on its own line, then',
    `"${sw ? 'Viambatanisho' : 'Attachments'}: CV" on its own line, written in ${sw ? 'Kiswahili' : 'English'}.`,
  ].join('\n');
  const facts = [
    `Applicant name: ${name || '(unknown)'}`,
    `Job title: ${jobTitle || '(not stated)'}`,
    `Company: ${company || '(not stated)'}`,
    `Hiring manager: ${manager || '(not stated - address it as Sir/Madam)'}`,
    `Write the letter in ${sw ? 'Kiswahili' : 'English'}.`,
    kws && kws.length ? `Requirements worth echoing: ${kws.join(', ')}.` : '',
    bg ? `Applicant background (use only what is relevant): ${String(bg).slice(0, 800)}` : '',
    ad ? `Job advert (use only what is relevant): ${String(ad).slice(0, 1500)}` : '',
  ].filter(Boolean).join('\n');
  return `${shape}\n\n${facts}`;
}

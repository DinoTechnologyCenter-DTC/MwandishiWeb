// MrCV smoke tests — pure lib functions with DOM stubs. Run: npm test
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
global.document = { addEventListener() {} };
global.location = { search: '' };
global.history = { replaceState() {} };
global.window = global;

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass += 1; console.log(`PASS - ${name}`); }
  else { fail += 1; console.log(`FAIL - ${name}`); }
};

const m = await import('../src/lib/store.js');
const i = await import('../src/lib/i18n.js');

check('7 templates', m.TEMPLATES.length === 7);
check('sample renders', m.cvToHTML(m.SAMPLE_CV).includes('Amina Juma'));
check('exact two-tone', m.cvExactHTML(m.SAMPLE_EXACT).includes('<span class="last">Carter</span>'));
check('letter renders', m.letterToHTML(m.SAMPLE_LETTER).includes('Wako mtiifu'));
check('notif: fresh user nudged', m.buildNotifs([], [], {}, (k) => k).length === 2);
check('notif: complete user clear', m.buildNotifs([{ downloads: 1 }], [{ id: 1 }], { name: 'A' }, (k) => k).length === 0);
check('i18n EN', i.t('nav.mycvs') === 'My CVs');
m.saveUser({ lang: 'SW' });
check('i18n SW', i.t('nav.mycvs') === 'CV Zangu');
m.clearUser();
check('crud roundtrip', (() => {
  const cv = m.createCV('graduate');
  m.updateCV(cv.id, { name: 'Test' });
  const ok = m.getCV(cv.id).name === 'Test';
  m.deleteCV(cv.id);
  return ok && !m.getCV(cv.id);
})());
check('phone normalize', m.normalizeTZPhone('0765123456') === '+255765123456');
check('level numbers', m.parseLevel('1') === 'student' && m.parseLevel('2') === 'fresher' && m.parseLevel('3') === 'experienced');
check('level words EN/SW', m.parseLevel('Fresh graduate') === 'fresher' && m.parseLevel('mhitimu mpya') === 'fresher' && m.parseLevel('mwanafunzi') === 'student');
check('level unknown', m.parseLevel('banana') === null && m.parseLevel('') === null);

// --- export fidelity -------------------------------------------------------
// LibreOffice's DOCX filter ignores flexbox and welds columns together, so the
// item head must be real table markup. These guard the two ways that has
// silently broken before: the class-based sheet and the inline-styled payload
// used for Word.
const sampleSheet = m.cvToHTML(m.SAMPLE_CV);
const sampleDocx = m.cvThemedHTML(m.SAMPLE_CV, { color: '#E66239', fontStack: 'Calibri', size: '13px' }, 'graduate', { singleFont: true });
const themed = m.cvThemedHTML(m.SAMPLE_CV, { color: '#E66239', fontStack: "'Poppins',sans-serif", size: '13px' }, 'graduate');
const hasBalancedTags = (html) => !/"</.test(html)
  && (html.match(/<table/g) || []).length === (html.match(/<\/table>/g) || []).length
  && (html.match(/<td[\s>]/g) || []).length === (html.match(/<\/td>/g) || []).length;

check('export: item head is a table', /<table class="cv-item-head">/.test(sampleSheet));
check('export: dates live in their own cell', /<td class="cv-dates">/.test(sampleSheet));
check('export: inline payload has a real table', /<table style="[^"]*width:100%/.test(sampleDocx));
check('export: dates cell right-aligned inline', /<td style="[^"]*text-align:right[^"]*">\s*[\d]{4}/.test(sampleDocx));
check('export: inline tags well formed', hasBalancedTags(sampleDocx) && hasBalancedTags(themed));
check('export: no unclosed tag boundary', !/"<[^a-z/]/i.test(sampleDocx) && !/"<[^a-z/]/i.test(themed));
check('export: skills never welded', !/<\/span><span class="skill-chip"/.test(sampleSheet)
  && /<\/span> <span class="skill-chip">/.test(sampleSheet));
check('export: patch present and idempotent', m.withExportPatch('A').includes('.cv-item-head{display:table!important')
  && m.withExportPatch(m.withExportPatch('A')).split('display:table!important').length === 2);

const mapped = m.aiJsonToData({ summary: 'S', phone: '0765', education: [{ school: 'X' }], experience: [], skills: ['A'] });
check('ai map', mapped.personal.summary === 'S' && mapped.education[0].school === 'X');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

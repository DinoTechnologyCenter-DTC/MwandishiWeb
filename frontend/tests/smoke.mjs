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

const mapped = m.aiJsonToData({ summary: 'S', phone: '0765', education: [{ school: 'X' }], experience: [], skills: ['A'] });
check('ai map', mapped.personal.summary === 'S' && mapped.education[0].school === 'X');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

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
check('letter renders', m.letterToHTML(m.SAMPLE_LETTER).includes('Wako katika ujenzi wa Taifa'));
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

// ---- letter layout ----
const swLetter = m.buildLetter({ cvId: 'cv-crdb', cvName: 'Juma Mwansa', jobTitle: 'Bank Teller', company: 'CRDB Bank', manager: '', lang: 'SW' });
const enLetter = m.buildLetter({ cvId: 'cv-crdb', cvName: 'Juma Mwansa', jobTitle: 'Bank Teller', company: 'CRDB Bank', manager: '', lang: 'EN' });
const swHtml = m.plainLetterToHTML(swLetter, { sender: 'JUMA MWANSA', senderLines: ['Dar es Salaam'], contact: 'Mawasiliano: +255765123456' });
const enHtml = m.plainLetterToHTML(enLetter, { sender: 'JUMA MWANSA', senderLines: ['Dar es Salaam'] });
const cls = (h, c) => { const r = new RegExp(`class="[^"]*${c}[^"]*"`).exec(h); return r ? r[0] : ''; };
const senderBlock = /<div class="lt-block lt-right lt-sender">([\s\S]*?)<\/div><\/div>/.exec(swHtml)[1];
check('letter: sender block holds name, address and date',
  /JUMA MWANSA/.test(senderBlock) && /Dar es Salaam/.test(senderBlock)
  && senderBlock.includes(swLetter.split('\n')[0]));
check('letter: recipient left, salutation indented, subject centred',
  /lt-left lt-to/.test(swHtml) && /lt-salute/.test(swHtml) && /lt-subject/.test(swHtml)
  && /Meneja wa Ajira/.test(swHtml) && /CRDB Bank/.test(swHtml) && /Ndugu Meneja,/.test(swHtml)
  && /YAH: MAOMBI YA KAZI YA BANK TELLER/.test(swHtml));
check('letter: body justified, closing centred',
  /lt-para/.test(swHtml) && /lt-center lt-close/.test(swHtml)
  && /Wako mtiifu,/.test(swHtml) && /Viambatanisho: CV/.test(swHtml));
check('letter: contact line only when supplied', /Mawasiliano/.test(swHtml) && !/Mawasiliano/.test(enHtml));
check('letter: EN subject + closing detected',
  /RE: APPLICATION FOR THE POSITION OF BANK TELLER/.test(enHtml) && /Yours faithfully,/.test(enHtml));
check('letter: empty and unstructured text never throw',
  m.plainLetterToHTML('', {}) === '' && !!m.plainLetterToHTML('Just one loose sentence with no structure.', {}));
check('letter: stray text still renders', /loose sentence/.test(m.plainLetterToHTML('Just one loose sentence with no structure.', {})));

const tplLetter = m.letterToHTML(m.SAMPLE_LETTER);
check('letter: template preview uses formal layout',
  /lt-right lt-sender/.test(tplLetter) && /lt-left lt-to/.test(tplLetter) && /lt-subject/.test(tplLetter)
  && /lt-para/.test(tplLetter) && /lt-center lt-close/.test(tplLetter) && !/lt-date/.test(tplLetter));
check('letter: template body escaped', m.letterToHTML({ ...m.SAMPLE_LETTER, body: ['<script>x</script>'] }).includes('&lt;script&gt;'));

// ---- custom letter parts: parse / compose round-trip ----
const rtLetter = m.buildLetter({ cvName: 'Amina Juma', jobTitle: 'Teller', company: 'CRDB Bank', manager: '', lang: 'SW' });
const rtParsed = m.parseLetterParts(rtLetter);
check('parts: buildLetter output parses into every field',
  rtParsed.date.length > 0 && rtParsed.to.length === 3 && /Ndugu Meneja,/.test(rtParsed.salutation)
  && /YAH:/.test(rtParsed.subject) && rtParsed.paras.length === 2 && rtParsed.closing.length === 3);
check('parts: closing keeps the attachments line', /Viambatanisho: CV/.test(rtParsed.closing[2]));
check('parts: compose round-trips byte-identically',
  m.composeLetterParts(rtParsed) === rtLetter);
check('parts: editing one paragraph reaches the rendered sheet',
  /Namna moja/.test(m.plainLetterToHTML(
    m.composeLetterParts({ ...rtParsed, paras: ['Namna moja', 'Mbili'] }),
    { sender: 'AMINA JUMA' })));
check('parts: empty input yields empty parts, never throws',
  m.parseLetterParts('').paras.length === 0 && m.composeLetterParts(m.parseLetterParts('')) === '');
check('parts: text with no structure is kept as one paragraph',
  m.parseLetterParts('a loose line').paras[0] === 'a loose line');

// ---- AI response sanitising ----
const fenced = m.sanitizeLetter('```\nHere is your letter:\n\n' + rtLetter + '\n```');
check('sanitize: strips code fences and preamble, keeps the letter',
  /^\d{2}\/\d{2}\/\d{4}/.test(fenced) && /CRDB Bank/.test(fenced)
  && !/```|Here is your letter/.test(fenced));
check('sanitize: drops markdown emphasis but keeps the words',
  m.sanitizeLetter('**Ndugu Meneja,** *kwa utaratibu*') === 'Ndugu Meneja, kwa utaratibu');
check('sanitize: non-string and blank responses are safe',
  m.sanitizeLetter(null) === '' && m.sanitizeLetter(undefined) === '' && m.sanitizeLetter(42) === '');

// ---- AI aiPrompt2 contract ----
const aiPrompt2 = m.letterPrompt({
  name: 'Amina Juma', jobTitle: 'Teller', company: 'CRDB Bank',
  manager: 'Meneja wa Ajira', lang: 'SW', ad: ' teller customer service cash handling ',
  bg: 'Two years of counter experience.', kws: ['Teller', 'Cash'],
});
check('aiPrompt2: asks for the language that was selected',
  /Kiswahili/i.test(aiPrompt2) && /English/i.test(m.letterPrompt({ name: 'A B', jobTitle: 'T', company: 'C', manager: '', lang: 'EN', ad: '', bg: '', kws: [] })));
check('aiPrompt2: carries name, job, company and advert keywords',
  /Amina Juma/.test(aiPrompt2) && /Teller/.test(aiPrompt2) && /CRDB Bank/.test(aiPrompt2)
  && /Teller/.test(aiPrompt2) && /Cash/.test(aiPrompt2));
const enPrompt2 = m.letterPrompt({ name: 'A B', jobTitle: 'T', company: 'C', manager: '', lang: 'EN', ad: '', bg: '', kws: [] });
check('aiPrompt2: demands the plain-text shape the parser understands',
  /YAH:/.test(aiPrompt2) && /RE:/.test(enPrompt2) && /paragraph/i.test(aiPrompt2));
check('aiPrompt2: attachments line is written in the chosen language',
  /Viambatanisho: CV/.test(aiPrompt2) && !/Attachments: CV/.test(aiPrompt2)
  && /Attachments: CV/.test(enPrompt2) && !/Viambatanisho/.test(enPrompt2));

// ---- export css keeps the docx-matched spacing ----
const expCss2 = m.letterExportCSS();
check('css: recipient and closing lines carry the 26pt spacing',
  /\.lt-to > div, \.lt-close > div \{ line-height: 16pt; \}/.test(expCss2)
  && /margin-bottom: 10pt; \}/.test(expCss2));
check('css: sheet is A4 Times New Roman 12pt with 1in padding',
  /@page \{ size: A4/.test(expCss2) && /Times New Roman/.test(expCss2)
  && /font-size: 12pt/.test(expCss2) && /padding: 1in/.test(expCss2));

// ---- no-CV / typed-name path ----
check('buildLetter: works without any CV, name supplied by hand',
  /Mimi, Amina Juma/.test(m.buildLetter({ cvName: 'Amina Juma', jobTitle: 'Auditor', company: 'NSSF', manager: '', lang: 'SW' }))
  && /NSSF/.test(m.buildLetter({ cvName: 'Amina Juma', jobTitle: 'Auditor', company: 'NSSF', manager: '', lang: 'SW' })));
check('buildLetter: an empty CV name does not produce a broken letter',
  !/Mimi, ,|,,/.test(m.buildLetter({ cvName: '', jobTitle: 'Auditor', company: 'NSSF', manager: '', lang: 'SW' })));


// ---- template reproduces the reference address blocks ----
const sampleHtml = m.letterToHTML(m.SAMPLE_LETTER);
const block = (c) => (new RegExp(`<div class="lt-block [^"]*${c}">([\\s\\S]*?)</div></div>`).exec(sampleHtml) || [0, ''])[1];
const senderTxt = block('lt-sender').replace(/<\/?div>/g, '|');
const toTxt = block('lt-to').replace(/<\/?div>/g, '|');
check('template: sender block carries name, every address line and the date',
  /DATIVA LUCAS/.test(senderTxt) && /S\.L\.P 15101/.test(senderTxt)
  && /TEMEKE/.test(senderTxt) && /DAR ES SALAAM/.test(senderTxt) && /28\/09\/2026/.test(senderTxt));
check('template: date is the last line of the sender block',
  senderTxt.trim().split('|').filter(Boolean).pop().trim() === '28/09/2026');
check('template: recipient block carries department, company, PO box and city',
  /HUMAN RESOURCE/.test(toTxt) && /MOFAT COMPANY LIMITED,/.test(toTxt)
  && /S\.L\.P 19875,/.test(toTxt) && /DAR ES SALAAM\./.test(toTxt));
check('template: sender block is 5 lines and recipient 4, as in the reference',
  senderTxt.split('|').filter(Boolean).length === 5 && toTxt.split('|').filter(Boolean).length === 4);
check('template: letterToHTML renders date when given one',
  m.letterToHTML({ sender: 'A B', senderLines: ['X'], date: '01/02/2026', recipient: 'C', address: 'D' })
    .includes('01/02/2026'));
const noDateSender = /lt-right lt-sender">([\s\S]*?)<\/div><\/div>/.exec(
  m.letterToHTML({ sender: 'A B', senderLines: [], recipient: 'C', address: 'D' }))[1];
check('template: omitting the date leaves no blank sender line',
  (noDateSender.match(/<div>/g) || []).length === 1 && !/<div><\/div>/.test(noDateSender));

// ---- generator can build a four-line recipient block ----
const fourLine = m.plainLetterToHTML(m.composeLetterParts({
  date: '28/09/2026',
  to: ['HUMAN RESOURCE', 'MOFAT COMPANY LIMITED,', 'S.L.P 19875,', 'DAR ES SALAAM.'],
  salutation: 'NDG,',
  subject: 'YAH: MAOMBI YA NAFASI YA KAZI YA PASSENGER SERVICE OFFICER',
  paras: ['Kinhusu kazi ya Passenger Service Officer.'],
  closing: ['Wako katika ujenzi wa Taifa', 'D.Lucas', 'Dativa Lucas.', 'Mawasiliano: +255 616 196 332'],
}), { sender: 'DATIVA LUCAS', senderLines: ['S.L.P 15101', 'TEMEKE', 'DAR ES SALAAM'] });
const toLines = block.length && (fourLine.match(/lt-left lt-to">([\s\S]*?)<\/div><\/div>/) || [0, ''])[1].match(/<div>/g) || [];
check('generator: four recipient lines survive parse/compose/render', toLines.length === 4);
check('generator: full address block renders sender lines and contact',
  /S\.L\.P 15101/.test(fourLine) && /TEMEKE/.test(fourLine) && /S\.L\.P 19875,/.test(fourLine)
  && /Mawasiliano: \+255 616 196 332/.test(fourLine));


console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

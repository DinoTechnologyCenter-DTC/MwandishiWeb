import LegalDoc from '../components/LegalDoc.jsx';

// [heading, paragraph, bulletList[]] — content strings live in i18n.js.
const SECTIONS = [
  ['tm.s1h', 'tm.s1p', null],
  ['tm.s2h', 'tm.s2p', null],
  ['tm.s3h', 'tm.s3p', ['tm.s3l1', 'tm.s3l2', 'tm.s3l3']],
  ['tm.s4h', 'tm.s4p', null],
  ['tm.s5h', 'tm.s5p', null],
  ['tm.s6h', 'tm.s6p', null],
  ['tm.s11h', 'tm.s11p', null],
  ['tm.s7h', 'tm.s7p', null],
  ['tm.s8h', 'tm.s8p', null],
  ['tm.s9h', 'tm.s9p', null],
  ['tm.s10h', 'tm.s10p', null],
];

export default function Terms() {
  return (
    <LegalDoc
      titleKey="tm.t"
      subKey="tm.sub"
      introKey="tm.intro"
      sections={SECTIONS}
      contactKey="tm.contact"
    />
  );
}

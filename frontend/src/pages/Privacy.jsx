import LegalDoc from '../components/LegalDoc.jsx';

// [heading, paragraph, bulletList[]] — content strings live in i18n.js.
const SECTIONS = [
  ['pv.s1h', 'pv.s1p', ['pv.s1l1', 'pv.s1l2', 'pv.s1l3']],
  ['pv.s2h', 'pv.s2p', ['pv.s2l1', 'pv.s2l2', 'pv.s2l3', 'pv.s2l4']],
  ['pv.s3h', 'pv.s3p', null],
  ['pv.s4h', 'pv.s4p', null],
  ['pv.s5h', 'pv.s5p', null],
  ['pv.s6h', 'pv.s6p', null],
  ['pv.s7h', 'pv.s7p', ['pv.s7l1', 'pv.s7l2', 'pv.s7l3']],
  ['pv.s8h', 'pv.s8p', null],
  ['pv.s9h', 'pv.s9p', null],
  ['pv.s10h', 'pv.s10p', null],
];

export default function Privacy() {
  return (
    <LegalDoc
      titleKey="pv.t"
      subKey="pv.sub"
      introKey="pv.intro"
      sections={SECTIONS}
      contactKey="pv.contact"
    />
  );
}

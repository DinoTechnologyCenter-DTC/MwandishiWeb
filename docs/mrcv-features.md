# Mwandishi — Product Features Spec

> Goal: Beat existing free CV generators (SimpleCV, EasyFreeResume, FreeCVGenerator, NestCV, EngineCV, Reactive Resume, FlowCV, Canva) — not with more templates, but with intelligence + workflow.

## 1. Competitive Landscape (Sept 2026)

| Competitor | Strength | Weakness / Gap for Mwandishi to exploit |
|---|---|---|
| SimpleCV.io | 100% free, private (localStorage), ATS-friendly | Static filler, no AI, no JD matching, no versions |
| EasyFreeResume | No signup, instant PDF | No ATS score, no import, ad-driven, no cover letter |
| FreeCVGenerator.com | 6 country templates, mobile | No AI rewrite, no analytics, no tracking |
| NestCV | 20+ templates, ATS checker | Checker is shallow keyword count, no tailoring |
| EngineCV.app | Local-first, multi-format export | Dev-tool UX, no JD workflow, no sharing |
| Reactive Resume | Open-source, free forever | Self-host complexity, no AI, no career OS |
| FlowCV | Generous free tier | US-centric, no localization, limited AI |
| Canva | Beautiful design | Not ATS-safe, heavy graphics fail parsers |

**Core insight:** All are `Form -> Template -> PDF`. None own the `Job -> Tailored CV -> Application -> Interview` loop.

---

## 2. Mwandishi Differentiators (How We Win)

### D1. JD-to-CV Tailor (Killer Feature)
- Paste job title + description / URL / PDF.
- Auto-score match % (skills, keywords, experience).
- Auto-rewrite bullets in STAR + metrics format.
- Suggest missing keywords to add (without lying).
- One-click `Tailor copy` — never overwrites master CV.

### D2. Real ATS Engine + Dual Export Mode
- True parser preview: show what Workday / Greenhouse / Lever sees.
- ATS score breakdown: parse rate, sections found, date format, skills coverage, action verbs, filler words.
- Dual export:
  - `ATS-Clean`: single-column, standard fonts, parseable headings.
  - `Human-Design`: visual for email / hand-in / portfolio.
- Pre-flight checks: no tables in ATS mode, no photo for US/UK, no graphics-as-text.

### D3. Career OS (Not Just Generator)
- Master CV + unlimited versions per application (`CV-Stripe-Backend-v3`).
- Version history + diff view + restore.
- Auto cover letter from CV + JD (same tone, editable).
- Application tracker: applied / screening / interview / offer.
- Shareable live link `mrcv.link/you` with view analytics (opens, time, location).
- Interview prep: likely questions generated from CV + JD.

### D4. 1-Click Import / Smart Editor
- Import from: LinkedIn export, old PDF/DOCX, plain text paste.
- AI section parser: auto-split Experience / Education / Skills even from messy input.
- Live WYSIWYG preview, drag-reorder sections.
- Bullet enhancer: `did X` -> `Improved X by Y% via Z`.
- Skill normalizer: `reactjs, React.js` -> `React`.
- Empty-state helpers + examples per role.

### D5. Privacy-First + Local-First
- Default local storage (like SimpleCV/EngineCV) — works offline.
- No account needed to build + export.
- Optional cloud sync with E2E encryption.
- Explicit: never sell data, one-click wipe, JSON backup/restore.
- GDPR-compliant, cookie-minimal.

### D6. Niche Localization (TZ-first)
- Country packs: TZ Govt/NGO, Bank/Telecom, Graduate/No-experience, EU Europass, US/UK for diaspora.
- TZ conventions: referees section (2-3 with phone), photo optional toggle, NIDA-safe (never ask for NIDA number), date format DD/MM/YYYY, phone +255.
- Language support: EN + SW for UI and CV content, including Swahili CVs and barua ya maombi.
- Payments: M-Pesa, Tigo Pesa, Airtel Money with TZS pricing, pay-per-download (500-2000 TZS), no card required.
- WhatsApp / Mobile-first builder + Share-to-PDF + public link `mrcv.link/you`.
- Low-bandwidth mode (<200KB page, works on 3G, PWA offline).

---

## 3. Full Feature List

### 3.1 Core Builder
- [ ] No-signup editor (name + content only to start)
- [ ] 12+ ATS-safe templates (single + two-column)
- [ ] Custom sections (Projects, Certifications, Languages, Volunteering, References)
- [ ] Reorder / hide / rename sections
- [ ] Theme controls: font, size, spacing, color, margins
- [ ] Live preview (desktop + mobile)
- [ ] Autosave locally + manual save points
- [ ] Spellcheck + grammar hints
- [ ] Character / page-length coach (1-page vs 2-page rule)

### 3.2 AI Engine
- [ ] Bullet rewrite (STAR, metrics, action verbs)
- [ ] Professional summary generator from experience
- [ ] Skill gap analysis vs JD
- [ ] Tone control: concise / confident / junior-friendly
- [ ] No-hallucination guard: AI never invents employers/dates
- [ ] Cover letter generator
- [ ] LinkedIn About section exporter

### 3.3 ATS & Quality
- [ ] Match score 0-100 vs JD
- [ ] Missing keywords list
- [ ] Parser simulation view
- [ ] Checks: contact info, dates, reverse-chronology, duplicates, filler words, verb strength
- [ ] Export validation: fonts embedded, selectable text, correct heading order

### 3.4 Import / Export / Share
- [ ] Export: PDF (print-perfect), DOCX (editable), TXT (ATS paste), JSON (backup)
- [ ] Import: PDF, DOCX, LinkedIn CSV, JSON
- [ ] Public live link with password / expiry option
- [ ] QR code to live CV for print
- [ ] WhatsApp / Email / Direct download share
- [ ] PNG snapshot for portfolio

### 3.5 Workflow / Tracker
- [ ] Dashboard: Master CV + tailored copies
- [ ] Per-job notes + status pipeline
- [ ] Reminders: follow-up after 7 days
- [ ] Analytics: views per link
- [ ] Duplicate for new job in 1-click

### 3.6 Accounts & Platform
- [ ] Anonymous start, optional email to sync
- [ ] OAuth: Google / LinkedIn
- [ ] Cloud sync (encrypted) + multi-device
- [ ] PWA installable, offline-capable
- [ ] Dark / light editor UI
- [ ] i18n UI strings

### 3.7 Admin / Growth (Internal)
- [ ] Template usage stats (privacy-preserving)
- [ ] SEO landing per role/country: `/cv-examples/nurse-kenya`
- [ ] Referral: `mrcv.link` footer opt-in
- [ ] Feedback widget per export

---

## 4. MVP vs V1 vs V2 — TZ Priority

**MVP P0 (Launch) — Must-have 1-9:**
1. Guided builder (personal, education, experience, skills, projects, referees) + live preview
2. 4-6 ATS-clean TZ templates (Govt/NGO, Bank/Telecom, Graduate, General)
3. Free PDF, no watermark, phone-tested download
4. Mobile-first PWA, low-data, autosave locally
5. Accounts with saved CVs (phone + Google login)
6. Swahili + English UI and CV content + barua ya maombi
7. Transparent pricing upfront + mobile-money (M-Pesa/Tigo/Airtel, TZS)
8. Cover / application letter generator in same flow
9. WhatsApp share + public link

**V1 P1 (Edge, right after launch) — 10-13:**
- AI bullet writer (rough Swahili/English -> professional bullets, STAR)
- AI professional summary generator
- JD paste -> tailoring suggestions + ATS/keyword score in plain language
- Multiple CV versions per job

**V2 Growth — 14-21 (deferred until traction):**
- Institution/bulk accounts + admin dashboard for colleges
- Referral codes for ambassadors
- LinkedIn / old-CV import parse
- Local job links, interview prep Q&A
- Analytics: downloads, template popularity, conversion

> Rule: launch P0, get real users, then ship P1 10-12. Never paywall the download after 20 min of building.

**Global backlog (if expanding beyond TZ):**
- Full JD tailor + bullet AI rewrite with tone control
- Dual ATS/Human export
- Version history + diff
- Live link analytics, tracker, interview coach, API

---

## 5. Non-Functional Requirements
- Free core forever: builder + usable free PDF, no watermark on free tier, show free vs paid before building starts.
- Perf mobile-first: TTI < 2s on 3G, editor keystroke < 50ms, PDF gen < 5s on low-end Android.
- Privacy: local-first autosave, no tracking of CV content, one-click delete, JSON backup/restore.
- Payments: mobile-money first (M-Pesa/Tigo Pesa/Airtel Money), TZS pricing, pay-per-download, receipts via SMS.
- i18n: full SW + EN strings, including ATS checks in plain language.
- Accessibility: WCAG AA, keyboard navigable, printable contrast.
- Monetization (without bait-and-switch): Pro = AI credits bulk, custom domain, analytics+, remove `Made with Mwandishi` badge — never lock basic download after build.

## 6. Success Metrics
- Export success rate > 98%
- ATS parse rate > 95% in clean mode
- JD tailor usage > 40% of active users
- Return rate (2nd version within 7d) > 35%
- NPS > 50

---
*Source: gap analysis vs SimpleCV, EasyFreeResume, FreeCVGenerator, NestCV, EngineCV, Reactive Resume, FlowCV, Canva — Sept 2026.*

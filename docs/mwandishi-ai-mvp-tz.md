# Mwandishi AI MVP Scope — Tanzania First

> Companion to `mrcv-features.md`. This is the build order. If it is not in P0, do not build it for launch.

## P0 — Launch (crucial, build now)

### 1. Guided CV builder
- Steps: personal info, education, experience, skills, projects, referees.
- Live preview on phone + desktop.
- Referees required (2-3: name, title, phone) — TZ expectation.
- Save/resume, field validation for +255 phones, DD/MM/YYYY dates.
- Acceptance: complete CV in <10 min on low-end Android.

### 2. TZ templates (4-6 only)
- Graduate/No-experience, Govt/NGO, Bank/Telecom, General + Barua ya maombi layout.
- ATS-clean: single column, selectable text, standard headings.
- Acceptance: 95%+ parse rate, prints clean on A4.

### 3. Free PDF download
- No watermark on free tier, fast, mobile-tested.
- DOCX + TXT add if cheap; JSON backup mandatory.
- Acceptance: <5s PDF on 3G, opens in WhatsApp/PDF viewer.

### 4. Mobile-first PWA, low-data
- <200KB first load, offline draft, installable.
- Autosave locally, works on Chrome Android.
- Acceptance: usable on 3G, no data-loss on refresh.

### 5. Accounts with saved CVs
- Phone + Google login, dashboard to edit/re-download.
- Acceptance: return user edits in <3 clicks.

### 6. Swahili + English
- Full UI strings SW/EN, CV content in either language.
- ATS feedback in plain language, both languages.
- Acceptance: toggle switches entire builder + sample content.

### 7. Transparent pricing + mobile money
- Show free vs paid BEFORE building. No bait-and-switch.
- M-Pesa, Tigo Pesa, Airtel Money, TZS, pay-per-download 500-2000 TZS.
- SMS receipt, pay only for premium template/AI pack, never for basic PDF.
- Acceptance: test payment end-to-end on each network.

### 8. Cover / application letter generator
- Uses same CV data, SW/EN templates, editable, PDF export.
- Acceptance: letter + CV share as one pack.

### 9. WhatsApp share + public link
- `wa.me` share with PDF, `mrcv.link/you` public view with expiry.
- Acceptance: share from phone in 2 taps.

## P1 — Edge (ship right after P0 traction)

10. **AI bullet writer:** rough input -> STAR bullets with metrics. E.g. `nilifanya maintenance ya computer` -> professional entry. No hallucination of employers/dates.
11. **AI summary generator:** 2-3 lines from experience, junior-friendly tone.
12. **JD tailoring:** paste job ad -> match %, missing keywords, suggested edits. Tailored copy, master untouched.
13. **Multiple versions:** e.g. Banking vs IT, duplicate in 1-click.

## P2 — Growth (deferred)

14. Institution/bulk accounts: college pays once, admin dashboard, codes for graduates.
15. Referral/ambassador codes + discounts.
16. Import from LinkedIn / old PDF/DOCX parse.
17. Local job links, interview prep Q&A.
18. Analytics: downloads, popular templates, pay conversion.

## What NOT to build for MVP
- 30 templates, dark editor themes, custom domains, API, interview coach, job board, complex analytics.
- Card-only payments, subscriptions only, watermarked free PDF.

## Build order
1. 1+2+4 (builder + templates + PWA shell)
2. 3+5 (PDF + accounts)
3. 6+8 (i18n + letter)
4. 7+9 (payments + share)
5. P1: 10 -> 11 -> 12 -> 13

## Launch checklist
- [ ] 10-min phone build test passed
- [ ] Free PDF clean, no watermark
- [ ] M-Pesa/Tigo/Airtel sandbox + live test
- [ ] SW/EN toggle full coverage
- [ ] Pricing page visible pre-build
- [ ] WhatsApp share tested on Android

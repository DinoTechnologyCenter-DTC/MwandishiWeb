# Future: inline auto-detect while typing (per-section content prediction)

Status: proposed · Owner: Mwandishi team · Updated: 9 October 2026

## The idea in one line

As the user types in the Builder, each section quietly predicts what kind
of content is being entered — Education, Skills, and later the rest — and
shows a one-line inline verdict under the field, the way GitHub checks a
repository name on `repositories/new` (spinner → ✓ available / ✗ taken,
without ever blocking typing).

## Why it fits Mwandishi

- Most users have never written a CV. They mistype qualifications, put
  job duties in Skills, or enter impossible date ranges — then blame the
  exported file.
- The app already normalises on blur (`normalizeTZPhone` on `#f-phone`)
  and hints under fields (`bld.phoneHint`). Auto-detect is that pattern
  grown up: validate + suggest, per section, as you type.
- It must stay **local-first**: the privacy policy promises the manual
  builder sends nothing anywhere. All detection runs on-device
  (regex + small dictionaries). AI assist is allowed only where the user
  already opted into AI features.

## UX contract (GitHub rules)

1. A `.form-text` line under each watched field, three states only:
   - **quiet ok** (green ✓, e.g. "Looks like a degree entry") — reassures,
     never shouts.
   - **suggestion** with a one-tap Apply button (e.g. "Did you mean
     *MS Office*? [Apply]").
   - **warning** (amber, e.g. "End year is before start year") — never red,
     never blocks saving or exporting.
2. Debounced per field (~300ms after the last keystroke). No spinners for
   local rules; a spinner only if an AI assist call is in flight.
3. Works in EN and SW (every hint string gets both locales, like all `t()`).
4. Never sends keystrokes to any server for detection purposes.

## Start with: Education + Skills

### Education rows (`setRow('education', i, …)`)

Watched inputs: `school`, `qualification`, `start`, `end`.

| Signal | Rule (local) | Hint example |
|---|---|---|
| Level from qualification | keywords: BSc/BA/MSc/PhD/Bachelor/Master → degree; Diploma/Certificate → diploma; ACSEE/CSEE/Division → secondary; Cheti → certificate | "Looks like a *degree* entry" |
| School type from name | University/College/Institute/Chuo → tertiary; Secondary/High School/Sekondari → secondary; Primary/Msingi → primary | silent ok, or mismatch warning |
| Level × school mismatch | qualification says degree but school says Secondary (or reverse) | "Check this: a degree with a secondary school?" |
| Dates | parse YYYY or Mon YYYY; end < start → warn; year > current → warn; "present"/"ongoing" in *education* end → suggest an end year or "expected" | "End year is before start year" |
| Normalise offer | "2020-2023", "2020/23", "20-23" → one-tap "Use 2020 – 2023" | Apply button fills both boxes |

### Skills box (`setPath('skills', …)`)

The box already accepts newline- or comma-separated entries (chips split
on `/[\n,]+/`). Detect on top of that split:

| Signal | Rule (local) | Hint example |
|---|---|---|
| Canonical spelling | dictionary EN/SW: "ms off/excell" → *MS Office / Excel*; "kisw" → *Kiswahili*; common TZ skills list (~60 entries to start) | "Did you mean *MS Office*? [Apply]" |
| Duplicates | case/whitespace-insensitive match across chips ("MS Office" + "ms office") | "MS Office appears twice" |
| Misplaced content | entry looks like experience, not a skill: contains "worked at", a year range, "responsible for", is a full sentence > 8 words | "This reads like experience — move it there? [Move]" |
| Count guidance | < 3 chips → "add a few more"; > 12 → "recruiters scan ~8; keep the strongest" (quiet, ATS-flavoured) | subtle only |
| Mixed separators | commas and newlines mixed is fine (supported), so no warning — just chip-preview parity with export | — |

### Later sections (same mechanism, not this round)

Experience (achievement bullets starting with weak verbs → stronger verb
suggestions; date overlaps between jobs), Referees (phone normalisation
already exists — extend to missing title), Summary (length + keyword mirror
of target job), Photo (face Beblur/brightness hint — local canvas only).

## Where it hooks in (no refactor needed)

- New module `frontend/src/lib/detect.js`: pure functions,
  `detectEducation({school, qualification, start, end})`,
  `detectSkills(text)`, each returning
  `{ kind: 'ok'|'suggest'|'warn', key, apply? }` with i18n keys, not strings.
- `Builder.jsx`: call from the existing `setPath`/`setRow` handlers (same
  place `normalizeTZPhone` runs today), store per-field hint in local state,
  render under the input like `bld.phoneHint`.
- Dictionaries live in `detect.js` (EN + SW lists); AI assist, if ever,
  reuses the existing `draftViaBackend` opt-in path — never silent.

## Acceptance criteria

- [ ] Typing "UDSM / BSc CS / 2020 / 2023" shows a quiet degree ok; swapping
      the school to a secondary school raises the mismatch warning.
- [ ] Typing "ms off" offers *MS Office* with Apply; applying replaces text.
- [ ] End-before-start dates warn without blocking save or export.
- [ ] No network request is fired by typing (verify in devtools).
- [ ] All hint strings exist in EN and SW (`npm test` key-parity stays green).
- [ ] Works with keyboard only; hint line has `role="status"`.

## Backlog (other future features, rough priority)

1. Cover-letter WhatsApp **file** share (text-only today; same
   `shareCVWhatsApp` pattern, letter DOCX renderer exists).
2. Server-side auth → Users admin tab + cross-device sync (auth is
   local-only today, so no user list can exist yet).
3. OCR advert reading (photos are session-only and AI can't read them yet —
   paste-text is the current workaround).
4. PWA install + true offline (export already degrades; make the shell work
   fully offline).
5. Per-route social preview metadata (scrapers don't run JS; needs prerender).
6. Inbox triage (acknowledge/delete feedback; currently append-only JSONL).
7. Usage insight without tracking (aggregate the star distribution already
   collected — no analytics SDK, ever).

# Mwandishi AI poster — how to run and customise

Clean, minimal A4 posters for Mwandishi AI, in **English** and **Kiswahili**.

```
posters/
├── poster.html            the design + the live editor (open this in a browser)
├── poster.config.json     your saved settings (optional; auto-detected)
├── render.py              turns poster.html into PDF + PNG
├── assets/
│   └── logo-leaf.png       Mwandishi AI leaf mark (green #008000)
├── screenshoots/           product screenshots used in the poster
├── docs/
│   └── README.md          this file
└── out/                   generated files land here
```

---

## 1. Generate the posters

From the repo root (`MrCVWeb`):

```bash
./backend/.venv/bin/python posters/render.py
```

That renders both languages and writes:

| File | Size | Use |
|---|---|---|
| `out/mwandishi-poster-en.pdf` | A4, 1 page, vector | **give this to the print shop** |
| `out/mwandishi-poster-en.png` | 2480 × 3508 px | WhatsApp / social / print shop that wants images |
| `out/mwandishi-poster-sw.pdf` | A4, 1 page, vector | |
| `out/mwandishi-poster-sw.png` | 2480 × 3508 px | |

### Options

```bash
# one language only
./backend/.venv/bin/python posters/render.py --lang sw

# use a specific settings file
./backend/.venv/bin/python posters/render.py --config my.settings.json

# refresh poster.config.json from the defaults inside poster.html
./backend/.venv/bin/python posters/render.py --dump-config

# skip the PNG while you are still fiddling (faster, PDF only)
./backend/.venv/bin/python posters/render.py --open
```

### Requirements

Already present on this machine — nothing to install:

* **Chrome/Chromium** at `/usr/bin/google-chrome` (override with `CHROME_PATH=...`)
* **Python + Playwright**, taken from the backend virtualenv
  (`backend/.venv`). Use that interpreter, as shown — a bare `python3` will
  not have Playwright installed.
* **Poppins** fonts, read from `/home/mrdino/.fonts/`. Because the HTML points
  `font-face` at those local files, rendering works with no internet.

---

## 2. Change the colours, fonts or text

### Option A — edit in the browser (easiest)

Open the template directly:

```bash
xdg-open posters/poster.html          # or: google-chrome posters/poster.html
```

A dark **Edit poster** panel slides in from the right. Use **Done** in its header
to close it again, and the *Edit poster* button to bring it back. It changes the
page instantly, and you get:

* **Colours** — background, headline ink, accent, footer text, feature text, hairline
* **Headline type** — size, weight (Regular / SemiBold / Bold), line height, letter spacing, letter case
* **Feature list type** — size, line height, gap between items
* **Footer strip type** — size, letter spacing
* **Brand lockup** — show/hide the wordmark beside the leaf, plus its size,
  weight, letter spacing, letter case and the gap after the logo. **Fill** switches
  between a gradient and solid ink, with editable *from* / *to* colours and angle
* **Layout** — side margin, top margin, logo width, rule width, bottom bar, plus
  the product screenshot: show/hide, file path, gap above, corner radius, border
* **Text** — headline line 1, brand line, logo wordmark, feature bullets (one per line), footer strip
* **+ Add text line** — appends a new bullet instantly

### Product screenshot

`layout.shotFile` points at any image; it is scaled to the poster's content width
and keeps its own aspect ratio, so it is never stretched or cropped. Rounded
corners, a hairline border and a soft shadow are applied. Clearing the field
(or setting `shotShow: 0`) removes it, so swapping in a new capture — or designing
the poster without one — is a one-line config change.

Then:

* **Download config** → saves `poster.config.json`
* **Copy JSON** → same thing to the clipboard
* **Import…** → load a previously saved config
* **Reset** → back to the shipped defaults

Edits also autosave to that browser only, so you can close the tab and come back.

> When you are done, put the downloaded file at
> **`posters/poster.config.json`** and `render.py` will pick it up
> automatically on the next run. That's the hand-off between the two files.

### Option B — edit the JSON

`poster.config.json` is plain JSON. Every value is optional; anything you leave
out falls back to the default.

```jsonc
{
  "colors": { "accent": "#008000", "bg": "#FFFFFF", "ink": "#302C4D" },
  "type":   { "h1Size": 84, "h1Weight": 700, "h1Line": 1.12 },
  "layout": { "padX": 104, "logoW": 214, "barH": 12 },
  "text": {
    "en": {
      "l1": "Write anything with",
      "brand": "Mwandishi AI",
      "feats": ["Your CV and cover letter, written together"],
      "strip": "CV • Cover letter • PDF • DOCX • EN / SW"
    },
    "sw": { "...": "..." }
  }
}
```

Then just re-run `render.py`.

### Brand green ramp

`#008000` is the brand colour. These are its derivatives — use them rather than
inventing new greens, so the site and the posters stay recognisably the same
brand. Contrast is against white.

| Token | Hex | Typical use |
|---|---|---|
| `brand-050` | `#F4FBF4` | faint fills |
| `brand-100` | `#E8F8E8` | hover fills, chips |
| `brand-200` | `#CEF3CE` | borders on tinted bg |
| `brand-300` | `#AAEEAA` | decorative highlight |
| `brand-400` | `#53EA53` | gradient start (light) |
| `brand-500` | `#0BCB0B` | mid-tone |
| **`brand`** | **`#008000`** | **base — buttons, rules, bar** |
| `brand-600` | `#006600` | hover / pressed |
| `brand-700` | `#004C00` | gradient end |
| `brand-800` | `#003800` | deep gradient |
| `brand-900` | `#002900` | deepest gradient stop |

Two gradient pairings are already proven on the landing page:

```
linear-gradient(135deg, #008000, #004C00)   /* brand -> brand-700 */
linear-gradient(135deg, #006600, #002900)   /* brand-600 -> brand-900 */
```

### Option C — URL overrides (preview only)

Preview a variant in the browser without saving anything:

```
posters/poster.html?lang=en&accent=%23244655&bg=%23F4F1EC
```

Supported keys: `accent`, `bg`, `ink`, `muted`, `body`, `rule`, `lang`.

Note this only changes what you **see in the browser** — `render.py` does not
read URL parameters. To produce an actual PDF/PNG with those colours, put them in
`poster.config.json` (Option B) or change them in the editor and download the
config (Option A).

---

## 3. Page parameters

| Parameter | Effect |
|---|---|
| `?editor=1` | show the editor panel |
| `?clean=1` | strip the grey backdrop and drop shadow (what `render.py` uses) |
| `?lang=en` / `?lang=sw` | pick the language |
| `?accent=%23008000` | override any colour for one render |

---

## 4. How the two files connect

```
poster.html  ── DEFAULTS object + editor ──writes──▶  poster.config.json
     ▲                                                    │
     └────────── render.py reads it, injects it ──────────┘
                        │
                        ▼
                 out/*.pdf  out/*.png
```

* `poster.html` is the single source of truth for the design. `render.py`
  **never** duplicates those values — `--dump-config` reads them straight out of
  the loaded page, so the JSON cannot drift from the HTML.
* `render.py` injects the config as `window.__POSTER_CONFIG` *before* the page's
  scripts run, which also sets an internal `locked` flag so the browser's
  autosave can't overwrite what the script asked for.
* If `poster.config.json` is missing, `render.py` uses the built-in defaults and
  says so in its output.

---

## 5. Output geometry

The template is **1240 × 1754 px**, which is A4 at 150 DPI.

| Output | How | Result |
|---|---|---|
| PNG | `deviceScaleFactor: 2` | 2480 × 3508 px = A4 @ 300 DPI |
| PDF | `scale: 0.64` | exactly 210 × 297 mm |

Both are verified after every render. The PDF keeps live, selectable text — the
print shop gets clean vector type, not a screenshot.

---

## 6. The checks `render.py` runs on every render

It is not just a screenshot tool. After each language it verifies and prints:

* poster box is exactly 1240 × 1754 and nothing scrolls
* **no text ink escapes the poster box** — measured from real glyph rects, so
  clipped descenders are caught
* the logo actually decoded (`naturalWidth > 0`), not a broken image
* the fonts reported by the CSS font API are `loaded`, not falling back
* the background is white and the box-shadow is off (screen-only styling that
  would otherwise print)
* the exact headline, every feature line, and the footer strip
* the ink bounding box, so you can see the margins

If anything is clipped it prints `CLIPPED:` and **exits non-zero**, so a broken
poster can't pass unnoticed in a script.

### Why `autoFitHeadline()` exists

Poppins' em box is about 1.393em tall, so a tight `line-height` (1.12 here) makes
glyph ink sit outside its own line box. `poster.html` measures the real ink and
pads the headline by exactly the overflow. That keeps the tight, poster-like
leading **and** guarantees nothing is clipped — at any font size, weight or
language you set through the editor.

---

## 7. Notes before printing

* **Colour.** `#008000` is the brand green (CSS `green`). On white it measures
  **5.14:1**, so it is safe for text as well as fills. Printers convert to CMYK
  and pure greens shift noticeably — ask the shop for a proof before a large
  run, and consider a CMYK conversion.
* **No URL or QR code** is on the poster by design, so there is no built-in way
  for a reader to open the site. Add one in the footer strip if you want it.
* **Bleed.** The layout is built with margins (default 104 px ≈ 17.6 mm) and the
  orange bar bleeds off the bottom edge. If the shop asks for a full-bleed
  poster, raise `padTop`/`padX` a little or ask them to scale to fit.
* The tagline *"Write anything with Mwandishi AI"* is broad for a CV/cover-letter
  tool. It's your call, but worth a second look before a large print run.

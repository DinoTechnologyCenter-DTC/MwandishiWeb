#!/usr/bin/env python3
"""Render the Mwandishi AI A4 posters to print-ready PDF + 300 DPI PNG.

This is the counterpart to poster.html: the HTML holds every design value in a
single DEFAULTS object plus an optional editor panel, and this script drives
Chrome to turn that page into files.

Config flow
-----------
  posters/poster.html          defaults + "editor=1" live editor
  posters/poster.config.json   optional overrides, used automatically if present
  posters/out/*.pdf|.png       the output

Usage
-----
  backend/.venv/bin/python posters/render.py                 # both languages
  backend/.venv/bin/python posters/render.py --lang en       # one language
  backend/.venv/bin/python posters/render.py --config x.json # specific config
  backend/.venv/bin/python posters/render.py --dump-config   # write defaults
  backend/.venv/bin/python posters/render.py --open          # config -> PNG only

Geometry: the template is 1240x1754 px, which is A4 at 150 DPI.
  - PNG: deviceScaleFactor 2  -> 2480x3508 px  (A4 @ 300 DPI)
  - PDF: scale 0.64            -> exactly 210 x 297 mm
"""
import argparse
import asyncio
import json
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
HTML = HERE / "poster.html"
OUT = HERE / "out"
CONFIG = HERE / "poster.config.json"
CHROME_PATH = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")

WIDTH_PX, HEIGHT_PX = 1240, 1754
SCALE = 0.64  # 1240px @96dpi = 12.9167in; * 0.64 = 8.2667in = 209.97mm

PROBE = """() => {
    const p = document.getElementById('poster');
    const box = p.getBoundingClientRect();
    const bar = p.querySelector('.bar');
    const barH = bar ? bar.getBoundingClientRect().height : 0;

    // The only boundary that can actually clip is the poster's own box
    // (overflow:hidden). A tight line-height makes a child's ink exceed the
    // CHILD's box while still sitting inside the parent's padding, so checking
    // each element against itself produces false positives. Measure the real
    // text ink and test it against the poster instead.
    const limitBottom = box.bottom - barH;
    const clipped = [];
    const seen = [];
    const walkAll = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walkAll.nextNode())) {
        if (!n.textContent.trim()) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        const b = r.getBoundingClientRect();
        if (!b.width && !b.height) continue;
        const over = {
            left:   +(box.left - b.left).toFixed(1),
            right:  +(b.right - box.right).toFixed(1),
            top:    +(box.top - b.top).toFixed(1),
            bottom: +(b.bottom - limitBottom).toFixed(1),
        };
        const worst = Math.max(over.left, over.right, over.top, over.bottom);
        if (worst > 1) {
            clipped.push({txt: n.textContent.trim().slice(0, 28), ...over});
        }
        seen.push({l: b.left, r: b.right, t: b.top, b: b.bottom});
    }
    const inkBox = seen.length ? {
        left:   +(Math.min(...seen.map(s => s.l)) - box.left).toFixed(1),
        right:  +(box.right - Math.max(...seen.map(s => s.r))).toFixed(1),
        top:    +(Math.min(...seen.map(s => s.t)) - box.top).toFixed(1),
        bottom: +(box.bottom - Math.max(...seen.map(s => s.b))).toFixed(1),
    } : null;

    // logo must have decoded to real pixels
    const logo = p.querySelector('.logo');
    // the product screenshot is optional (layout.shotShow=0 hides it), so only
    // insist on real pixels when it is actually meant to be visible
    const shot = p.querySelector('#shotImg');
    const shotShown = shot && getComputedStyle(shot.parentElement).display !== 'none';
    const wm = p.querySelector('.wordmark');
    const wmGrad = wm && wm.classList.contains('grad')
        ? getComputedStyle(wm).backgroundImage : '';
    const fonts = [...new Set([...document.fonts].map(f =>
        f.family + ' ' + f.weight + ' ' + f.status))];
    const feats = [...p.querySelectorAll('#feats li')].map(li => li.textContent);
    return {
        posterW: p.clientWidth, posterH: p.clientHeight,
        scrollW: p.scrollWidth, scrollH: p.scrollHeight,
        clipped, inkBox, barH, fonts, feats,
        logoOk: !!(logo && logo.complete && logo.naturalWidth > 0),
        logoNatural: logo ? [logo.naturalWidth, logo.naturalHeight] : null,
        shotShown: !!shotShown,
        shotOk: !!(shot && shot.complete && shot.naturalWidth > 0),
        shotNatural: shot ? [shot.naturalWidth, shot.naturalHeight] : null,
        shotSrc: shot ? shot.getAttribute('src') : null,
        wmGrad: wmGrad,
        bg: getComputedStyle(p).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        shadow: getComputedStyle(p).boxShadow,
        headline: p.querySelector('h1').innerText.replace(/\\n/g, ' / '),
        strip: p.querySelector('.strip').textContent,
        padding: getComputedStyle(p).padding,
    };
}"""


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


async def run(args):
    if not os.path.exists(CHROME_PATH):
        sys.exit(f"Chrome not found at {CHROME_PATH} (set CHROME_PATH)")
    if not HTML.exists():
        sys.exit(f"missing template: {HTML}")

    from playwright.async_api import async_playwright

    # --dump-config runs first and never reads poster.config.json, so it can
    # always repair/refresh that file even if it is corrupt.
    if args.dump_config:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                executable_path=CHROME_PATH,
                args=["--no-sandbox", "--font-render-hinting=none",
                      "--force-color-profile=srgb"],
            )
            page = await browser.new_page(
                viewport={"width": WIDTH_PX, "height": HEIGHT_PX})
            await page.goto(HTML.as_uri() + "?editor=0&clean=1")
            raw = await page.evaluate("() => JSON.stringify(window.DEFAULTS)")
            await page.close()
            await browser.close()
        json.loads(raw)                      # fail loudly if the page is broken
        with open(CONFIG, "w", encoding="utf-8") as fh:
            fh.write(raw + "\n")
        print(f"wrote {CONFIG} ({len(raw)} bytes, read live from poster.html)")
        return 0

    cfg = None
    if args.config:
        cfg = load_config(args.config)
        src = args.config
    elif CONFIG.exists():
        try:
            cfg = load_config(CONFIG)
            src = str(CONFIG)
        except json.JSONDecodeError as e:
            sys.exit(f"{CONFIG} is not valid JSON ({e}).\n"
                     f"Fix it, delete it, or run --dump-config to regenerate it.")
    if cfg is None:
        src = "built-in defaults in poster.html"
    else:
        print(f"config    : {src}")

    langs = [args.lang] if args.lang else ["en", "sw"]
    OUT.mkdir(exist_ok=True)

    failures = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path=CHROME_PATH,
            args=["--no-sandbox", "--font-render-hinting=none",
                  "--force-color-profile=srgb"],
        )
        for base_lang in langs:
            run_cfg = json.loads(json.dumps(cfg)) if cfg else {}
            run_cfg["lang"] = base_lang
            page = await browser.new_page(
                viewport={"width": WIDTH_PX, "height": HEIGHT_PX},
                device_scale_factor=2,
            )
            # hand the config to the page before any script runs; this also sets
            # locked=true inside poster.html so its autosave can't override it
            await page.add_init_script(
                "window.__POSTER_CONFIG = " + json.dumps(run_cfg) + ";"
            )
            await page.goto(HTML.as_uri() + "?editor=0&clean=1")
            await page.evaluate("async () => { await document.fonts.ready; }")
            await page.wait_for_function(
                "() => { const i=document.querySelector('.logo');"
                " if(!(i && i.complete && i.naturalWidth > 0)) return false;"
                " const s=document.querySelector('#shotImg');"
                " const shown=s && getComputedStyle(s.parentElement).display!=='none';"
                " return !shown || (s.complete && s.naturalWidth>0); }"
            )
            await page.wait_for_timeout(250)

            r = await page.evaluate(PROBE)
            base = OUT / f"mwandishi-poster-{base_lang}"
            png, pdf = base.with_suffix(".png"), base.with_suffix(".pdf")

            if not args.open:
                await page.screenshot(path=str(png))
            await page.pdf(
                path=str(pdf),
                width="210mm", height="297mm",
                print_background=True, scale=SCALE,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )

            print(f"\n[{base_lang}] {r['headline']}")
            print(f"      box      : {r['posterW']}x{r['posterH']}"
                  f"  (scroll {r['scrollW']}x{r['scrollH']})"
                  f"  padding {r['padding']}")
            print(f"      features : {len(r['feats'])}")
            for f in r["feats"]:
                print(f"                 - {f}")
            print(f"      strip    : {r['strip']}")
            for f in r["fonts"]:
                print(f"      font     : {f}")

            problems = list(r["clipped"])
            if not r["logoOk"]:
                problems.append({"txt": "logo failed to decode"})
            if not r["logoNatural"] or r["logoNatural"][0] < 100:
                problems.append({"txt": f"logo tiny {r['logoNatural']}"})
            if r["shotShown"]:
                if not r["shotOk"]:
                    problems.append({"txt": f"screenshot failed to decode: {r['shotSrc']}"})
                elif not r["shotNatural"] or r["shotNatural"][0] < 200:
                    problems.append({"txt": f"screenshot tiny {r['shotNatural']}"})
            ink = r["inkBox"]
            print(f"      ink bbox : left {ink['left']}  right {ink['right']}"
                  f"  top {ink['top']}  bottom {ink['bottom']} px from poster edge")
            print(f"      logo     : {'decoded ' + str(r['logoNatural']) if r['logoOk'] else 'MISSING'}"
                  f"  | bar {r['barH']}px")
            if r["shotShown"]:
                print(f"      shot     : {'decoded ' + str(r['shotNatural']) if r['shotOk'] else 'MISSING'}"
                      f"  | {r['shotSrc']}")
            else:
                print("      shot     : hidden")
            if r["wmGrad"] and "gradient" in r["wmGrad"]:
                print(f"      wordmark : {r['wmGrad']}")
            print(f"      surface  : poster {r['bg']}  body {r['bodyBg']}"
                  f"  shadow {'none' if r['shadow'] == 'none' else r['shadow']}")
            if problems:
                failures += 1
                for b in problems:
                    print(f"      CLIPPED  : {b}")
            else:
                print("      clipped  : none - all text ink inside the poster box")
            if not args.open:
                print(f"      wrote    : {png.name} ({png.stat().st_size // 1024} KB)"
                      f"  {pdf.name} ({pdf.stat().st_size // 1024} KB)")
            else:
                print(f"      wrote    : {pdf.name} ({pdf.stat().st_size // 1024} KB)"
                      f"  [png skipped: --open]")
            await page.close()
        await browser.close()

    if failures:
        sys.exit(f"\n{failures} language(s) had overflow/clipping problems")
    print("\nOK - rendered with no overflow")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Render the Mwandishi AI A4 posters.")
    ap.add_argument("--lang", choices=["en", "sw"], help="render one language only")
    ap.add_argument("--config", help="path to a poster config JSON")
    ap.add_argument("--dump-config", action="store_true",
                    help="write posters/poster.config.json from poster.html defaults")
    ap.add_argument("--open", action="store_true",
                    help="skip the PNG (faster while iterating on the PDF)")
    args = ap.parse_args()
    sys.exit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()

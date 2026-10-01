## Mwandishi AI Export Backend (FastAPI)

Real files generated server-side — no browser print dialog.

## Run

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Needs system Chrome (PDF, via Playwright + `CHROME_PATH`, default
`/usr/bin/google-chrome`) and LibreOffice (DOCX, `SOFFICE_BIN`, default
`soffice` on PATH). No browser download needed.

## API

- `GET /api/health` → `{ ok, pdf, docx }`
- `POST /api/export/pdf` `{ html, css, filename }` → `application/pdf` (A4)
- `POST /api/export/docx` `{ html, css, filename }` → `.docx`

`html` = CV sheet inner HTML, `css` = export stylesheet. The frontend sends
exactly what it renders, so files match the website by construction.

## Frontend wiring

The builder posts to `window.MRCV_BACKEND_URL || :8000 on localhost, else
same-origin /api`. If the backend is unreachable (offline, static hosting),
export silently falls back to the local print dialog / styled `.doc` — the
app never breaks.

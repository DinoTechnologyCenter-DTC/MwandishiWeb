# Mwandishi AI Export Backend (FastAPI)

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

- `GET /api/health` → `{ ok, pdf, docx, ai }`
- `POST /api/export/pdf` `{ html, css, filename }` → `application/pdf` (A4)
- `POST /api/export/docx` `{ html, css, filename }` → `.docx`
- `POST /api/ai/draft` `{ name, job, level, about, lang }` → `{ ok, draft }`
  structured CV JSON (gpt-oss first on both providers: `openai/gpt-oss-20b`
  on Groq, `@cf/openai/gpt-oss-20b` on Cloudflare; override with `GROQ_MODEL`
  / `CF_MODEL` env vars)
- `POST /api/ai/chat` `{ messages:[{role, content}], lang }` →
  `{ reply, done, name, job, level, about }` — the CV interviewer; ask one
  short question at a time until all four slots are known

`html` = CV sheet inner HTML, `css` = export stylesheet. The frontend sends
exactly what it renders, so files match the website by construction.

## Frontend wiring

The builder posts to `window.MRCV_BACKEND_URL || :8000 on localhost, else
same-origin /api`. If the backend is unreachable (offline, static hosting),
export silently falls back to the local print dialog / styled `.doc` — the
app never breaks.

## AI key

Easiest: put it in `backend/.env` (gitignored, file mode 600):

```bash
cp backend/.env.example backend/.env
# then uncomment + paste your keys into .env
```

or export per shell:

```bash
export GROQ_API_KEY=gsk_...   # never commit it, never put it in frontend code
```

`.env` uncommented values override real environment variables.

The key lives only in the server environment. If a key was ever pasted in
chat or email, rotate it at console.groq.com first.

## AI fallback (Cloudflare Workers AI)

When Groq fails or hits token limits, the backend automatically falls back
to Cloudflare Workers AI — same JSON contract, no frontend changes needed:

```bash
export CF_API_TOKEN=... CF_ACCOUNT_ID=...   # env only, never commit
# optional: export CF_MODEL=@cf/openai/gpt-oss-20b
```

Order per call: Groq → Groq retry → Cloudflare → Cloudflare retry.
`GET /api/health` reports `ai` (Groq configured) and `aiFallback`
(Cloudflare configured).

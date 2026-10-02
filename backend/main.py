"""Mwandishi export backend (FastAPI) — real files, no browser print dialog.

POST /api/export/pdf  { html, css, filename } -> application/pdf (A4, exact colors)
POST /api/export/docx { html, css, filename } -> Word .docx
GET  /api/health -> { ok, pdf, docx }

PDF renders the exact HTML/CSS the site shows via headless Chrome.
DOCX converts the same package through LibreOffice, so both files match
the website by construction (single source: the sheet markup + live CSS).

System needs (already on this box, override with env):
  Chrome/Chromium  -> CHROME_PATH (default /usr/bin/google-chrome)
  LibreOffice      -> SOFFICE_BIN (default soffice on PATH)

Run:
  python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
  cp .env.example .env   # then fill in your keys (never commit .env)
  PORT=8000 uvicorn main:app
"""
import os

from dotenv import load_dotenv

load_dotenv(override=True)  # backend/.env wins; commented lines are ignored

import re
import shutil
import subprocess
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from playwright.async_api import async_playwright

PORT = int(os.environ.get("PORT", "8000"))
CHROME_PATH = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
SOFFICE_BIN = os.environ.get("SOFFICE_BIN", "soffice")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
CF_API_TOKEN = os.environ.get("CF_API_TOKEN", "")
CF_ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "")
CF_MODEL = os.environ.get("CF_MODEL", "@cf/openai/gpt-oss-20b")

app = FastAPI(title="MwandishiAI", description="MwandishiAI CV builder backend — AI chat, CV drafts, PDF/DOCX export.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExportReq(BaseModel):
    html: str = ""
    css: str = ""
    filename: str = "document"


class DraftReq(BaseModel):
    name: str = ""
    job: str = ""
    level: str = "student"
    about: str = ""
    lang: str = "EN"
    country: str = ""
    region: str = ""


class ChatMsg(BaseModel):
    role: str = "user"
    content: str = ""


class ChatReq(BaseModel):
    messages: list[ChatMsg] = []
    lang: str = "EN"


def safe_name(name: str, ext: str) -> str:
    base = re.sub(r'[\\/:*?"<>|]', "-", name or "document")
    base = re.sub(r"(\.[a-z0-9]+)?$", ext, base, flags=re.IGNORECASE)
    return base or f"document{ext}"


def page_doc(html: str, css: str) -> str:
    # Engine-agnostic print hardening. The page box is declared once here and
    # must stay in step with the margin passed to page.pdf() below; if the two
    # disagree, Chrome prints an offset or double-spaced gutter.
    return (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>"
        "@page{size:A4;margin:10mm;}"
        "body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}"
        "*{box-sizing:border-box}"
        "table{border-collapse:collapse;max-width:100%}"
        "img{max-width:100%;height:auto}"
        "h1,h2,h3,h4,p,li,div{orphans:2;widows:2}"
        f"{css or ''}</style></head><body>{html or ''}</body></html>"
    )


_browser = None


async def get_browser():
    global _browser
    if _browser is not None and _browser.is_connected():
        return _browser
    pw = await async_playwright().start()
    _browser = await pw.chromium.launch(
        executable_path=CHROME_PATH,
        args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    return _browser


@app.get("/")
async def root():
    return {"app": "MwandishiAI", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
async def health():
    pdf_ok, pdf_error = True, ""
    try:
        await get_browser()
    except Exception as e:  # noqa: BLE001
        pdf_ok, pdf_error = False, str(e)[:200]
    return {
        "ok": True,
        "pdf": pdf_ok,
        "docx": shutil.which(SOFFICE_BIN) is not None,
        "ai": bool(GROQ_API_KEY),
        "aiFallback": bool(CF_API_TOKEN and CF_ACCOUNT_ID),
        "pdfError": pdf_error,
    }


@app.post("/api/export/pdf")
async def export_pdf(req: ExportReq):
    if not req.html.strip():
        raise HTTPException(400, "html required")
    try:
        browser = await get_browser()
        page = await browser.new_page()
        try:
            await page.set_content(page_doc(req.html, req.css), wait_until="networkidle", timeout=15000)
            pdf = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
            )
        finally:
            await page.close()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"pdf failed: {str(e)[:300]}")
    return Response(
        content=bytes(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name(req.filename, ".pdf")}"'},
    )


@app.post("/api/export/docx")
async def export_docx(req: ExportReq):
    if not req.html.strip():
        raise HTTPException(400, "html required")
    if shutil.which(SOFFICE_BIN) is None:
        raise HTTPException(500, "libreoffice not available")
    tmp = tempfile.mkdtemp(prefix="mrcv-")
    try:
        src = os.path.join(tmp, "cv.doc")
        with open(src, "w", encoding="utf-8") as f:
            f.write(page_doc(req.html, req.css))
        proc = subprocess.run(
            [
                SOFFICE_BIN, "--headless",
                "-env:UserInstallation=file://" + os.path.join(tmp, "soprofile"),
                "--infilter=HTML",
                "--convert-to", "docx:MS Word 2007 XML",
                "--outdir", tmp, src,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        out = os.path.join(tmp, "cv.docx")
        if proc.returncode != 0 or not os.path.exists(out):
            raise HTTPException(500, f"convert failed: {(proc.stderr or '')[:300]}")
        with open(out, "rb") as f:
            data = f.read()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{safe_name(req.filename, ".docx")}"'},
    )


DRAFT_SYSTEM = (
    "You turn rough job-seeker notes into structured CV data for Tanzanian job seekers. "
    "Reply with ONLY a valid JSON object, no markdown, no commentary. Schema: "
    '{"summary": str, "phone": str, "email": str, "address": str, '
    '"education": [{"school": str, "qualification": str, "start": str, "end": str}], '
    '"experience": [{"employer": str, "role": str, "start": str, "end": str, "bullets": [str]}], '
    '"skills": [str]}. '
    "Rewrite duty descriptions as strong achievement bullets with numbers where stated. "
    "Follow the target work location's CV conventions (e.g. Tanzania expects 2 referees; "
    "keep it to 1-2 pages; referees section only when that market expects it). "
    "NEVER invent employers, schools, dates or contacts; leave unknown fields as empty strings. "
    "Keep every value truthful to the notes."
)


def cf_chat(messages: list, temperature: float = 0.3) -> str:
    """Cloudflare Workers AI fallback (OpenAI-compatible endpoint)."""
    import json as _json
    import urllib.request

    if not CF_API_TOKEN or not CF_ACCOUNT_ID:
        raise RuntimeError("cloudflare not configured (CF_API_TOKEN/CF_ACCOUNT_ID missing)")
    body = _json.dumps({
        "model": CF_MODEL,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": messages,
    }).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/v1/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {CF_API_TOKEN}"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        data = _json.loads(r.read().decode())
    if isinstance(data, dict) and data.get("success") is False:
        raise RuntimeError(str(data.get("errors", ["cloudflare error"]))[:200])
    return data["choices"][0]["message"]["content"]


def ai_complete(messages: list) -> str:
    """Groq first, Cloudflare Workers AI on any Groq failure."""
    errors = []
    attempts = [
        lambda: groq_chat(messages, temperature=0.6),
        lambda: groq_chat(messages, temperature=0.0),
        lambda: cf_chat(messages, temperature=0.3),
        lambda: cf_chat(messages, temperature=0.0),
    ]
    for fn in attempts:
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            errors.append(str(e)[:120])
    raise RuntimeError("all AI providers failed: " + " | ".join(errors))


def groq_chat(messages: list, temperature: float = 0.3) -> str:
    import json as _json
    import urllib.request

    body = _json.dumps({
        "model": GROQ_MODEL,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": messages,
    }).encode()
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
            # Groq sits behind Cloudflare, which blocks urllib's default UA (error 1010)
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        data = _json.loads(r.read().decode())
    return data["choices"][0]["message"]["content"]


@app.post("/api/ai/draft")
async def ai_draft(req: DraftReq):
    import json as _json

    if not GROQ_API_KEY:
        raise HTTPException(503, "AI not configured (GROQ_API_KEY missing)")
    if not req.name.strip() and not req.about.strip():
        raise HTTPException(400, "name or about required")
    lang_name = "Kiswahili" if req.lang.upper() == "SW" else "English"
    geo = ", ".join(x for x in (req.region.strip(), req.country.strip()) if x)
    user_msg = (
        f"Candidate name: {req.name.strip()}\nTarget job: {req.job.strip()}\n"
        f"Level: {req.level.strip()}\nTarget work location: {geo or 'not specified'}\n"
        f"Language for all text: {lang_name}\n"
        f"Rough notes:\n{req.about.strip()}"
    )
    try:
        raw = ai_complete(
            [{"role": "system", "content": DRAFT_SYSTEM}, {"role": "user", "content": user_msg}],
        )
        start, end = raw.find("{"), raw.rfind("}")
        draft = _json.loads(raw[start:end + 1] if start >= 0 and end > start else raw)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI generation failed: {str(e)[:200]}")
    if not isinstance(draft, dict):
        raise HTTPException(502, "AI returned unusable data")
    return {"ok": True, "draft": draft}


CHAT_SYSTEM = (
    "You are Mwandishi AI, a friendly CV interviewer for job seekers. "
    "Hold a SHORT natural conversation to collect six slots: "
    "1) full name, 2) target job title, 3) experience level "
    "(one of: student, fresher, experienced), 4) country they are job hunting in, "
    "5) city/region, 6) background notes (school, work, phone, skills). "
    "Ask ONE short question at a time, in order, skipping anything already known. "
    "Combine country+city into a single question like 'Which country and city are you job hunting in?'. "
    "When offering a fixed set of choices (especially experience level), present them as a "
    "numbered list (1. 2. 3.) and accept numeric answers ('1', '2'), "
    "multi-picks ('1, 3'), or 'all' / 'all of them' / 'zote' meaning every option. "
    "Acknowledge answers warmly and briefly. "
    "LANGUAGE: start in the conversation language given, BUT if the user writes in "
    "Kiswahili at any point, switch the entire conversation to Kiswahili immediately. "
    "When all six slots are known, stop asking. "
    "Reply with ONLY a valid JSON object, no markdown: "
    '{"reply": str, "done": bool, "name": str, "job": str, "level": str, '
    '"country": str, "region": str, "about": str}. '
    "reply = your next message (empty string when done). "
    "about = background-relevant user messages only (school, work, phone, skills), "
    "concatenated; NEVER copy the name, job title, level, country or region answers into about. "
    "Never invent values; leave unknown slots as empty strings. "
    'Example reply: {"reply": "Asante! Kazi gani unalenga?", "done": false, '
    '"name": "Juma", "job": "", "level": "", "country": "", "region": "", "about": ""}. '
    "FINAL RULE: your entire response must be exactly one JSON object and nothing else."
)


@app.post("/api/ai/chat")
async def ai_chat(req: ChatReq):
    import json as _json

    if not GROQ_API_KEY:
        raise HTTPException(503, "AI not configured (GROQ_API_KEY missing)")
    lang_name = "Kiswahili" if req.lang.upper() == "SW" else "English"
    convo = [{"role": "system", "content": CHAT_SYSTEM + f" Conversation language: {lang_name}."}]
    for m in (req.messages or [])[-12:]:
        if m.role in ("user", "assistant") and m.content.strip():
            convo.append({"role": m.role, "content": m.content.strip()[:1500]})
    try:
        raw = ai_complete(convo)
        start, end = raw.find("{"), raw.rfind("}")
        out = _json.loads(raw[start:end + 1] if start >= 0 and end > start else raw)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI chat failed: {str(e)[:200]}")
    if not isinstance(out, dict) or "reply" not in out:
        raise HTTPException(502, "AI returned unusable data")
    for k in ("reply", "name", "job", "level", "country", "region", "about"):
        if not isinstance(out.get(k), str):
            out[k] = ""
    out["done"] = bool(out.get("done")) and bool(out.get("name", "").strip())
    return out


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)

"""Native DOCX rendering for the formal application letter.

Why this exists
---------------
The generic export path round-trips HTML through LibreOffice:

    soffice --convert-to docx:MS Word 2007 XML

LibreOffice's Writer HTML filter only honours a small subset of CSS. Measured
against a real letter payload it dropped text-align (everything came out
"left"), text-indent (0), font-family (no Times New Roman run properties at
all) and replaced the page margins with its 10mm default. So a letter exported
that way is not the letter the applicant designed.

When the payload carries the formal-letter markup -- the ``lt-*`` classes the
frontend already emits -- we rebuild the document natively with python-docx
instead. Geometry matches the reference Tanzanian formal letter:

  * Times New Roman 12pt, A4, 1 inch margins
  * sender block right-aligned, 30.7pt leading, date last
  * recipient block left-aligned
  * salutation indented 24pt
  * subject centred
  * body justified with a 66pt first-line indent, 16pt leading
  * closing block centred, contact line last

The PDF path needs none of this: it is rendered by Chromium, which honours the
same CSS faithfully.
"""

from __future__ import annotations

from html.parser import HTMLParser

# Reference metrics, in points. Kept in one place so the DOCX and the
# stylesheet used for PDF/preview can be compared directly.
FONT_NAME = "Times New Roman"
FONT_PT = 12
LINE_PT = 16
SENDER_LINE_PT = 30.7
SENDER_AFTER_PT = 15
BLOCK_AFTER_PT = 10
SUBJECT_AFTER_PT = 12
SALUTE_INDENT_PT = 24
PARA_INDENT_PT = 66
CLOSE_BEFORE_PT = 12
CONTACT_BEFORE_PT = 6  # retained for callers that space the contact line separately

LETTER_MARKERS = ("lt-sender", "lt-subject", "lt-para")


class _Node:
    __slots__ = ("tag", "cls", "kids", "text")

    def __init__(self, tag: str, cls: str):
        self.tag = tag
        self.cls = cls
        self.kids: list = []
        self.text: list[str] = []

    @property
    def classes(self) -> set[str]:
        return set(self.cls.split())


class _Tree(HTMLParser):
    """Minimal DOM builder. The letter markup is well-formed and shallow, so a
    full parser is unnecessary -- but regex extraction breaks the moment a
    name contains "<" or a paragraph spans nested tags."""

    VOID = {"br", "img", "hr", "meta", "link", "input", "col"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = _Node("#root", "")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            return
        cls = ""
        for k, v in attrs:
            if k == "class":
                cls = v or ""
        node = _Node(tag, cls)
        self.stack[-1].kids.append(node)
        self.stack.append(node)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        chunk = data.strip()
        if chunk:
            self.stack[-1].text.append(chunk)


def _walk(node):
    yield node
    for kid in node.kids:
        if isinstance(kid, _Node):
            yield from _walk(kid)


def _first(tree: _Tree, cls: str):
    for node in _walk(tree.root):
        if cls in node.classes:
            return node
    return None


def _lines(node) -> list[tuple[bool, str]]:
    """Flatten a block into lines of (is_contact, text).

    Nested <div>s become separate lines; a bare text node becomes one line."""
    out: list[tuple[bool, str]] = []
    for kid in node.kids:
        if not isinstance(kid, _Node):
            continue
        text = " ".join(kid.text).strip()
        if not text:
            continue
        out.append(("lt-contact" in kid.classes, text))
    if not out:
        text = " ".join(node.text).strip()
        if text:
            out.append((False, text))
    return out


def looks_like_letter(html: str) -> bool:
    """True when the payload is the formal-letter markup, so the generic
    LibreOffice round-trip would flatten it."""
    if not html:
        return False
    tree = _Tree()
    tree.feed(html)
    tree.close()
    found = set()
    for node in _walk(tree.root):
        found |= node.classes
    return sum(1 for m in LETTER_MARKERS if m in found) >= 2


def parse(html: str) -> dict:
    tree = _Tree()
    tree.feed(html)
    tree.close()

    def block(cls):
        node = _first(tree, cls)
        return _lines(node) if node is not None else []

    closing = block("lt-close")
    contact = [t for is_c, t in closing if is_c]
    closing = [t for is_c, t in closing if not is_c]

    salut = _first(tree, "lt-salute")
    subject = _first(tree, "lt-subject")
    paras = [_lines(n) for n in _walk(tree.root) if "lt-para" in n.classes]

    return {
        "sender": [t for _, t in block("lt-sender")],
        "to": [t for _, t in block("lt-to")],
        "salutation": " ".join(salut.text).strip() if salut is not None else "",
        "subject": " ".join(subject.text).strip() if subject is not None else "",
        "paras": [" ".join(t for _, t in p) for p in paras if any(t for _, t in p)],
        "closing": closing,
        "contact": contact,
    }


def render(spec: dict) -> bytes:
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.shared import Inches, Mm, Pt

    doc = Document()
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(section, side, Inches(1))

    # Times New Roman has to be pinned on the style *and* on every run: Word
    # falls back to its theme font when only the style carries the name.
    normal = doc.styles["Normal"]
    normal.font.name = FONT_NAME
    normal.font.size = Pt(FONT_PT)
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), FONT_NAME)

    def add(text, align=None, indent=None, before=0, after=BLOCK_AFTER_PT, line=LINE_PT):
        p = doc.add_paragraph()
        if align is not None:
            p.alignment = align
        pf = p.paragraph_format
        pf.space_before = Pt(before)
        pf.space_after = Pt(after)
        pf.line_spacing = Pt(line)
        if indent:
            pf.first_line_indent = Pt(indent)
        run = p.add_run(text)
        run.font.name = FONT_NAME
        run.font.size = Pt(FONT_PT)
        run._element.rPr.rFonts.set(qn("w:cs"), FONT_NAME)
        return p

    RIGHT = WD_ALIGN_PARAGRAPH.RIGHT
    LEFT = WD_ALIGN_PARAGRAPH.LEFT
    CENTER = WD_ALIGN_PARAGRAPH.CENTER
    JUSTIFY = WD_ALIGN_PARAGRAPH.JUSTIFY

    sender = spec.get("sender") or []
    for line in sender:
        add(line, align=RIGHT, after=0, line=SENDER_LINE_PT)

    to = spec.get("to") or []
    for i, line in enumerate(to):
        add(line, align=LEFT, before=SENDER_AFTER_PT if (i == 0 and sender) else 0,
            after=BLOCK_AFTER_PT)

    if spec.get("salutation"):
        add(spec["salutation"], align=LEFT, indent=SALUTE_INDENT_PT)

    if spec.get("subject"):
        add(spec["subject"], align=CENTER, after=SUBJECT_AFTER_PT)

    for para in spec.get("paras") or []:
        add(para, align=JUSTIFY, indent=PARA_INDENT_PT)

    closing = spec.get("closing") or []
    for i, line in enumerate(closing):
        add(line, align=CENTER,
            before=CLOSE_BEFORE_PT if i == 0 else 0,
            after=BLOCK_AFTER_PT, line=LINE_PT)
    if not closing and spec.get("contact"):
        add(spec["contact"][0], align=CENTER, before=CLOSE_BEFORE_PT, after=0)

    for i, line in enumerate(spec.get("contact") or []):
        add(line, align=CENTER,
            before=0 if closing else CLOSE_BEFORE_PT, after=0)

    import io

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

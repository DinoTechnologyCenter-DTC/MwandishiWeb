"""Native .docx renderer — pixel-exact Word output, no LibreOffice.

Why this exists
---------------
The HTML -> .docx route went through LibreOffice, whose HTML importer maps only
a small CSS subset into the Writer document model. Everything structural is
dropped: paragraph borders (w:pBdr), fills (w:shd) and text-transform (w:caps)
have no mapping at all, so the accent rule under every section heading, the
skill-chip backgrounds and the uppercasing all vanished. It also only *names*
the font (Poppins) without embedding it, so Word substitutes its own default and
re-flows every line. Measured on a real export: 0 borders, 0 fills, 0 caps, no
embedded font.

Building the OOXML directly makes each of those a real property of the file:

  section rule   -> w:pBdr
  uppercasing    -> w:caps (a property, not baked-in text)
  chips / bands  -> w:shd
  two columns    -> w:cols, or a borderless table for a fixed rail
  font           -> named on every slot with theme refs stripped

Sizes are CSS pixels converted to points (x0.75) so the .docx matches the PDF,
which Chrome lays out from the same stylesheet.

Only python-docx (+ lxml) is required.
"""
from __future__ import annotations

import base64
import re
from html import unescape
from io import BytesIO

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor

# Office-safe stack, and it must match what collectSheetCSS substitutes for the
# PDF (Calibri,Arial,sans-serif) or the two files disagree on metrics.
BODY_FONT = "Calibri"

PT_PER_PX = 0.75           # CSS px -> pt at 96dpi
LINE_HEIGHT = 1.55         # body line spacing, mirrors the stylesheet
TWIP_PER_MM = 56.6929
PAGE_MM = 210.0
MARGIN_MM = 10.0
CONTENT_MM = PAGE_MM - 2 * MARGIN_MM          # 190mm usable width

GRAY_900 = "171717"
GRAY_600 = "262626"
GRAY_500 = "737373"
GRAY_100 = "F5F5F5"
EXACT_RAIL = "EFEDEA"
BANKING_BG = "262626"
BANKING_NAME = "FFFFFF"
BANKING_TITLE = "F0B100"
BANKING_CONTACT = "D4D4D4"

DEFAULT_ACCENT = "008000"   # brand green; must track frontend $brand
DEEP_ACCENT = "244655"

DATA_URL = re.compile(r"^data:image/[a-zA-Z0-9.+-]+;base64,(.+)$", re.S)


def pt(px_value: float):
    """CSS px -> Pt. The stylesheet is authored in px and Chrome honours that;
    treating those numbers as points made every .docx ~33% oversized."""
    return Pt(float(px_value) * PT_PER_PX)


# --------------------------------------------------------------------------
# low-level OOXML helpers (python-docx exposes no API for these)
# --------------------------------------------------------------------------
def _el(tag: str, **attrs) -> OxmlElement:
    node = OxmlElement(tag)
    for key, val in attrs.items():
        node.set(qn(key.replace("__", ":")), val)
    return node


def _font(run, name: str) -> None:
    """Pin the font on every slot and strip theme references.

    Theme fonts (minorHAnsi etc.) outrank the document default, so naming a
    font without removing them leaves Word free to substitute its own.
    """
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for slot in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(slot), name)
    for theme in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if rfonts.get(qn(theme)) is not None:
            del rfonts.attrib[qn(theme)]
    run.font.name = name


def style_run(run, name: str, size_px: float | None = None, bold=None,
              color: str | None = None, caps: bool = False,
              spacing_px: float | None = None) -> None:
    _font(run, name)
    if size_px is not None:
        run.font.size = pt(size_px)
    if bold is not None:
        run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    rpr = run._element.get_or_add_rPr()
    if caps:
        rpr.append(_el("w:caps", w__val="1"))
    if spacing_px is not None:
        rpr.append(_el("w:spacing", w__val=str(int(round(spacing_px * PT_PER_PX * 20)))))


def run_shading(run, fill: str) -> None:
    """Character shading — the closest DOCX has to a rounded chip."""
    run._element.get_or_add_rPr().append(
        _el("w:shd", w__val="clear", w__color="auto", w__fill=fill))


def para_border(paragraph, edge: str, color: str, size_eighths: int = 16,
                space_pt: int = 2, style: str = "single") -> None:
    ppr = paragraph._element.get_or_add_pPr()
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    pbdr.append(_el(f"w:{edge}", w__val=style, w__sz=str(size_eighths),
                    w__space=str(space_pt), w__color=color))


def cell_borders(cell, color: str = "auto", size: int = 0) -> None:
    tcpr = cell._element.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        borders.append(_el(f"w:{edge}", w__val="single" if size else "none",
                           w__sz=str(size or 0), w__space="0", w__color=color))
    tcpr.append(borders)


def cell_shading(cell, fill: str) -> None:
    cell._element.get_or_add_tcPr().append(
        _el("w:shd", w__val="clear", w__color="auto", w__fill=fill))


def cell_margins(cell, top=0.0, start=0.0, bottom=0.0, end=0.0) -> None:
    tcpr = cell._element.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for edge, val in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        mar.append(_el(f"w:{edge}", w__w=str(int(val * TWIP_PER_MM)), w__type="dxa"))
    tcpr.append(mar)


def cell_width(cell, mm: float) -> None:
    tcpr = cell._element.get_or_add_tcPr()
    for old in tcpr.findall(qn("w:tcW")):
        tcpr.remove(old)
    tcpr.append(_el("w:tcW", w__w=str(int(mm * TWIP_PER_MM)), w__type="dxa"))
    cell.width = Mm(mm)


def cell_valign(cell, val: str = "top") -> None:
    cell._element.get_or_add_tcPr().append(_el("w:vAlign", w__val=val))


def fixed_layout(table, widths_mm: list[float] | None = None) -> None:
    """Pin column widths. The tblGrid governs under fixed layout and python-docx
    builds it with equal columns, so setting only cell widths lets Word re-flow
    (which wrapped the role onto a second line)."""
    table.autofit = False
    tblpr = table._element.tblPr
    tblpr.append(_el("w:tblLayout", w__type="fixed"))
    if not widths_mm:
        return
    total = sum(widths_mm)
    for old in tblpr.findall(qn("w:tblW")):
        tblpr.remove(old)
    tblpr.append(_el("w:tblW", w__w=str(int(total * TWIP_PER_MM)), w__type="dxa"))
    grid = table._element.find(qn("w:tblGrid"))
    if grid is not None:
        for col, mm in zip(grid.findall(qn("w:gridCol")), widths_mm):
            col.set(qn("w:w"), str(int(mm * TWIP_PER_MM)))


def columns_section(doc, count: int = 2, gap_mm: float = 7.4):
    """A continuous section set to `count` columns — OOXML's real equivalent of
    CSS `columns: 2`. Word balances the columns; LibreOffice and Google Docs do
    not, so this is only used when the content is long enough to fill column
    one on its own (see DocxRenderer._build_clinical)."""
    sec = doc.add_section(WD_SECTION.CONTINUOUS)
    sectPr = sec._sectPr
    for old in sectPr.findall(qn("w:cols")):
        sectPr.remove(old)
    sectPr.append(_el("w:cols", w__num=str(count), w__space=str(int(gap_mm * TWIP_PER_MM)),
                      w__equalWidth="1", w__sep="0"))
    return sec


def keep(paragraph, with_next: bool = False) -> None:
    """Stop Word splitting an entry across a page break."""
    ppr = paragraph._element.get_or_add_pPr()
    ppr.append(_el("w:keepLines", w__val="1"))
    ppr.append(_el("w:widowControl", w__val="1"))
    if with_next:
        ppr.append(_el("w:keepNext", w__val="1"))


def tab_stop(paragraph, position_mm: float) -> None:
    tabs = OxmlElement("w:tabs")
    tabs.append(_el("w:tab", w__val="right", w__pos=str(int(position_mm * TWIP_PER_MM))))
    paragraph._element.get_or_add_pPr().append(tabs)


# --------------------------------------------------------------------------
# content shaping (mirrors cvToHTML / cvThemedHTML / cvExactExport)
# --------------------------------------------------------------------------
_TAG = re.compile(r"<[^>]+>")


def plain(value) -> str:
    return unescape(_TAG.sub("", str(value or ""))).strip()


def split_lines(value) -> list[str]:
    return [x.strip() for x in re.split(r"[\n,]+", str(value or "")) if x.strip()]


def contact_line(p: dict) -> str:
    return " · ".join(x for x in
                      (plain(p.get("phone")), plain(p.get("email")), plain(p.get("address")))
                      if x)


def date_span(start, end) -> str:
    return " – ".join(x for x in (plain(start), plain(end)) if x)


def join_dash(*parts) -> str:
    return " — ".join(x for x in (plain(p) for p in parts) if x)


def norm_hex(color, fallback: str = DEFAULT_ACCENT) -> str:
    c = str(color or "").strip().lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return c.upper() if re.fullmatch(r"[0-9A-Fa-f]{6}", c or "") else fallback


def image_bytes(value) -> bytes | None:
    m = DATA_URL.match(str(value or "").strip())
    if not m:
        return None
    try:
        return base64.b64decode(m.group(1))
    except (ValueError, TypeError):
        return None


# --------------------------------------------------------------------------
# renderer
# --------------------------------------------------------------------------
FLOW_TEMPLATES = ("graduate", "government", "banking", "general", "clinical", "exact")


class DocxRenderer:
    def __init__(self, data: dict, theme: dict | None = None, template: str = "graduate"):
        self.d = data or {}
        self.tpl = template if template in FLOW_TEMPLATES else "graduate"
        theme = theme or {}
        deep = self.tpl in ("clinical", "exact")
        self.accent = norm_hex(theme.get("color"), DEEP_ACCENT if deep else DEFAULT_ACCENT)
        self.size = self._size_of(theme.get("size"))
        self.doc = Document()
        self._target = self.doc          # swaps to a _Cell when rendering a rail
        self.avail = CONTENT_MM          # usable width, narrows inside a column
        self._setup_page()
        self._setup_styles()

    @staticmethod
    def _size_of(value) -> float:
        try:
            return float(str(value).replace("px", "").strip())
        except (TypeError, ValueError):
            return 13.0

    # -- page / document defaults -----------------------------------------
    def _setup_page(self) -> None:
        for sec in (self.doc.sections[0],):
            sec.page_width, sec.page_height = Mm(210), Mm(297)
            for side in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
                setattr(sec, side, Mm(MARGIN_MM))
            sec.header_distance, sec.footer_distance = Mm(6), Mm(6)

    def _setup_styles(self) -> None:
        normal = self.doc.styles["Normal"]
        normal.font.size = pt(self.size)
        rpr = normal.element.get_or_add_rPr()
        rfonts = rpr.find(qn("w:rFonts"))
        if rfonts is None:
            rfonts = OxmlElement("w:rFonts")
            rpr.insert(0, rfonts)
        for slot in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rfonts.set(qn(slot), BODY_FONT)
        for theme in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
            if rfonts.get(qn(theme)) is not None:
                del rfonts.attrib[qn(theme)]
        normal.font.name = BODY_FONT
        pf = normal.paragraph_format
        pf.space_before, pf.space_after = Pt(0), Pt(0)
        pf.line_spacing = 1.55

    # -- primitives ---------------------------------------------------------
    def para(self, space_before=0.0, space_after=0.0, align=None):
        p = self._target.add_paragraph()
        pf = p.paragraph_format
        pf.space_before, pf.space_after = pt(space_before), pt(space_after)
        pf.line_spacing = 1.55
        if align is not None:
            p.alignment = align
        keep(p)
        return p

    def text(self, value, *, size=None, bold=False, color=None, caps=False,
             space_before=0.0, space_after=0.0, align=None, spacing_px=None):
        p = self.para(space_before, space_after, align)
        value = plain(value)
        if value:
            style_run(p.add_run(value), BODY_FONT,
                      self.size if size is None else size,
                      bold, color, caps, spacing_px)
        return p

    def table(self, rows: int, cols: int, widths_mm: list[float] | None = None):
        t = self._target.add_table(rows=rows, cols=cols)
        t.alignment = WD_TABLE_ALIGNMENT.LEFT
        fixed_layout(t, widths_mm)
        return t

    def spacer(self):
        """Word needs a paragraph after a trailing table in a cell/body."""
        return self._target.add_paragraph()

    def cell_para(self, cell, space_before=0.0, space_after=0.0, align=None):
        p = cell.paragraphs[0] if (len(cell.paragraphs) == 1
                                   and not cell.paragraphs[0].runs
                                   and not cell.paragraphs[0].text) else cell.add_paragraph()
        pf = p.paragraph_format
        pf.space_before, pf.space_after = pt(space_before), pt(space_after)
        pf.line_spacing = 1.55
        if align is not None:
            p.alignment = align
        keep(p)
        return p

    # -- section heading ----------------------------------------------------
    def heading(self, label: str) -> None:
        p = self.para(space_before=7, space_after=3)
        style_run(p.add_run(label), BODY_FONT, 12, True, self.accent, caps=True, spacing_px=0.8)
        if self.tpl == "exact":
            # exact uses accent labels with no rule (cvExactExport's secH)
            return
        if self.tpl == "government":
            para_border(p, "bottom", self.accent, 12, 2, style="double")
        elif self.tpl == "general":
            para_border(p, "left", self.accent, 24, 4)
            p.paragraph_format.left_indent = Mm(2.5)
        else:
            para_border(p, "bottom", self.accent, 16, 2)

    def body_text(self, value, **kw) -> None:
        if plain(value):
            self.text(value, **kw)

    # -- item head: real 2-column borderless table --------------------------
    def item_head(self, left: str, dates: str) -> None:
        left, dates = plain(left), plain(dates)
        if not left and not dates:
            return
        # A side-by-side dates column needs room; in a narrow layout it wraps
        # mid-date, so the dates move inline instead.
        if dates and self.avail < 120.0:
            self.text(f"{left}  ({dates})" if left else dates, bold=bool(left),
                      color=GRAY_900 if left else GRAY_500)
            return
        widths = ([self.avail * 0.70, self.avail * 0.30] if dates else [self.avail])
        t = self.table(1, len(widths), widths)
        cells = t.rows[0].cells
        for cell, mm in zip(cells, widths):
            cell_width(cell, mm)
            cell_borders(cell)
            cell_margins(cell)
            cell_valign(cell, "bottom")
        lp = self.cell_para(cells[0])
        if left:
            style_run(lp.add_run(left), BODY_FONT, self.size, True, GRAY_900)
        keep(lp, with_next=True)
        if dates:
            rp = self.cell_para(cells[1], align=WD_ALIGN_PARAGRAPH.RIGHT)
            style_run(rp.add_run(dates), BODY_FONT, self.size * 0.9, False, GRAY_500)
        self.spacer()

    # -- exact variant: role — employer with dates in brackets --------------
    def item_head_exact(self, left: str, dates: str) -> None:
        left, dates = plain(left), plain(dates)
        if not left:
            return
        p = self.para(space_before=3, space_after=0)
        style_run(p.add_run(left), BODY_FONT, self.size, True, GRAY_900)
        if dates:
            style_run(p.add_run(f"  ({dates})"), BODY_FONT, self.size * 0.9, False, GRAY_500)
        keep(p, with_next=True)

    # -- bullets ------------------------------------------------------------
    def bullets(self, value) -> None:
        for b in split_lines(value):
            p = self.para(space_before=1, space_after=1)
            p.paragraph_format.left_indent = Mm(6)
            p.paragraph_format.first_line_indent = Mm(-6)
            style_run(p.add_run("•\t" + b), BODY_FONT, self.size, False, GRAY_600)
            tab_stop(p, 6)

    # -- skill chips (flow templates) / plain lines (exact rail) -----------
    def skill_chips(self, value) -> None:
        chips = split_lines(value)
        if not chips:
            return
        p = self.para(space_before=1, space_after=2)
        for i, chip in enumerate(chips):
            if i:
                style_run(p.add_run("  "), BODY_FONT, self.size)
            r = p.add_run(f" {chip} ")
            style_run(r, BODY_FONT, self.size * 0.9, False, GRAY_600)
            run_shading(r, GRAY_100)

    # -- header -------------------------------------------------------------
    def _head_parts(self):
        p = self.d.get("personal") or {}
        return (plain(p.get("fullName")) or "Your Name",
                plain(p.get("title")), contact_line(p))

    def header_blocked(self) -> None:
        name, title, contact = self._head_parts()
        t = self.table(1, 1, [CONTENT_MM])
        cell = t.rows[0].cells[0]
        cell_width(cell, CONTENT_MM)
        cell_shading(cell, BANKING_BG)
        cell_margins(cell, 3, 4, 3, 4)
        cell_borders(cell)
        first = True
        for value, size, color, bold in (
            (name, self.size * 1.7, BANKING_NAME, True),
            (title, self.size, BANKING_TITLE, True),
            (contact, self.size * 0.92, BANKING_CONTACT, False),
        ):
            if not plain(value):
                continue
            p = self.cell_para(cell, space_after=1)
            style_run(p.add_run(plain(value)), BODY_FONT, size, bold, color)
            first = False
        self.spacer()

    def header_plain(self) -> None:
        name, title, contact = self._head_parts()
        align = WD_ALIGN_PARAGRAPH.CENTER if self.tpl == "government" else WD_ALIGN_PARAGRAPH.LEFT
        accent_name = self.tpl in ("graduate", "clinical")
        self.text(name, size=self.size * 1.7, bold=True,
                  color=self.accent if accent_name else GRAY_900,
                  space_after=1, align=align)
        if title:
            self.text(title, size=self.size, bold=True, color=self.accent,
                      space_after=2, align=align)
        if contact:
            self.text(contact, size=self.size * 0.92, color=GRAY_500,
                      space_after=4, align=align)

    # -- build --------------------------------------------------------------
    def build(self):
        if self.tpl == "exact":
            self._build_exact()
        elif self.tpl == "clinical":
            self._build_clinical()
        elif self.tpl == "banking":
            self.header_blocked()
            self._sections()
        else:
            self.header_plain()
            self._sections()

        body = self.doc.element.body
        # A table may not be the final block in a document or cell.
        if len(body) and body[-1].tag == qn("w:tbl"):
            body.append(OxmlElement("w:p"))
        return self.doc

    # -- clinical: full-width header over two explicit columns --------------
    COL_GAP_MM = 7.4
    LONG_CV_MM = 150.0      # above this, real columns balance better than a split

    def _line_mm(self) -> float:
        """Height of one wrapped line of body text, in millimetres."""
        return self.size * PT_PER_PX * LINE_HEIGHT * 0.3528

    def _chars_per_line(self, width_mm: float) -> float:
        char_mm = 0.5 * self.size * PT_PER_PX * 0.3528
        return max(10.0, width_mm / char_mm)

    def _text_mm(self, value, width_mm: float) -> float:
        chars = len(plain(value))
        if not chars:
            return 0.0
        lines = max(1, int(chars / self._chars_per_line(width_mm)) + 1)
        return lines * self._line_mm()

    def _plan_columns(self, width_mm: float) -> list[tuple[str, float]]:
        """Sections _sections() would emit, with an estimated height each.

        Returns the list in render order so the split can be balanced by
        cumulative height instead of a hard-coded section list.
        """
        d = self.d
        p = d.get("personal") or {}
        head_mm = self._line_mm() * 1.5      # heading text plus its bottom rule
        out: list[tuple[str, float]] = []

        if plain(p.get("summary")):
            out.append(("summary", head_mm + self._text_mm(p.get("summary"), width_mm)))

        exp = [e for e in (d.get("experience") or [])
               if plain(e.get("role")) or plain(e.get("employer"))]
        if exp:
            h = head_mm
            for e in exp:
                h += self._text_mm(join_dash(e.get("role"), e.get("employer")), width_mm)
                h += self._text_mm(date_span(e.get("start"), e.get("end")), width_mm)
                for line in split_lines(e.get("bullets")):
                    h += self._text_mm(line, width_mm - 4)
            out.append(("experience", h))

        edu = [e for e in (d.get("education") or [])
               if plain(e.get("school")) or plain(e.get("qualification"))]
        if edu:
            h = head_mm
            for e in edu:
                h += self._text_mm(join_dash(e.get("qualification"), e.get("school")), width_mm)
                h += self._text_mm(date_span(e.get("start"), e.get("end")), width_mm)
            out.append(("education", h))

        if split_lines(d.get("skills")):
            out.append(("skills", head_mm + self._line_mm() * 2))

        proj = [x for x in (d.get("projects") or [])
                if plain(x.get("name")) or plain(x.get("desc"))]
        if proj:
            h = head_mm
            for x in proj:
                h += self._text_mm(x.get("name"), width_mm)
                h += self._text_mm(x.get("desc"), width_mm)
            out.append(("projects", h))

        refs = [r for r in (d.get("referees") or []) if plain(r.get("name"))]
        if refs:
            h = head_mm
            for r in refs:
                h += self._text_mm(join_dash(r.get("name"), r.get("title")), width_mm)
                h += self._line_mm()
            out.append(("referees", h))

        return out

    def _build_clinical(self) -> None:
        # The stylesheet spans the header across both columns and flows the rest
        # into two balanced ones.
        #
        # Two techniques, because no single one is right for both sizes:
        #  - A two-cell row is the only layout that shows two columns in every
        #    reader (LibreOffice and Google Docs ignore `columns: 2`), but a row
        #    cannot rebalance, so a long CV leaves one column short.
        #  - Real `w:cols` flows and rebalances, which is what a multi-page CV
        #    needs, but a short CV never fills column one and so looks like a
        #    single narrow column outside Word.
        # Short CVs therefore get the explicit split and long ones real columns.
        self.header_plain()
        col_mm = (CONTENT_MM - self.COL_GAP_MM) / 2.0
        plan = self._plan_columns(col_mm - 6.0)
        total = sum(h for _, h in plan)

        if total > self.LONG_CV_MM:
            columns_section(self.doc, 2, gap_mm=self.COL_GAP_MM)
            # Content now flows in a column, so entries must be sized to it.
            self.avail = col_mm
            self._sections()
            return

        target = total / 2.0
        left: list[str] = []
        right: list[str] = []
        running = 0.0
        for kind, height in plan:
            # Fill the left column only while adding half of the next section
            # still fits the target; everything after it flows to the right.
            if not right and running + height / 2.0 <= target:
                left.append(kind)
                running += height
            else:
                right.append(kind)

        t = self.table(1, 2, [col_mm, col_mm])
        left_cell, right_cell = t.rows[0].cells
        for cell in (left_cell, right_cell):
            cell_width(cell, col_mm)
            cell_borders(cell)
        cell_margins(left_cell, 0, self.COL_GAP_MM / 2, 0, 0)
        cell_margins(right_cell, 0, 0, 0, self.COL_GAP_MM / 2)

        prev, prev_avail = self._target, self.avail
        for cell, kinds in ((left_cell, left), (right_cell, right)):
            self._target, self.avail = cell, col_mm - 6.0
            self._sections(only=set(kinds))
        self._target, self.avail = prev, prev_avail

    # -- exact: fixed rail (photo/contact/skills) + main column ------------
    def _build_exact(self) -> None:
        p = self.d.get("personal") or {}
        rail_mm = CONTENT_MM * 0.32
        main_mm = CONTENT_MM - rail_mm
        t = self.table(1, 2, [rail_mm, main_mm])
        rail, main = t.rows[0].cells
        for cell in (rail, main):
            cell_width(cell, rail_mm if cell is rail else main_mm)
            cell_borders(cell)
            cell_margins(cell, 3, 3, 3, 3)
            cell_valign(cell, "top")
        cell_shading(rail, EXACT_RAIL)

        # --- rail: photo or initials, contact, skills
        prev, prev_avail = self._target, self.avail
        self._target, self.avail = rail, rail_mm - 6.0
        self._rail(contact_line(p), split_lines(self.d.get("skills")))
        self._target, self.avail = prev, prev_avail

        # --- main: two-tone name, role, then the body sections
        prev, prev_avail = self._target, self.avail
        self._target, self.avail = main, main_mm - 6.0
        parts = plain(p.get("fullName")).split()
        first = parts[0] if parts else "Your"
        last = " ".join(parts[1:]) if len(parts) > 1 else "Name"
        np = self.para(space_after=2)
        style_run(np.add_run(first + " "), BODY_FONT, 30, False, GRAY_900)
        style_run(np.add_run(last), BODY_FONT, 30, True, self.accent)
        if plain(p.get("title")):
            self.text(p.get("title"), size=13, bold=True, space_after=4)
        self._sections(labels={"summary": "Profile", "experience": "Work Experience",
                               "education": "Education", "referees": "Referees"})
        self._target, self.avail = prev, prev_avail
        self.spacer()

    def _rail(self, contact: str, skills: list[str]) -> None:
        p = self.d.get("personal") or {}
        blob = image_bytes(p.get("photo"))
        placed = False
        if blob:
            try:
                para = self.para(space_after=6, align=WD_ALIGN_PARAGRAPH.CENTER)
                para.add_run().add_picture(BytesIO(blob), width=Mm(29))
                placed = True
            except Exception:  # noqa: BLE001 - a corrupt image must not fail the export
                placed = False
        if not placed:
            parts = plain(p.get("fullName")).split()
            initials = ("".join(x[0] for x in parts[:2]) or "CV").upper()
            ip = self.para(space_after=6, align=WD_ALIGN_PARAGRAPH.CENTER)
            r = ip.add_run(f" {initials} ")
            style_run(r, BODY_FONT, 34, True, "FFFFFF")
            run_shading(r, self.accent)

        if contact:
            self.heading("Contact")
            for line in contact.split(" · "):
                self.text(line, size=12, space_after=1)
        if skills:
            self.heading("Skills")
            for s in skills:
                self.text(s, size=12, space_after=1)

    # -- sections (order mirrors cvToHTML / cvExactExport) -----------------
    def _sections(self, only=None, labels: dict | None = None) -> None:
        want = (lambda key: True) if only is None else (lambda key: key in only)
        label = (lambda key, dflt: (labels or {}).get(key, dflt))
        d = self.d
        p = self.d.get("personal") or {}
        exact = self.tpl == "exact"
        head = self.item_head_exact if exact else self.item_head

        if want("summary") and plain(p.get("summary")):
            self.heading(label("summary", "Summary"))
            self.body_text(p.get("summary"))

        exp = [e for e in (d.get("experience") or [])
               if plain(e.get("role")) or plain(e.get("employer"))]
        if want("experience") and exp:
            self.heading(label("experience", "Experience"))
            for e in exp:
                head(join_dash(e.get("role"), e.get("employer")),
                     date_span(e.get("start"), e.get("end")))
                self.bullets(e.get("bullets"))

        edu = [e for e in (d.get("education") or [])
               if plain(e.get("school")) or plain(e.get("qualification"))]
        if want("education") and edu:
            self.heading(label("education", "Education"))
            for e in edu:
                head(join_dash(e.get("qualification"), e.get("school")),
                     date_span(e.get("start"), e.get("end")))

        if want("skills") and split_lines(d.get("skills")) and not exact:
            self.heading(label("skills", "Skills"))
            self.skill_chips(d.get("skills"))

        proj = [x for x in (d.get("projects") or [])
                if plain(x.get("name")) or plain(x.get("desc"))]
        if want("projects") and proj:
            self.heading(label("projects", "Projects"))
            for x in proj:
                head(x.get("name"), "")
                if plain(x.get("desc")):
                    self.body_text(x.get("desc"))

        refs = [r for r in (d.get("referees") or []) if plain(r.get("name"))]
        if want("referees") and refs:
            self.heading(label("referees", "Referees"))
            for r in refs:
                self.text(join_dash(r.get("name"), r.get("title")), space_after=0)
                if plain(r.get("phone")):
                    self.text(r.get("phone"), size=self.size * 0.9,
                              color=GRAY_500, space_after=2)


def render_docx(data: dict, theme: dict | None = None, template: str = "graduate") -> bytes:
    doc = DocxRenderer(data, theme, template).build()
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()

// Fill the DE-111 template with pdf-lib. Works in the browser (PDFLib global) and in Node tests.
import { FIELDS, PEOPLE_ROWS } from "./fields.js";
import { fill, estateName, ROWS_PER_ATTACHMENT_PAGE } from "./logic.js";

const MAX_SIZE = 9;
const MIN_SIZE = 5;

// Helvetica in a PDF only covers Windows-1252, so normalize what we can and mark what we can't.
function cleaner(font, problems) {
  return (text) => {
    const plain = String(text).replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/ /g, " ").replace(/\r\n?/g, "\n");
    let out = "";
    for (const ch of plain) {
      if (ch === "\n") { out += ch; continue; }
      try { font.encodeText(ch); out += ch; } catch { out += "?"; problems.add(ch); }
    }
    return out;
  };
}

function wrap(font, text, size, width) {
  const lines = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
  }
  return lines;
}

// Largest size up to 9 pt that fits the box: one line for ordinary fields, wrapped lines for multi-line ones.
function fitSize(font, text, width, height, multiline) {
  for (let size = MAX_SIZE; size > MIN_SIZE; size -= 0.5) {
    if (!multiline) { if (font.widthOfTextAtSize(text, size) <= width - 4) return size; continue; }
    if (wrap(font, text, size, width - 4).length * size * 1.15 <= height - 2) return size;
  }
  return MIN_SIZE;
}

function setText(form, font, clean, name, value) {
  const field = form.getTextField(name);
  const text = clean(value);
  const multiline = field.isMultiline() || text.includes("\n");
  if (multiline && !field.isMultiline()) field.enableMultiline();
  const max = field.getMaxLength();
  if (max !== undefined && text.length > max) field.setMaxLength(text.length);
  field.setText(text);
  const { width, height } = field.acroField.getWidgets()[0].getRectangle();
  field.setFontSize(fitSize(font, text, width, height, multiline));
}

function caption(page, font, bold, a, title) {
  const { width, height } = page.getSize();
  page.drawText(`ESTATE OF (name): ${estateName(a)}`, { x: 36, y: height - 48, size: 9, font });
  page.drawText(`CASE NUMBER: ${a.case_number || ""}`, { x: 400, y: height - 48, size: 9, font });
  page.drawLine({ start: { x: 36, y: height - 56 }, end: { x: width - 36, y: height - 56 }, thickness: 0.75 });
  page.drawText(title, { x: 36, y: height - 78, size: 11, font: bold });
}

function addPeoplePages(doc, PDFLib, font, bold, clean, a, rows) {
  for (let start = 0; start < rows.length; start += ROWS_PER_ATTACHMENT_PAGE) {
    const page = doc.addPage([612, 792]);
    caption(page, font, bold, a, "ATTACHMENT 8 TO PETITION FOR PROBATE (DE-111): people listed in item 8, continued");
    const cols = [{ x: 36, w: 200, key: "name", head: "Name and relationship to decedent" },
      { x: 246, w: 60, key: "age", head: "Age" }, { x: 316, w: 260, key: "address", head: "Address" }];
    let y = 792 - 104;
    for (const c of cols) page.drawText(c.head, { x: c.x, y, size: 9, font: bold });
    y -= 8;
    for (const row of rows.slice(start, start + ROWS_PER_ATTACHMENT_PAGE)) {
      page.drawLine({ start: { x: 36, y }, end: { x: 576, y }, thickness: 0.5 });
      let lowest = y;
      for (const c of cols) {
        let ly = y - 11;
        for (const line of wrap(font, clean(row[c.key]), 9, c.w).slice(0, 4)) {
          page.drawText(line, { x: c.x, y: ly, size: 9, font });
          ly -= 10.5;
        }
        lowest = Math.min(lowest, ly);
      }
      y = Math.min(lowest, y - 40) - 3;
    }
    page.drawLine({ start: { x: 36, y }, end: { x: 576, y }, thickness: 0.5 });
    page.drawText(`Attachment 8, page ${start / ROWS_PER_ATTACHMENT_PAGE + 1}`, { x: 36, y: 36, size: 8, font, color: PDFLib.rgb(0.3, 0.3, 0.3) });
  }
}

function addSignaturePage(doc, font, bold, clean, a, names) {
  const page = doc.addPage([612, 792]);
  caption(page, font, bold, a, "SIGNATURES OF ADDITIONAL PETITIONERS (DE-111, item 9)");
  page.drawText("I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.",
    { x: 36, y: 792 - 104, size: 9, font });
  let y = 792 - 150;
  for (const name of names) {
    page.drawText("Date:", { x: 36, y: y + 30, size: 9, font });
    page.drawLine({ start: { x: 64, y: y + 29 }, end: { x: 200, y: y + 29 }, thickness: 0.5 });
    page.drawText(clean(name), { x: 36, y: y + 3, size: 10, font });
    page.drawLine({ start: { x: 36, y }, end: { x: 290, y }, thickness: 0.5 });
    page.drawLine({ start: { x: 330, y }, end: { x: 576, y }, thickness: 0.5 });
    page.drawText("(TYPE OR PRINT NAME OF PETITIONER)", { x: 80, y: y - 10, size: 7, font });
    page.drawText("(SIGNATURE OF PETITIONER)", { x: 400, y: y - 10, size: 7, font });
    y -= 80;
  }
}

export async function buildPdf(PDFLib, templateBytes, answers) {
  const result = fill(answers);
  const a = { ...answers };
  const doc = await PDFLib.PDFDocument.load(templateBytes);
  const form = doc.getForm();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const problems = new Set();
  const clean = cleaner(font, problems);

  for (const [key, value] of Object.entries(result.values)) {
    const name = FIELDS[key];
    if (!name) throw new Error(`No PDF field for ${key}`);
    if (value === true) form.getCheckBox(name).check();
    else setText(form, font, clean, name, value);
  }
  result.people.forEach((row, i) => {
    for (const part of ["name", "age", "address"]) if (row[part]) setText(form, font, clean, PEOPLE_ROWS[i][part], row[part]);
  });
  if (result.overflow.length) addPeoplePages(doc, PDFLib, font, bold, clean, a, result.overflow);
  if (result.extraSigners.length) addSignaturePage(doc, font, bold, clean, a, result.extraSigners);

  form.updateFieldAppearances(font);
  doc.setTitle(`DE-111 Petition for Probate - Estate of ${clean(estateName(a)) || "(name)"}`);
  doc.setProducer("DE-111 helper (pdf-lib)");
  if (problems.size) {
    result.warnings.push(`These characters can't be printed in the form's font and show as "?": ${[...problems].join(" ")}. Type them by hand on the printed form.`);
  }
  return { bytes: await doc.save(), result };
}

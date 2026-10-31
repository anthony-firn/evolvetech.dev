// Fill the DE-221 template with pdf-lib and add the attachments. Works in the browser (PDFLib global) and in Node tests.
import { FIELDS, PEOPLE_ROWS } from "./fields.js";
import { fill, estateName, amount, ROWS_PER_ATTACHMENT_PAGE } from "./logic.js";

const MAX_SIZE = 9;
const MIN_SIZE = 5;
const LEFT = 36;
const RIGHT = 576;
const PERJURY = "(All statements in this attachment are made under penalty of perjury.)";

// Helvetica in a PDF only covers Windows-1252, so normalize what we can and mark what we can't.
function cleaner(font, problems) {
  return (text) => {
    const plain = String(text).replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/ /g, " ").replace(/\r\n?/g, "\n");
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

function caption(page, font, bold, clean, a, title) {
  const { width, height } = page.getSize();
  const estate = wrap(font, clean(`ESTATE OF (name): ${estateName(a)}`), 9, 350)[0];
  page.drawText(estate, { x: LEFT, y: height - 48, size: 9, font });
  page.drawText(clean(`CASE NUMBER: ${a.case_number || ""}`), { x: 400, y: height - 48, size: 9, font });
  page.drawLine({ start: { x: LEFT, y: height - 56 }, end: { x: width - LEFT, y: height - 56 }, thickness: 0.75 });
  page.drawText(title, { x: LEFT, y: height - 78, size: 11, font: bold });
}

function footer(page, PDFLib, font, label) {
  const color = PDFLib.rgb(0.3, 0.3, 0.3);
  page.drawText(PERJURY, { x: LEFT, y: 48, size: 8, font, color });
  page.drawText(label, { x: LEFT, y: 36, size: 8, font, color });
}

// One attachment of flowing text. Blocks are { head?, text }. New pages are started as needed.
function addTextAttachment(doc, PDFLib, font, bold, clean, a, label, title, blocks) {
  let number = 0;
  let page;
  let y = 0;
  const start = () => {
    number += 1;
    page = doc.addPage([612, 792]);
    caption(page, font, bold, clean, a, number === 1 ? title : `${title} (continued)`);
    footer(page, PDFLib, font, `${label}, page ${number}`);
    y = 792 - 102;
  };
  const write = (line, face, size) => {
    if (y < 76) start();
    page.drawText(line, { x: LEFT, y, size, font: face });
    y -= size * 1.3;
  };
  start();
  for (const block of blocks) {
    if (block.head) write(clean(block.head), bold, 10);
    for (const line of wrap(font, clean(block.text), 10, RIGHT - LEFT)) write(line, font, 10);
    y -= 9;
  }
}

function addPeoplePages(doc, PDFLib, font, bold, clean, a, rows) {
  for (let start = 0; start < rows.length; start += ROWS_PER_ATTACHMENT_PAGE) {
    const page = doc.addPage([612, 792]);
    caption(page, font, bold, clean, a, "ATTACHMENT 9 TO DE-221: people listed in item 9");
    const cols = [{ x: LEFT, w: 200, key: "name", head: "Name and relationship" },
      { x: 246, w: 60, key: "age", head: "Age" }, { x: 316, w: 260, key: "address", head: "Residence or mailing address" }];
    let y = 792 - 104;
    for (const c of cols) page.drawText(c.head, { x: c.x, y, size: 9, font: bold });
    y -= 8;
    for (const row of rows.slice(start, start + ROWS_PER_ATTACHMENT_PAGE)) {
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.5 });
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
    page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.5 });
    footer(page, PDFLib, font, `Attachment 9, page ${start / ROWS_PER_ATTACHMENT_PAGE + 1}`);
  }
}

// The text blocks of Attachments 7, 7a and 7b. The page also shows these for review.
export function attachmentBlocks(result) {
  const item = ({ tag, text, interest }) => ({ head: `Item ${tag}`, text: `${text}\nInterest: ${interest}.` });
  return {
    a7: result.facts.map((text, i) => ({ text: `${i + 1}. ${text}` })),
    a7a: result.passing.map(item),
    a7b: result.confirmed.map(item),
  };
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
  const page = (label, title, blocks) => addTextAttachment(doc, PDFLib, font, bold, clean, a, label, title, blocks);

  const blocks = attachmentBlocks(result);
  if (result.passing.length || result.confirmed.length) page("Attachment 7", "ATTACHMENT 7 TO DE-221: facts supporting the petition", blocks.a7);
  if (blocks.a7a.length) page("Attachment 7a", "ATTACHMENT 7a TO DE-221: property passing to the survivor", blocks.a7a);
  if (blocks.a7b.length) page("Attachment 7b", "ATTACHMENT 7b TO DE-221: property belonging to the survivor", blocks.a7b);
  if (result.attachment9.length) addPeoplePages(doc, PDFLib, font, bold, clean, a, result.attachment9);
  if (result.trustPeople) page("Attachment 11", "ATTACHMENT 11 TO DE-221: persons interested in the trust", [{ text: result.trustPeople }]);

  // Item 13 counts everything behind page 2: the pages above plus whatever the person is adding.
  const added = doc.getPageCount() - 2 + Math.round(amount(a.extra_pages));
  if (added) result.values["13"] = String(added);

  for (const [key, value] of Object.entries(result.values)) {
    const name = FIELDS[key];
    if (!name) throw new Error(`No PDF field for ${key}`);
    if (value === true) form.getCheckBox(name).check();
    else setText(form, font, clean, name, value);
  }
  result.people.forEach((row, i) => {
    for (const part of ["name", "age", "address"]) if (row[part]) setText(form, font, clean, PEOPLE_ROWS[i][part], row[part]);
  });

  form.updateFieldAppearances(font);
  doc.setTitle(`DE-221 Spousal or Domestic Partner Property Petition - Estate of ${clean(estateName(a)) || "(name)"}`);
  doc.setProducer("DE-221 helper (pdf-lib)");
  if (problems.size) {
    result.warnings.push(`These characters can't be printed in the form's font and show as "?": ${[...problems].join(" ")}. Type them by hand on the printed form.`);
  }
  return { bytes: await doc.save(), result };
}

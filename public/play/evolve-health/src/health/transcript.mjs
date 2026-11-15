// Appointment transcripts: read the formats phone recorders and transcription tools export, and
// pull out the sentences worth a second look (medicine changes, follow-ups, tests, warnings).
// This is pattern matching, not medical advice or AI: every highlight links back to the moment in
// the recording so the person can listen to exactly what was said.

const clock = (t) => {
  const parts = t.replace(',', '.').split(':').map(Number);
  return parts.reduce((a, b) => a * 60 + b, 0);
};
const TIME = /(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?/;

export function parseTranscript(text) {
  const t = text.replace(/^﻿/, '').trim();
  if (!t) return [];
  if (/^[{[]/.test(t)) {
    try {
      const j = JSON.parse(t);
      const segs = j.segments || j.results || (Array.isArray(j) ? j : null);
      if (segs) return segs.map((s) => ({ t: Number(s.start ?? s.t ?? s.offset ?? 0), text: String(s.text ?? s.transcript ?? '').trim(), speaker: s.speaker || undefined })).filter((s) => s.text);
      if (j.text) return [{ t: 0, text: String(j.text).trim() }];
    } catch { /* fall through to plain text */ }
  }
  const cue = new RegExp(`^(${TIME.source})\\s*-->\\s*(${TIME.source})`);
  const lines = t.split(/\r?\n/);
  if (/^WEBVTT/.test(t) || lines.some((l) => cue.test(l.trim()))) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const m = cue.exec(lines[i].trim());
      if (!m) continue;
      const body = [];
      while (i + 1 < lines.length && lines[i + 1].trim()) body.push(lines[++i].trim());
      const text = body.join(' ').replace(/<[^>]+>/g, '').trim();
      const sp = /^<v\s+([^>]+)>/.exec(body[0] || '')?.[1] || /^([A-Z][\w .'-]{1,30}):\s/.exec(text)?.[1];
      if (text) out.push({ t: clock(m[1]), text: text.replace(/^([A-Z][\w .'-]{1,30}):\s/, ''), speaker: sp });
    }
    return out;
  }
  const out = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    const m = /^\[?((\d{1,2}:)?\d{1,2}:\d{2})\]?\s*[-–]?\s*(.*)$/.exec(l);
    const body = m ? m[3] : l;
    const sp = /^([A-Z][\w .'-]{1,30}):\s/.exec(body);
    out.push({ t: m ? clock(m[1]) : null, text: sp ? body.slice(sp[0].length) : body, speaker: sp?.[1] });
  }
  return out;
}

export const fmtClock = (s) => {
  if (s === null || s === undefined || Number.isNaN(s)) return '';
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

export const transcriptText = (segments) => segments.map((s) => `${s.t !== null && s.t !== undefined ? `[${fmtClock(s.t)}] ` : ''}${s.speaker ? `${s.speaker}: ` : ''}${s.text}`).join('\n');

const RULES = [
  { type: 'warning', label: 'Warning sign', re: /\b(call (us|me|the office|your doctor|911)?\s*(right away |immediately )?if|go (straight )?to the (er|emergency)|seek (medical )?(care|help)|if (it|you|the \w+|this|that|symptoms?) (get|gets|getting|start|starts) worse|doesn'?t (get|start getting) better|warning signs?|red flags?)\b/i },
  { type: 'medication', label: 'Medicine', re: /\b(\d+(\.\d+)?\s?(mg|mcg|milligrams?|micrograms?|ml|milliliters?|units?|puffs?|tablets?|pills?|capsules?|drops?)\b|(start|stop|increase|decrease|lower|raise|double|switch|refill|prescrib\w*|taper)\w*\b[^.?!]{0,60}\b(medicine|medication|meds|pill|dose|tablet|inhaler|cream|ointment|antibiotics?|prescription|\w+(pril|sartan|statin|olol|azole|cillin|cycline|mab|pine|done|zole|tidine|prazole))\b)/i },
  { type: 'followup', label: 'Follow-up', re: /\b(follow[- ]?up|come back|see (you|him|her|them) (again )?in|recheck|return in|schedule|book (a|an)|next (visit|appointment))\b/i },
  { type: 'test', label: 'Test or referral', re: /\b(blood (work|test)|labs?\b|lab work|x-?rays?|mri|ct scan|cat scan|ultrasound|biopsy|ekg|ecg|echo(cardiogram)?|mammogram|colonoscopy|urine (test|sample)|stool (test|sample)|refer(ral|ring)?|specialist|culture|swab)\b/i },
  { type: 'diagnosis', label: 'Finding', re: /\b(you have|(he|she|they) (has|have)|it looks like|it'?s (probably|likely|most likely)|diagnos\w*|consistent with|we (found|see)|the (results?|scan|x-?ray) (show|shows|came back))\b/i },
  { type: 'instruction', label: 'Instruction', re: /\b(you should|you'?ll need to|make sure|try to|avoid|don'?t|do not|keep (it|the)|apply|rest|drink (plenty|lots|more)|elevate|ice it|stretch|no (lifting|driving|alcohol|running|swimming)|until (it|the|you))\b/i },
];

function sentences(segments) {
  const out = [];
  for (const s of segments) {
    for (const part of s.text.split(/(?<=[.?!])\s+(?=[A-Z0-9"'])/)) if (part.trim().length > 3) out.push({ t: s.t, text: part.trim(), speaker: s.speaker });
  }
  return out;
}

export function highlights(segments, limit = 40) {
  const out = [];
  for (const s of sentences(segments)) {
    const rule = RULES.find((r) => r.re.test(s.text));
    if (rule) out.push({ ...s, type: rule.type, label: rule.label });
    if (out.length >= limit) break;
  }
  return out;
}

/** A follow-up interval mentioned in a sentence, as a date from `from` (YYYY-MM-DD), if any. */
export function followUpDate(text, from = new Date()) {
  const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 };
  const m = /\b(\d+|a|an|one|two|three|four|five|six|eight|ten|twelve)\s+(day|week|month|year)s?\b/i.exec(text);
  if (!m) return '';
  const n = Number(m[1]) || words[m[1].toLowerCase()];
  const d = new Date(from);
  const unit = m[2].toLowerCase();
  if (unit === 'day') d.setDate(d.getDate() + n);
  if (unit === 'week') d.setDate(d.getDate() + 7 * n);
  if (unit === 'month') d.setMonth(d.getMonth() + n);
  if (unit === 'year') d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

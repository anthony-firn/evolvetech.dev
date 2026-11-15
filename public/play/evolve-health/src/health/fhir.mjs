// FHIR R4 in and out. Exports are `collection` Bundles a clinic system can import; every resource
// is tagged as patient-provided (or imported, with its source) and the Bundle carries the purpose
// of use (treatment) and a no-redisclosure refrain, plus the id of the share it belongs to.
import { VITAL_TYPES } from './model.mjs';

const TAG = 'https://evolvetech.dev/fhir/evolve-health';
const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';
const VITALS = {
  'blood-pressure': { code: '85354-6', display: 'Blood pressure panel' },
  weight: { code: '29463-7', display: 'Body weight' },
  height: { code: '8302-2', display: 'Body height' },
  'heart-rate': { code: '8867-4', display: 'Heart rate' },
  temperature: { code: '8310-5', display: 'Body temperature' },
  glucose: { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
  oxygen: { code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' },
};
const UCUM_UNITS = { mmHg: 'mm[Hg]', lb: '[lb_av]', kg: 'kg', in: '[in_i]', cm: 'cm', 'beats/min': '/min', '°F': '[degF]', '°C': 'Cel', 'mg/dL': 'mg/dL', '%': '%' };

const uuid = () => `urn:uuid:${crypto.randomUUID()}`;
const cc = (text, codes) => (codes?.length ? { coding: codes, text } : { text });
const notes = (d) => (d.notes ? [{ text: d.notes }] : undefined);
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.+-]/g, '')); return v === '' || v === undefined || Number.isNaN(n) ? undefined : n; };
const instant = (date) => (date ? (date.length === 10 ? `${date}T12:00:00Z` : new Date(date).toISOString()) : undefined);
const pad2 = (n) => String(n).padStart(2, '0');
/** A local "YYYY-MM-DDTHH:MM" as an R4 dateTime with this device's UTC offset (no silent shift to UTC). */
function localDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const off = -d.getTimezoneOffset(), abs = Math.abs(off);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00${off >= 0 ? '+' : '-'}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}
const dateTime = (date) => (date ? (date.length <= 10 ? date : localDateTime(date)) : undefined);
const compact = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === '' || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; return o; };

function base64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function meta(r) {
  const src = r.data?.source;
  return {
    tag: [src
      ? { system: TAG, code: 'imported', display: `Imported from ${src.name || src.type}${src.verified ? ` (signature verified: ${src.issuer})` : ''}` }
      : { system: TAG, code: 'patient-entered', display: 'Entered by the patient or caregiver' }],
  };
}

function textAttachment(title, text) {
  const bytes = new TextEncoder().encode(text);
  return { contentType: 'text/plain; charset=utf-8', title, data: base64(bytes), size: bytes.length };
}

function visitText(d, transcript) {
  const parts = [];
  if (d.summary) parts.push(`What they said:\n${d.summary}`);
  if (d.instructions) parts.push(`Instructions:\n${d.instructions}`);
  if (d.followUp) parts.push(`Follow up by: ${d.followUp}`);
  if (d.questions) parts.push(`Questions for next time:\n${d.questions}`);
  if (transcript) parts.push(`Transcript (patient recording; not reviewed by the provider):\n${transcript}`);
  return parts.join('\n\n');
}

/**
 * @param {object} o
 * @param {object} o.profile profile fields (already filtered to what is shared)
 * @param {'person'|'pet'} o.kind
 * @param {Array} o.records [{rid, kind, data}]
 * @param {Map<string, {bytes: Uint8Array, type: string, name: string}>} [o.files] by record id
 * @param {object} [o.share] {id, recipient, purpose, notice}
 */
export function toBundle({ profile, kind, records, files = new Map(), share = null }) {
  const entries = [];
  const patientUrl = uuid();
  const subject = { reference: patientUrl };
  const add = (resource) => { const fullUrl = uuid(); entries.push({ fullUrl, resource }); return fullUrl; };

  const patient = compact({
    resourceType: 'Patient', meta: { tag: [{ system: TAG, code: 'patient-entered', display: 'Entered by the patient or caregiver' }] },
    name: profile.name ? [{ text: profile.name }] : undefined,
    birthDate: profile.birthDate,
    gender: { female: 'female', male: 'male', intersex: 'other', other: 'other' }[profile.sex],
    communication: profile.languages ? [{ language: { text: profile.languages }, preferred: true }] : undefined,
    identifier: [
      profile.microchip && { type: { text: 'Microchip' }, value: profile.microchip },
      profile.license && { type: { text: 'License or tag' }, value: profile.license },
    ].filter(Boolean),
    extension: kind === 'pet' ? [{
      url: 'http://hl7.org/fhir/StructureDefinition/patient-animal',
      extension: [
        { url: 'species', valueCodeableConcept: { text: profile.species || 'Animal' } },
        profile.breed && { url: 'breed', valueCodeableConcept: { text: profile.breed } },
        profile.neutered && { url: 'genderStatus', valueCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/animal-genderstatus', code: profile.neutered === 'yes' ? 'neutered' : 'intact' }] } },
      ].filter(Boolean),
    }] : undefined,
  });
  entries.push({ fullUrl: patientUrl, resource: patient });

  if (profile.bloodType) {
    add({ resourceType: 'Observation', status: 'final', meta: patient.meta, code: { coding: [{ system: LOINC, code: '882-1', display: 'ABO and Rh group [Type] in Blood' }], text: 'Blood type' }, subject, valueCodeableConcept: { text: profile.bloodType } });
  }
  for (const [field, label] of [['notes', 'Important notes'], ['diet', 'Food and feeding'], ['behavior', 'Handling and behavior'], ['organDonor', 'Organ donor']]) {
    if (profile[field]) add({ resourceType: 'Flag', status: 'active', meta: patient.meta, code: { text: `${label}: ${profile[field]}` }, subject });
  }

  for (const r of records) {
    const d = r.data || {};
    const m = meta(r);
    switch (r.kind) {
      case 'condition':
        add(compact({
          resourceType: 'Condition', meta: m, subject, code: cc(d.name, d.codes),
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: d.status === 'resolved' ? 'resolved' : 'active' }] },
          onsetDateTime: dateTime(d.onset), abatementDateTime: d.status === 'resolved' ? dateTime(d.resolved) : undefined, note: notes(d),
        }));
        break;
      case 'medication':
        add(compact({
          resourceType: 'MedicationStatement', meta: m, subject, status: d.status === 'stopped' ? 'stopped' : 'active',
          medicationCodeableConcept: cc(d.name, d.codes),
          dosage: d.dose || d.frequency || d.status === 'as-needed' ? [compact({ text: [d.dose, d.frequency].filter(Boolean).join(', ') || undefined, asNeededBoolean: d.status === 'as-needed' ? true : undefined })] : undefined,
          reasonCode: d.reason ? [{ text: d.reason }] : undefined,
          effectivePeriod: d.start || d.end ? compact({ start: dateTime(d.start), end: dateTime(d.end) }) : undefined,
          informationSource: d.prescriber ? { display: d.prescriber } : undefined,
          note: [d.notes && { text: d.notes }, d.pharmacy && { text: `Pharmacy: ${d.pharmacy}` }, d.type && d.type !== 'prescription' && { text: `Type: ${d.type}` }].filter(Boolean),
        }));
        break;
      case 'allergy': {
        const category = { medication: 'medication', food: 'food', environment: 'environment', insect: 'environment', latex: 'environment' }[d.category];
        const high = ['severe', 'life-threatening'].includes(d.severity);
        add(compact({
          resourceType: 'AllergyIntolerance', meta: m, patient: subject, code: cc(d.substance, d.codes),
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
          category: category ? [category] : undefined, criticality: d.severity ? (high ? 'high' : 'low') : undefined,
          reaction: d.reaction ? [compact({ manifestation: [{ text: d.reaction }], severity: d.severity ? (high ? 'severe' : d.severity === 'mild' ? 'mild' : 'moderate') : undefined })] : undefined,
          onsetDateTime: dateTime(d.noted), note: notes(d),
        }));
        break;
      }
      case 'immunization':
        add(compact({
          resourceType: 'Immunization', meta: m, patient: subject, status: 'completed', vaccineCode: cc(d.vaccine, d.codes),
          occurrenceDateTime: dateTime(d.date) || undefined, occurrenceString: d.date ? undefined : 'Date not recorded',
          lotNumber: d.lot, performer: d.givenBy ? [{ actor: { display: d.givenBy } }] : undefined,
          protocolApplied: d.dose ? [{ doseNumberString: String(d.dose) }] : undefined,
          note: [d.notes && { text: d.notes }, d.due && { text: `Next due: ${d.due}` }, d.tag && { text: `Tag number: ${d.tag}` }].filter(Boolean),
        }));
        break;
      case 'result': {
        const value = num(d.value);
        const interp = { high: 'H', low: 'L', abnormal: 'A', normal: 'N' }[d.flag];
        add(compact({
          resourceType: 'Observation', meta: m, subject, status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
          code: cc(d.test, d.codes), effectiveDateTime: dateTime(d.date),
          valueQuantity: value !== undefined && /^[\s\d.+-]+$/.test(String(d.value)) ? compact({ value, unit: d.unit }) : undefined,
          valueString: value === undefined || !/^[\s\d.+-]+$/.test(String(d.value)) ? (d.value ? `${d.value}${d.unit ? ` ${d.unit}` : ''}` : undefined) : undefined,
          referenceRange: d.range ? [{ text: d.range }] : undefined,
          interpretation: interp ? [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: interp }] }] : undefined,
          performer: d.orderedBy ? [{ display: d.orderedBy }] : undefined, note: notes(d),
        }));
        break;
      }
      case 'vital': {
        const v = VITALS[d.type] || { display: d.type };
        const unit = d.unit || VITAL_TYPES.find((x) => x.value === d.type)?.unit || '';
        const q = (value) => compact({ value: num(value), unit, system: UCUM_UNITS[unit] ? UCUM : undefined, code: UCUM_UNITS[unit] });
        add(compact({
          resourceType: 'Observation', meta: m, subject, status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: v.code ? { coding: [{ system: LOINC, code: v.code, display: v.display }], text: v.display } : { text: v.display },
          effectiveDateTime: dateTime(d.date),
          valueQuantity: d.type === 'blood-pressure' ? undefined : q(d.value),
          component: d.type === 'blood-pressure' ? [
            { code: { coding: [{ system: LOINC, code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: q(d.value) },
            { code: { coding: [{ system: LOINC, code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: q(d.value2) },
          ] : undefined,
          note: notes(d),
        }));
        break;
      }
      case 'visit': {
        const enc = add(compact({
          resourceType: 'Encounter', meta: m, subject,
          status: { planned: 'planned', cancelled: 'cancelled' }[d.status] || 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: d.type === 'Telehealth' ? 'VR' : 'AMB', display: d.type === 'Telehealth' ? 'virtual' : 'ambulatory' },
          type: d.type ? [{ text: d.type }] : undefined, period: d.date ? { start: dateTime(d.date) } : undefined,
          reasonCode: d.reason ? [{ text: d.reason }] : undefined,
          participant: d.provider ? [{ individual: { display: d.provider } }] : undefined,
        }));
        const text = visitText(d, files.get(`${r.rid}#transcript`)?.text);
        if (text) {
          add({
            resourceType: 'DocumentReference', meta: m, status: 'current', subject,
            type: { text: 'Patient-recorded visit notes' }, date: instant(d.date) || new Date().toISOString(),
            description: `Notes from ${d.type || 'appointment'}${d.provider ? ` with ${d.provider}` : ''}`,
            content: [{ attachment: textAttachment('Visit notes', text) }], context: { encounter: [{ reference: enc }] },
          });
        }
        const audio = files.get(`${r.rid}#audio`);
        if (audio) {
          add({
            resourceType: 'DocumentReference', meta: m, status: 'current', subject, type: { text: 'Patient recording of an appointment' },
            date: instant(d.date) || new Date().toISOString(), description: 'Audio recorded by the patient with everyone’s consent',
            content: [{ attachment: { contentType: audio.type, title: audio.name, data: base64(audio.bytes), size: audio.bytes.length } }],
            context: { encounter: [{ reference: enc }] },
          });
        }
        break;
      }
      case 'procedure':
        add(compact({
          resourceType: 'Procedure', meta: m, subject, status: 'completed', code: cc(d.name, d.codes),
          category: d.type ? { text: d.type } : undefined, performedDateTime: dateTime(d.date),
          performer: d.provider ? [{ actor: { display: d.provider } }] : undefined, bodySite: d.site ? [{ text: d.site }] : undefined, note: notes(d),
        }));
        break;
      case 'vision': {
        const lens = (eye, p) => compact({
          product: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/ex-visionprescriptionproduct', code: d.type === 'contacts' ? 'contact' : 'lens' }] },
          eye, sphere: num(d[`${p}Sph`]), cylinder: num(d[`${p}Cyl`]), axis: num(d[`${p}Axis`]) !== undefined ? Math.round(num(d[`${p}Axis`])) : undefined, add: num(d[`${p}Add`]),
        });
        add(compact({
          resourceType: 'VisionPrescription', meta: m, status: 'active', created: dateTime(d.date) || new Date().toISOString().slice(0, 10),
          patient: subject, dateWritten: dateTime(d.date) || new Date().toISOString().slice(0, 10), prescriber: { display: d.provider || 'Not recorded' },
          lensSpecification: [lens('right', 'od'), lens('left', 'os')],
        }));
        break;
      }
      case 'document': {
        const file = files.get(r.rid);
        add(compact({
          resourceType: 'DocumentReference', meta: m, status: 'current', subject, type: { text: d.type || 'Document' },
          date: instant(d.date), description: d.title, author: d.provider ? [{ display: d.provider }] : undefined,
          content: [{ attachment: compact({ contentType: file?.type || d.file?.type || 'application/octet-stream', title: d.file?.name || d.title, data: file ? base64(file.bytes) : undefined, size: d.file?.size }) }],
        }));
        break;
      }
      case 'provider': {
        const pract = add(compact({
          resourceType: 'Practitioner', meta: m, name: [{ text: d.name }],
          telecom: [d.phone && { system: 'phone', value: d.phone }, d.email && { system: 'email', value: d.email }, d.portal && { system: 'url', value: d.portal }].filter(Boolean),
          address: d.address ? [{ text: d.address }] : undefined,
        }));
        add(compact({
          resourceType: 'PractitionerRole', meta: m, active: d.current !== 'no', practitioner: { reference: pract, display: d.name },
          organization: d.organization ? { display: d.organization } : undefined, code: d.role ? [{ text: d.role }] : undefined,
        }));
        break;
      }
      case 'insurance':
        add(compact({
          resourceType: 'Coverage', meta: m, status: 'active', type: d.type ? { text: d.type } : undefined, subscriberId: d.member,
          policyHolder: d.holder ? { display: d.holder } : undefined, beneficiary: subject, payor: [{ display: d.carrier || 'Not recorded' }],
          class: [
            d.group && { type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'group' }] }, value: d.group },
            d.plan && { type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'plan' }] }, value: d.plan },
          ].filter(Boolean),
        }));
        break;
      case 'family':
        add(compact({
          resourceType: 'FamilyMemberHistory', meta: m, status: 'completed', patient: subject, relationship: { text: d.relation },
          condition: [compact({ code: { text: d.condition }, onsetAge: num(d.age) !== undefined ? { value: num(d.age), unit: 'a', system: UCUM, code: 'a' } : undefined })],
          note: notes(d),
        }));
        break;
      case 'contact':
        add(compact({
          resourceType: 'RelatedPerson', meta: m, patient: subject, relationship: d.relation ? [{ text: d.relation }] : undefined, name: [{ text: d.name }],
          telecom: [d.phone && { system: 'phone', value: d.phone }, d.email && { system: 'email', value: d.email }].filter(Boolean),
        }));
        break;
      case 'note':
        add(compact({
          resourceType: 'DocumentReference', meta: m, status: 'current', subject, type: { text: 'Patient journal note' }, date: instant(d.date),
          description: d.title, content: [{ attachment: textAttachment(d.title || 'Note', d.body || '') }],
        }));
        break;
      default:
        break;
    }
  }

  const resources = entries.filter((e) => e.fullUrl !== patientUrl);
  if (resources.length) {
    add({
      resourceType: 'Provenance', target: resources.map((e) => ({ reference: e.fullUrl })), recorded: new Date().toISOString(),
      agent: [{ type: { text: 'Patient-provided' }, who: { reference: patientUrl } }],
    });
  }

  return compact({
    resourceType: 'Bundle', type: 'collection', timestamp: new Date().toISOString(),
    meta: share ? {
      tag: [{ system: `${TAG}/share`, code: share.id, display: `Shared for ${share.recipient || 'a professional'}${share.purpose ? `: ${share.purpose}` : ''}` }],
      security: [
        { system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'TREAT', display: 'treatment' },
        { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'NORDSCLCD', display: 'no redisclosure without consent directive' },
      ],
    } : undefined,
    entry: entries,
  });
}

// ---------------------------------------------------------------- import

// Common CVX vaccine codes, for cards and exports that carry only the code (SMART Health Cards do).
const CVX = {
  '03': 'MMR', '08': 'Hepatitis B (pediatric)', 10: 'Polio (IPV)', 20: 'DTaP', 21: 'Chickenpox (varicella)', 33: 'Pneumococcal polysaccharide (PPSV23)',
  43: 'Hepatitis B (adult)', 52: 'Hepatitis A (adult)', 62: 'HPV (quadrivalent)', 83: 'Hepatitis A (pediatric)', 88: 'Influenza (flu)',
  113: 'Td (tetanus, diphtheria)', 115: 'Tdap (tetanus, diphtheria, pertussis)', 121: 'Shingles (live)', 133: 'Pneumococcal conjugate (PCV13)',
  140: 'Influenza (flu)', 141: 'Influenza (flu)', 150: 'Influenza (flu)', 158: 'Influenza (flu)', 161: 'Influenza (flu)', 165: 'HPV (9-valent)',
  171: 'Influenza (flu)', 185: 'Influenza (flu)', 186: 'Influenza (flu)', 187: 'Shingles (recombinant)', 197: 'Influenza (flu, high dose)',
  205: 'Influenza (flu, adjuvanted)', 207: 'COVID-19 (Moderna)', 208: 'COVID-19 (Pfizer-BioNTech)', 210: 'COVID-19 (AstraZeneca)',
  211: 'COVID-19 (Novavax)', 212: 'COVID-19 (Janssen)', 213: 'COVID-19', 215: 'Pneumococcal conjugate (PCV15)', 216: 'Pneumococcal conjugate (PCV20)',
  217: 'COVID-19 (Pfizer-BioNTech)', 218: 'COVID-19 (Pfizer-BioNTech)', 219: 'COVID-19 (Pfizer-BioNTech)', 221: 'COVID-19 (Moderna)',
  229: 'COVID-19, bivalent (Moderna)', 300: 'COVID-19, bivalent (Pfizer-BioNTech)',
};
const vaccineName = (c) => {
  const cvx = c?.coding?.find((x) => x.system === 'http://hl7.org/fhir/sid/cvx')?.code;
  const text = c?.text || c?.coding?.find((x) => x.display)?.display;
  return text || (cvx && (CVX[cvx] || CVX[Number(cvx)])) || (cvx ? `Vaccine (CVX ${cvx})` : '');
};

const ccText = (c) => c?.text || c?.coding?.find((x) => x.display)?.display || c?.coding?.[0]?.code || '';
const codes = (c) => (c?.coding || []).filter((x) => x.system && x.code).map(({ system, code, display }) => compact({ system, code, display }));
const day = (v) => (typeof v === 'string' ? v.slice(0, 10) : '');
function stamp(v) {
  if (typeof v !== 'string' || !v) return '';
  if (v.length <= 10) return `${v.slice(0, 10)}T09:00`;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(v)) return v.slice(0, 16);
  const d = new Date(v); // back to this device's local time for the form field
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
const nameText = (n) => (Array.isArray(n) ? n[0] : n) && ((Array.isArray(n) ? n[0] : n).text || [...((Array.isArray(n) ? n[0] : n).given || []), (Array.isArray(n) ? n[0] : n).family].filter(Boolean).join(' '));
const phone = (t) => t?.find((x) => x.system === 'phone')?.value || '';
const email = (t) => t?.find((x) => x.system === 'email')?.value || '';
const noteText = (n) => (n || []).map((x) => x.text).filter(Boolean).join('\n');

function decodeBase64(data) {
  const bin = atob(data.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Undo visitText(): the sections Evolve Health writes into a visit-notes document. */
function parseVisitText(text) {
  const out = {};
  const grab = (label) => new RegExp(`(?:^|\\n\\n)${label}:\\n?([\\s\\S]*?)(?=\\n\\n(?:What they said|Instructions|Follow up by|Questions for next time|Transcript)\\b|$)`).exec(text)?.[1]?.trim();
  const summary = grab('What they said'), instructions = grab('Instructions'), questions = grab('Questions for next time');
  const follow = /(?:^|\n)Follow up by: (\d{4}-\d{2}-\d{2})/.exec(text)?.[1];
  const transcript = grab('Transcript \\([^)]*\\)');
  if (summary) out.summary = summary;
  if (instructions) out.instructions = instructions;
  if (questions) out.questions = questions;
  if (follow) out.followUp = follow;
  if (transcript) out.transcript = transcript.split('\n').filter(Boolean).map((line) => ({ t: null, text: line }));
  return out;
}

/** Parse JSON, NDJSON, a Bundle, a single resource or an array of resources into resources. */
export function resourcesFrom(text) {
  const trimmed = text.trim();
  let values;
  try { values = [JSON.parse(trimmed)]; } catch {
    values = trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  }
  const out = [];
  const walk = (v, fullUrl) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v?.resourceType === 'Bundle') (v.entry || []).forEach((e) => e.resource && walk(e.resource, e.fullUrl));
    else if (v?.resourceType) out.push(fullUrl ? Object.defineProperty({ ...v }, '__fullUrl', { value: fullUrl, enumerable: false }) : v);
  };
  values.forEach(walk);
  return out;
}

/**
 * Map FHIR resources to records. Returns { profile, records: [{kind, data, file?}], skipped: {type: n} }.
 * `file` carries attachment bytes for the caller to encrypt and store.
 */
export function fromResources(resources, source) {
  const byRef = new Map();
  for (const r of resources) {
    if (r.id) byRef.set(`${r.resourceType}/${r.id}`, r);
    if (r.__fullUrl) byRef.set(r.__fullUrl, r);
  }
  const resolve = (ref) => (ref?.reference ? byRef.get(ref.reference) || byRef.get(ref.reference.replace(/^.*\/(\w+\/[^/]+)$/, '$1')) : null);
  const visitFor = new Map(); // Encounter resource -> visit record data
  const textOf = (att) => (att?.data ? new TextDecoder().decode(decodeBase64(att.data)) : '');
  const records = [];
  const skipped = {};
  const profile = {};
  const push = (kind, data, file) => records.push({ kind, data: compact({ ...data, source }), file });
  const vitalFor = Object.fromEntries(Object.entries(VITALS).map(([k, v]) => [v.code, k]));
  Object.assign(vitalFor, { '8480-6': 'blood-pressure', '55284-4': 'blood-pressure', '3141-9': 'weight', '2708-6': 'oxygen', '8310-5': 'temperature' });

  const ordered = [...resources.filter((r) => r.resourceType !== 'DocumentReference'), ...resources.filter((r) => r.resourceType === 'DocumentReference')];
  for (const r of ordered) {
    switch (r.resourceType) {
      case 'Patient': {
        profile.name = nameText(r.name) || profile.name;
        if (r.birthDate) profile.birthDate = r.birthDate;
        if (r.gender) profile.sex = { female: 'female', male: 'male', other: 'other' }[r.gender] || '';
        const animal = r.extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-animal');
        if (animal) {
          profile.species = ccText(animal.extension?.find((e) => e.url === 'species')?.valueCodeableConcept);
          profile.breed = ccText(animal.extension?.find((e) => e.url === 'breed')?.valueCodeableConcept);
        }
        break;
      }
      case 'Condition': {
        const status = r.clinicalStatus?.coding?.[0]?.code;
        push('condition', { name: ccText(r.code), codes: codes(r.code), status: ['inactive', 'remission', 'resolved'].includes(status) ? 'resolved' : 'active', onset: day(r.onsetDateTime || r.onsetPeriod?.start || r.recordedDate), resolved: day(r.abatementDateTime), notes: noteText(r.note) });
        break;
      }
      case 'MedicationStatement':
      case 'MedicationRequest': {
        const med = r.medicationCodeableConcept || resolve(r.medicationReference)?.code;
        const dosage = r.dosage?.[0] || r.dosageInstruction?.[0];
        const status = ['stopped', 'completed', 'entered-in-error', 'cancelled'].includes(r.status) ? 'stopped' : dosage?.asNeededBoolean ? 'as-needed' : 'active';
        push('medication', {
          name: ccText(med) || r.medicationReference?.display, codes: codes(med), dose: dosage?.text || '', status,
          start: day(r.effectivePeriod?.start || r.effectiveDateTime || r.authoredOn), end: day(r.effectivePeriod?.end),
          reason: ccText(r.reasonCode?.[0]), prescriber: r.requester?.display || r.informationSource?.display || '', notes: noteText(r.note),
        });
        break;
      }
      case 'AllergyIntolerance': {
        const sev = r.reaction?.[0]?.severity;
        push('allergy', {
          substance: ccText(r.code), codes: codes(r.code), category: { medication: 'medication', food: 'food', environment: 'environment', biologic: 'other' }[r.category?.[0]] || 'other',
          reaction: ccText(r.reaction?.[0]?.manifestation?.[0]), severity: sev || (r.criticality === 'high' ? 'severe' : 'moderate'),
          noted: day(r.onsetDateTime || r.recordedDate), notes: noteText(r.note),
        });
        break;
      }
      case 'Immunization':
        if (r.status === 'not-done' || r.status === 'entered-in-error') { skipped['Immunization (not given)'] = (skipped['Immunization (not given)'] || 0) + 1; break; }
        push('immunization', {
          vaccine: vaccineName(r.vaccineCode), codes: codes(r.vaccineCode), date: day(r.occurrenceDateTime), lot: r.lotNumber,
          givenBy: r.performer?.[0]?.actor?.display || '', dose: r.protocolApplied?.[0]?.doseNumberPositiveInt ?? r.protocolApplied?.[0]?.doseNumberString ?? '', notes: noteText(r.note),
        });
        break;
      case 'Observation': {
        const cat = r.category?.flatMap((c) => c.coding || []).map((c) => c.code) || [];
        const code = r.code?.coding?.find((c) => c.system === LOINC)?.code;
        if (code === '882-1' || code === '883-9') { profile.bloodType = ccText(r.valueCodeableConcept) || r.valueString || ''; break; }
        const vitalType = vitalFor[code];
        if (cat.includes('vital-signs') || vitalType) {
          if (!vitalType) { skipped['Observation (other vital sign)'] = (skipped['Observation (other vital sign)'] || 0) + 1; break; }
          const comp = (c) => r.component?.find((x) => x.code?.coding?.some((y) => y.code === c))?.valueQuantity;
          const sys = comp('8480-6'), dia = comp('8462-4');
          const q = r.valueQuantity || sys;
          push('vital', { type: vitalType, value: q?.value, value2: dia?.value, unit: q?.unit || '', date: day(r.effectiveDateTime || r.effectivePeriod?.start || r.issued), notes: noteText(r.note) });
          break;
        }
        const interp = r.interpretation?.[0]?.coding?.[0]?.code;
        const range = r.referenceRange?.[0];
        push('result', {
          test: ccText(r.code), codes: codes(r.code),
          value: r.valueQuantity?.value ?? r.valueString ?? ccText(r.valueCodeableConcept) ?? '', unit: r.valueQuantity?.unit || '',
          range: range?.text || (range?.low || range?.high ? `${range.low?.value ?? ''}–${range.high?.value ?? ''}` : ''),
          flag: { H: 'high', HH: 'high', L: 'low', LL: 'low', A: 'abnormal', AA: 'abnormal', N: 'normal' }[interp] || 'normal',
          date: day(r.effectiveDateTime || r.effectivePeriod?.start || r.issued), notes: noteText(r.note),
        });
        break;
      }
      case 'Encounter':
        visitFor.set(r, records.length);
        push('visit', {
          date: stamp(r.period?.start), type: ccText(r.type?.[0]) || ccText(r.serviceType) || 'Appointment',
          status: { planned: 'planned', arrived: 'planned', cancelled: 'cancelled' }[r.status] || 'finished',
          reason: ccText(r.reasonCode?.[0]), provider: r.participant?.find((p) => p.individual?.display)?.individual.display || r.serviceProvider?.display || '',
        });
        break;
      case 'Procedure':
        push('procedure', {
          name: ccText(r.code), codes: codes(r.code), date: day(r.performedDateTime || r.performedPeriod?.start), type: 'other',
          provider: r.performer?.[0]?.actor?.display || '', site: ccText(r.bodySite?.[0]), notes: noteText(r.note),
        });
        break;
      case 'DocumentReference':
      case 'DiagnosticReport': {
        const att = r.content?.[0]?.attachment || r.presentedForm?.[0];
        const encounter = resolve(r.context?.encounter?.[0]);
        if (r.type?.text === 'Patient-recorded visit notes' && visitFor.has(encounter)) {
          Object.assign(records[visitFor.get(encounter)].data, parseVisitText(textOf(att)));
          break;
        }
        if (r.type?.text === 'Patient journal note') {
          push('note', { title: r.description || 'Note', date: day(r.date), body: textOf(att) });
          break;
        }
        if (r.resourceType === 'DiagnosticReport' && !att) { skipped['DiagnosticReport (results imported separately)'] = (skipped['DiagnosticReport (results imported separately)'] || 0) + 1; break; }
        const file = att?.data ? { bytes: decodeBase64(att.data), type: att.contentType || 'application/octet-stream', name: att.title || 'document' } : undefined;
        push('document', {
          title: r.description || att?.title || ccText(r.type) || ccText(r.code) || 'Document', type: ccText(r.type) || ccText(r.code) || 'Other',
          date: day(r.date || r.effectiveDateTime || r.issued), provider: r.author?.[0]?.display || r.performer?.[0]?.display || '',
          notes: att?.url ? `Original file: ${att.url}` : '',
        }, file);
        break;
      }
      case 'Practitioner':
      case 'Organization':
        push('provider', {
          name: r.resourceType === 'Organization' ? r.name : nameText(r.name), role: r.resourceType === 'Organization' ? 'Other' : 'Specialist',
          phone: phone(r.telecom), email: email(r.telecom), address: r.address?.[0]?.text || [r.address?.[0]?.line?.join(', '), r.address?.[0]?.city, r.address?.[0]?.state].filter(Boolean).join(', '),
        });
        break;
      case 'Coverage':
        push('insurance', {
          carrier: r.payor?.[0]?.display || 'Insurance', type: /dent/i.test(ccText(r.type)) ? 'dental' : /vision/i.test(ccText(r.type)) ? 'vision' : 'medical',
          member: r.subscriberId || r.identifier?.[0]?.value || '', group: r.class?.find((c) => c.type?.coding?.[0]?.code === 'group')?.value || '',
          plan: r.class?.find((c) => c.type?.coding?.[0]?.code === 'plan')?.value || '',
        });
        break;
      case 'FamilyMemberHistory':
        for (const c of r.condition?.length ? r.condition : [{}]) push('family', { relation: ccText(r.relationship) || r.name || 'Relative', condition: ccText(c.code) || 'Not recorded', age: c.onsetAge?.value });
        break;
      case 'RelatedPerson':
        push('contact', { name: nameText(r.name) || 'Contact', relation: ccText(r.relationship?.[0]), phone: phone(r.telecom), email: email(r.telecom) });
        break;
      case 'VisionPrescription': {
        const l = (eye) => r.lensSpecification?.find((x) => x.eye === eye) || {};
        const s = (v) => (v === undefined ? '' : String(v));
        const R = l('right'), L = l('left');
        push('vision', {
          type: R.product?.coding?.[0]?.code === 'contact' ? 'contacts' : 'glasses', date: day(r.dateWritten || r.created), provider: r.prescriber?.display || '',
          odSph: s(R.sphere), odCyl: s(R.cylinder), odAxis: s(R.axis), odAdd: s(R.add), osSph: s(L.sphere), osCyl: s(L.cylinder), osAxis: s(L.axis), osAdd: s(L.add),
        });
        break;
      }
      case 'Provenance': case 'Composition': case 'Medication': case 'PractitionerRole': case 'Flag':
        break;
      default:
        skipped[r.resourceType] = (skipped[r.resourceType] || 0) + 1;
    }
  }
  return { profile, records: records.filter((x) => Object.entries(x.data).some(([k, v]) => k !== 'status' && typeof v === 'string' && v.trim())), skipped };
}

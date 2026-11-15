// C-CDA (the "Download my record" XML most US patient portals offer, e.g. MyChart). Reads the
// common sections into records; anything it cannot map stays in the original file, which is kept
// as a document alongside the import.
import { parseXml } from './xml.mjs';

const SECTIONS = {
  '48765-2': 'allergy', '10160-0': 'medication', '11450-4': 'condition', '11369-6': 'immunization',
  '30954-2': 'result', '8716-3': 'vital', '47519-4': 'procedure', '46240-8': 'visit', '10157-6': 'family', '48768-6': 'insurance',
};
const VITAL_CODES = { '29463-7': 'weight', '3141-9': 'weight', '8302-2': 'height', '8867-4': 'heart-rate', '8310-5': 'temperature', '59408-5': 'oxygen', '2708-6': 'oxygen', '2339-0': 'glucose' };
const UNITS = { kg: 'kg', '[lb_av]': 'lb', cm: 'cm', '[in_i]': 'in', '/min': 'beats/min', Cel: '°C', '[degF]': '°F', '%': '%', 'mm[Hg]': 'mmHg', 'mg/dL': 'mg/dL' };

const ts = (v) => (v && /^\d{8}/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : '');
const tsTime = (v) => (v && /^\d{12}/.test(v) ? `${ts(v)}T${v.slice(8, 10)}:${v.slice(10, 12)}` : ts(v) ? `${ts(v)}T09:00` : '');

function narrative(section) {
  const ids = new Map();
  const walk = (n) => { if (n.attrs.ID) ids.set(n.attrs.ID, n.textContent); n.children.forEach(walk); };
  const text = section.one('text');
  if (text) walk(text);
  return ids;
}

function codeText(node, ids) {
  if (!node) return '';
  const original = node.one('originalText');
  const ref = original?.one('reference')?.attr('value');
  return node.attr('displayName') || (ref && ids.get(ref.replace(/^#/, ''))) || original?.textContent || node.one('translation')?.attr('displayName') || '';
}
const codeList = (node) => (node?.attr('code') && node.attr('codeSystem') ? [{ system: systemUri(node.attr('codeSystem')), code: node.attr('code'), display: node.attr('displayName') || undefined }] : []);
function systemUri(oid) {
  return { '2.16.840.1.113883.6.1': 'http://loinc.org', '2.16.840.1.113883.6.96': 'http://snomed.info/sct', '2.16.840.1.113883.6.88': 'http://www.nlm.nih.gov/research/umls/rxnorm', '2.16.840.1.113883.12.292': 'http://hl7.org/fhir/sid/cvx', '2.16.840.1.113883.6.90': 'http://hl7.org/fhir/sid/icd-10-cm' }[oid] || `urn:oid:${oid}`;
}
const low = (n) => n?.one('effectiveTime/low')?.attr('value') || n?.one('effectiveTime')?.attr('value') || '';
const high = (n) => n?.one('effectiveTime/high')?.attr('value') || '';

/** CPT evaluation-and-management descriptions run to a paragraph; show the kind of visit. */
function visitType(code, ids) {
  const c = Number(code?.attr('code'));
  if (c >= 99202 && c <= 99215) return 'Office visit';
  if (c >= 99281 && c <= 99285) return 'Emergency room';
  if (c >= 99221 && c <= 99239) return 'Hospital stay';
  if (c >= 99241 && c <= 99245) return 'Consultation';
  if (c >= 99381 && c <= 99397) return 'Preventive check-up';
  const text = codeText(code, ids) || 'Appointment';
  return text.length > 60 ? `${text.slice(0, 57).replace(/[\s,]+\S*$/, '')}…` : text;
}

export function looksLikeCcda(text) { return /<ClinicalDocument[\s>]/.test(text.slice(0, 4000)) || /urn:hl7-org:v3/.test(text.slice(0, 4000)); }

export function fromCcda(text, source) {
  const doc = parseXml(text).one('ClinicalDocument');
  if (!doc) throw new Error('This is not a C-CDA document');
  const profile = {};
  const patient = doc.one('recordTarget/patientRole/patient');
  if (patient) {
    const name = patient.one('name');
    profile.name = name ? [...name.all('given').map((g) => g.textContent), name.one('family')?.textContent].filter(Boolean).join(' ') : '';
    profile.birthDate = ts(patient.one('birthTime')?.attr('value'));
    profile.sex = { F: 'female', M: 'male' }[patient.one('administrativeGenderCode')?.attr('code')] || '';
  }
  const records = [];
  const push = (kind, data) => records.push({ kind, data: { ...data, source } });
  const sections = doc.findAll('section');
  for (const section of sections) {
    const kind = SECTIONS[section.one('code')?.attr('code')];
    if (!kind || section.attr('nullFlavor')) continue;
    const ids = narrative(section);
    for (const entry of section.all('entry')) {
      const main = entry.children[0];
      if (!main || main.attr('negationInd') === 'true') continue;
      if (kind === 'allergy') {
        const obs = main.name === 'observation' ? main : main.find('observation');
        if (!obs || obs.attr('negationInd') === 'true') continue;
        const entity = obs.find('playingEntity');
        const reaction = obs.all('entryRelationship/observation').find((o) => o.find('templateId', (t) => t.attr('root') === '2.16.840.1.113883.10.20.22.4.9'));
        const severity = obs.find('templateId', (t) => t.attr('root') === '2.16.840.1.113883.10.20.22.4.8')?.parent.one('value');
        const substance = codeText(entity?.one('code'), ids) || entity?.one('name')?.textContent || codeText(obs.one('value'), ids);
        // "No known allergies" and generic placeholders are not allergies.
        if (!substance || /^(substance|no known|nka|nkda)/i.test(substance) || ['105590001', '716186003', '409137002'].includes(entity?.one('code')?.attr('code'))) continue;
        const typeCode = obs.one('value')?.attr('code');
        const cat = ({ '416098002': 'drug', '419511003': 'drug', '59037007': 'drug', '414285001': 'food', '418471000': 'food', '235719002': 'food', '426232007': 'environment', '418038007': 'environment' }[typeCode]) || (obs.one('value')?.attr('displayName') || '').toLowerCase();
        push('allergy', {
          substance, codes: codeList(entity?.one('code')), reaction: codeText(reaction?.one('value'), ids),
          severity: /life/i.test(codeText(severity, ids)) ? 'life-threatening' : /severe/i.test(codeText(severity, ids)) ? 'severe' : /mild/i.test(codeText(severity, ids)) ? 'mild' : 'moderate',
          category: /food/.test(cat) ? 'food' : /drug|medication/.test(cat) || entity?.one('code')?.attr('codeSystem') === '2.16.840.1.113883.6.88' ? 'medication' : /environment/.test(cat) ? 'environment' : 'other',
          noted: ts(low(obs)),
        });
      } else if (kind === 'medication') {
        const sa = main.name === 'substanceAdministration' ? main : main.find('substanceAdministration');
        const material = sa?.find('manufacturedMaterial');
        const name = codeText(material?.one('code'), ids) || material?.one('name')?.textContent;
        if (!name) continue;
        const dose = sa.one('doseQuantity');
        const stopped = high(sa) && new Date(ts(high(sa))) < new Date() || sa.one('statusCode')?.attr('code') === 'completed';
        push('medication', { name, codes: codeList(material?.one('code')), dose: dose?.attr('value') ? (dose.attr('unit') && dose.attr('unit') !== '1' ? `${dose.attr('value')} ${dose.attr('unit')}` : `${dose.attr('value')} per dose`) : '', start: ts(low(sa)), end: ts(high(sa)), status: stopped ? 'stopped' : 'active' });
      } else if (kind === 'condition') {
        const obs = main.name === 'observation' ? main : main.find('observation');
        if (obs?.attr('negationInd') === 'true') continue;
        const name = codeText(obs?.one('value'), ids);
        if (!name) continue;
        push('condition', { name, codes: codeList(obs.one('value')), onset: ts(low(obs)), resolved: ts(high(obs)), status: high(obs) ? 'resolved' : 'active' });
      } else if (kind === 'immunization') {
        const sa = main.name === 'substanceAdministration' ? main : main.find('substanceAdministration');
        const material = sa?.find('manufacturedMaterial');
        const vaccine = codeText(material?.one('code'), ids);
        if (!vaccine) continue;
        push('immunization', { vaccine, codes: codeList(material.one('code')), date: ts(low(sa)), lot: material.one('lotNumberText')?.textContent || '' });
      } else if (kind === 'result' || kind === 'vital') {
        const observations = main.name === 'organizer' ? main.all('component/observation') : [main.name === 'observation' ? main : main.find('observation')].filter(Boolean);
        if (kind === 'vital') {
          const byCode = new Map(observations.map((o) => [o.one('code')?.attr('code'), o]));
          const sys = byCode.get('8480-6'), dia = byCode.get('8462-4');
          if (sys) push('vital', { type: 'blood-pressure', value: Number(sys.one('value')?.attr('value')), value2: Number(dia?.one('value')?.attr('value')), unit: 'mmHg', date: ts(low(sys) || low(main)) });
          for (const [code, o] of byCode) {
            const type = VITAL_CODES[code];
            const v = o.one('value');
            if (!type || !v?.attr('value')) continue;
            push('vital', { type, value: Number(v.attr('value')), unit: UNITS[v.attr('unit')] || v.attr('unit') || '', date: ts(low(o) || low(main)) });
          }
          continue;
        }
        for (const o of observations) {
          const test = codeText(o.one('code'), ids);
          if (!test) continue;
          const v = o.one('value');
          if (!v || (v.attr('nullFlavor') && !v.textContent)) continue; // ordered but no result value
          const flag = { H: 'high', HH: 'high', L: 'low', LL: 'low', A: 'abnormal', N: 'normal' }[o.one('interpretationCode')?.attr('code')] || 'normal';
          push('result', {
            test, codes: codeList(o.one('code')), value: v?.attr('value') ?? (codeText(v, ids) || v?.textContent || ''), unit: v?.attr('unit') && v.attr('unit') !== '1' ? v.attr('unit') : '',
            range: o.find('observationRange')?.one('text')?.textContent || '', flag, date: ts(low(o) || low(main)),
          });
        }
      } else if (kind === 'procedure') {
        const name = codeText(main.one('code'), ids);
        if (!name) continue;
        push('procedure', { name, codes: codeList(main.one('code')), date: ts(low(main)), type: 'other' });
      } else if (kind === 'visit') {
        const enc = main.name === 'encounter' ? main : main.find('encounter');
        if (!enc) continue;
        const person = enc.find('assignedPerson')?.one('name');
        push('visit', {
          date: tsTime(low(enc)), type: visitType(enc.one('code'), ids), status: 'finished',
          provider: person ? [...person.all('prefix'), ...person.all('given'), person.one('family')].filter(Boolean).map((n) => n.textContent).join(' ') : enc.find('representedOrganization')?.one('name')?.textContent || '',
          reason: codeText(enc.find('entryRelationship')?.find('value'), ids),
        });
      } else if (kind === 'family') {
        const relation = codeText(main.find('relatedSubject')?.one('code'), ids) || 'Relative';
        for (const o of main.all('component/observation')) {
          const condition = codeText(o.one('value'), ids);
          if (condition) push('family', { relation, condition, age: Number(o.find('value', (v) => v.attr('unit') === 'a')?.attr('value')) || undefined });
        }
      } else if (kind === 'insurance') {
        const carrier = main.find('representedOrganization')?.one('name')?.textContent || main.find('playingEntity')?.one('name')?.textContent;
        if (!carrier) continue;
        const member = main.find('participantRole')?.one('id')?.attr('extension') || '';
        push('insurance', { carrier, member, type: 'medical' });
      }
    }
  }
  return { profile, records, skipped: {} };
}

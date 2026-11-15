// "Give this to the dentist": what each kind of professional usually needs. A preset only
// preselects records; the person reviews every item before anything is shared. Records marked
// sensitive are never preselected by any preset.
import { isActive, isSensitive } from './model.mjs';

const daysAgo = (date, days) => date && Date.now() - new Date(date).getTime() <= days * 86400000;
const EYE = /\b(eye|vision|glaucoma|macular|cataract|retin|diabet|hypertens|blood pressure|migraine|thyroid)/i;
const DENTAL = /\b(dental|tooth|teeth|gum|oral|jaw|crown|filling|root canal|implant)/i;
const text = (r) => Object.values(r.data || {}).filter((v) => typeof v === 'string').join(' ');

const PERSON_ID = ['name', 'birthDate', 'sex', 'languages'];
const PET_ID = ['name', 'species', 'breed', 'birthDate', 'sex', 'neutered', 'color', 'microchip', 'license'];

export const PRESETS = [
  {
    id: 'dentist', for: 'person', label: 'Dentist', icon: 'tooth',
    why: 'Dentists check allergies (especially to numbing medicine, latex and antibiotics), blood thinners and bone medicines, heart conditions and joint replacements before treatment.',
    profile: [...PERSON_ID, 'notes'],
    pick: (r) => r.kind === 'allergy' || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || r.kind === 'procedure' || (r.kind === 'visit' && /dent/i.test(r.data.type || ''))
      || (r.kind === 'document' && (DENTAL.test(text(r)) || /dental/i.test(r.data.type || '')))
      || (r.kind === 'insurance' && r.data.type === 'dental') || (r.kind === 'provider' && /dent/i.test(r.data.role || '')),
  },
  {
    id: 'eye', for: 'person', label: 'Eye doctor', icon: 'eye',
    why: 'Eye doctors look at past prescriptions and at conditions and medicines that affect the eyes, like diabetes, high blood pressure and steroids, plus family history of glaucoma or macular degeneration.',
    profile: PERSON_ID,
    pick: (r) => r.kind === 'allergy' || r.kind === 'vision' || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'visit' && /eye/i.test(r.data.type || '')) || (r.kind === 'family' && EYE.test(text(r)))
      || (r.kind === 'document' && /eye|vision|glasses|contact/i.test(text(r))) || (r.kind === 'insurance' && r.data.type === 'vision'),
  },
  {
    id: 'pharmacy', for: 'person', label: 'Pharmacy', icon: 'pill',
    why: 'A new pharmacy needs your current medicines and allergies to check for interactions, your conditions, your prescribers and your pharmacy coverage.',
    profile: PERSON_ID,
    pick: (r) => r.kind === 'allergy' || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'insurance' && ['pharmacy', 'medical'].includes(r.data.type)) || (r.kind === 'provider' && isActive(r) && /primary|specialist/i.test(r.data.role || '')),
  },
  {
    id: 'primary', for: 'person', label: 'New primary doctor', icon: 'stethoscope',
    why: 'A new primary care doctor benefits from the whole picture. Files are left out by default to keep the share small; add the ones that matter.',
    profile: [...PERSON_ID, 'bloodType', 'organDonor', 'notes'],
    pick: (r) => !['note'].includes(r.kind),
  },
  {
    id: 'specialist', for: 'person', label: 'Specialist', icon: 'stethoscope',
    why: 'Specialists usually want your conditions, medicines, allergies, procedures, family history and the last two years of test results.',
    profile: [...PERSON_ID, 'notes'],
    pick: (r) => ['allergy', 'condition', 'procedure', 'family'].includes(r.kind) || (r.kind === 'medication' && isActive(r))
      || (r.kind === 'result' && daysAgo(r.data.date, 730)) || (r.kind === 'visit' && daysAgo(r.data.date, 365)),
  },
  {
    id: 'urgent', for: 'person', label: 'Urgent care or ER', icon: 'alert',
    why: 'In an emergency: allergies, current medicines and conditions, implants and surgeries, blood type, emergency contacts, insurance and any advance directive.',
    profile: [...PERSON_ID, 'bloodType', 'organDonor', 'notes'],
    pick: (r) => r.kind === 'allergy' || r.kind === 'contact' || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'procedure' && ['surgery', 'implant'].includes(r.data.type)) || (r.kind === 'insurance' && r.data.type === 'medical')
      || (r.kind === 'provider' && isActive(r) && /primary/i.test(r.data.role || '')) || (r.kind === 'document' && /advance directive/i.test(r.data.type || '')),
  },
  {
    id: 'therapy', for: 'person', label: 'Therapist or counselor', icon: 'chat',
    why: 'Only allergies and non-private medicines are preselected. Private items stay unticked: tick the ones you want this person to see.',
    profile: PERSON_ID,
    pick: (r) => r.kind === 'allergy' || (r.kind === 'medication' && isActive(r)),
  },
  {
    id: 'physio', for: 'person', label: 'Physical therapist', icon: 'walk',
    why: 'Physical therapists need the injury or condition, surgeries, medicines, allergies, recent imaging and recent visits.',
    profile: PERSON_ID,
    pick: (r) => ['allergy', 'procedure'].includes(r.kind) || (r.kind === 'condition' && isActive(r)) || (r.kind === 'medication' && isActive(r))
      || (r.kind === 'document' && /imaging|x-ray|scan/i.test(r.data.type || '')) || (r.kind === 'visit' && daysAgo(r.data.date, 180)),
  },
  {
    id: 'caregiver', for: 'person', label: 'Babysitter, school or camp', icon: 'people',
    why: 'Someone looking after you or your child for a while needs allergies, medicines, conditions, who to call and the doctor’s details.',
    profile: [...PERSON_ID, 'notes'],
    pick: (r) => r.kind === 'allergy' || r.kind === 'contact' || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'provider' && isActive(r) && /primary/i.test(r.data.role || '')) || (r.kind === 'insurance' && r.data.type === 'medical'),
  },
  {
    id: 'vet', for: 'pet', label: 'New vet', icon: 'paw',
    why: 'A new vet benefits from the whole history: vaccines, medicines and preventatives, conditions, surgeries, weights and past visits.',
    profile: [...PET_ID, 'diet', 'behavior', 'notes'],
    pick: (r) => r.kind !== 'note',
  },
  {
    id: 'er-vet', for: 'pet', label: 'Emergency vet', icon: 'alert',
    why: 'In an emergency: allergies, current medicines, conditions, vaccines, recent weight, the regular vet and pet insurance.',
    profile: [...PET_ID, 'behavior', 'notes'],
    pick: (r) => ['allergy', 'immunization'].includes(r.kind) || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'vital' && daysAgo(r.data.date, 365)) || (r.kind === 'provider' && isActive(r)) || r.kind === 'insurance' || r.kind === 'contact',
  },
  {
    id: 'boarding', for: 'pet', label: 'Boarding or daycare', icon: 'home',
    why: 'Kennels and daycares ask for proof of vaccines, plus allergies, medicines, feeding, behavior, the vet and who to call.',
    profile: [...PET_ID, 'diet', 'behavior'],
    pick: (r) => ['immunization', 'allergy', 'contact'].includes(r.kind) || (r.kind === 'medication' && isActive(r))
      || (r.kind === 'provider' && isActive(r) && /vet/i.test(r.data.role || '')) || (r.kind === 'document' && /vaccin|rabies/i.test(text(r))),
  },
  {
    id: 'groomer', for: 'pet', label: 'Groomer', icon: 'scissors',
    why: 'Groomers usually need rabies and other vaccines, allergies, skin or joint conditions and handling notes.',
    profile: [...PET_ID, 'behavior'],
    pick: (r) => ['immunization', 'allergy'].includes(r.kind) || (r.kind === 'condition' && isActive(r)),
  },
  {
    id: 'sitter', for: 'pet', label: 'Pet sitter', icon: 'people',
    why: 'A sitter needs medicines and when to give them, allergies, conditions, feeding, behavior, the vet, the emergency vet and who to call.',
    profile: [...PET_ID, 'diet', 'behavior', 'notes'],
    pick: (r) => ['allergy', 'contact', 'insurance'].includes(r.kind) || (r.kind === 'medication' && isActive(r)) || (r.kind === 'condition' && isActive(r))
      || (r.kind === 'provider' && isActive(r)),
  },
  {
    id: 'rehome', for: 'pet', label: 'New owner', icon: 'home',
    why: 'When a pet changes homes, the whole history goes with them.',
    profile: [...PET_ID, 'diet', 'behavior', 'notes'],
    pick: (r) => r.kind !== 'insurance',
  },
  {
    id: 'other', for: 'both', label: 'Someone else', icon: 'share',
    why: 'Nothing is preselected. Choose exactly what to include.',
    profile: ['name'],
    pick: () => false,
  },
  {
    id: 'insurer', for: 'both', label: 'Insurer, employer or lawyer', icon: 'shield', guarded: true,
    why: 'Nothing is preselected.',
    profile: ['name', 'birthDate'],
    pick: () => false,
  },
];

export const presetsFor = (kind) => PRESETS.filter((p) => p.for === kind || p.for === 'both');
export const presetById = (id) => PRESETS.find((p) => p.id === id);

/** Records to show in the review list, each marked whether the preset preselects it. */
export function proposal(space, preset) {
  return space.list().filter((r) => !['profile', 'share'].includes(r.kind)).map((r) => ({
    r, sensitive: isSensitive(r), selected: !isSensitive(r) && preset.pick(r),
  }));
}

/** Wording shown before sharing with anyone who could use records to price or judge you. */
export const GUARDED_NOTICE = [
  'Life, disability and long-term-care insurers, employers and lawyers can use what you give them to make decisions about you.',
  'Share only what they have a right to ask for. When an application asks a question, answer it truthfully: leaving things out can void a policy.',
  'In the US, GINA keeps genetic test results from health insurers and most employers, but not from life, disability or long-term-care insurers.',
];

/** Printed on every share and inside its FHIR bundle. */
export const USE_NOTICE = 'Provided by the patient (or their caregiver) for their care. Not authorized for insurance underwriting, employment decisions, marketing or resale.';

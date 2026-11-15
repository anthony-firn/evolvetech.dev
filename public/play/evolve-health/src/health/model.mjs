// What a health record can be, for people and for pets. Records are plain field objects; FHIR R4
// is generated from them when sharing or exporting (see fhir.mjs).

const opt = (...values) => values.map((v) => (Array.isArray(v) ? { value: v[0], label: v[1] } : { value: v, label: v[0].toUpperCase() + v.slice(1) }));

export const VISIT_TYPES = {
  person: ['Primary care', 'Dentist', 'Eye doctor', 'Specialist', 'Urgent care', 'Emergency room', 'Hospital stay', 'Therapy or counseling', 'Physical therapy', 'Lab or imaging', 'Telehealth', 'Pharmacy', 'Other'],
  pet: ['Vet check-up', 'Vet sick visit', 'Emergency vet', 'Vet specialist', 'Dental cleaning', 'Grooming', 'Boarding or daycare', 'Training', 'Other'],
};

export const PROVIDER_ROLES = {
  person: ['Primary care', 'Dentist', 'Eye doctor', 'Pharmacy', 'Specialist', 'Therapist', 'Physical therapist', 'Hospital', 'Lab', 'Urgent care', 'Other'],
  pet: ['Veterinarian', 'Emergency vet', 'Vet specialist', 'Groomer', 'Boarding or daycare', 'Pet sitter', 'Trainer', 'Pet pharmacy', 'Other'],
};

export const DOCUMENT_TYPES = {
  person: ['Lab report', 'Imaging report', 'X-ray or scan image', 'Dental X-ray', 'Eyeglass or contact prescription', 'Visit summary', 'Discharge papers', 'Referral or letter', 'Insurance card', 'Advance directive', 'Vaccination record', 'Other'],
  pet: ['Vaccination certificate', 'Rabies certificate', 'Lab results', 'X-ray or scan image', 'Visit summary', 'Adoption or breeder papers', 'Microchip registration', 'License', 'Insurance policy', 'Other'],
};

export const VITAL_TYPES = [
  { value: 'blood-pressure', label: 'Blood pressure', unit: 'mmHg', two: true },
  { value: 'weight', label: 'Weight', unit: 'lb' },
  { value: 'height', label: 'Height', unit: 'in' },
  { value: 'heart-rate', label: 'Heart rate', unit: 'beats/min' },
  { value: 'temperature', label: 'Temperature', unit: '°F' },
  { value: 'glucose', label: 'Blood sugar', unit: 'mg/dL' },
  { value: 'oxygen', label: 'Oxygen saturation', unit: '%' },
];

/** Categories some people need to keep tightly held. Never preselected in any share. */
export const SENSITIVE = {
  mental: 'Mental health',
  reproductive: 'Reproductive health',
  sexual: 'Sexual health',
  substance: 'Substance use',
  genetic: 'Genetic testing',
  hiv: 'HIV and STIs',
};

const SENSITIVE_HINTS = {
  mental: /\b(depress|anxiety|bipolar|schizo|ptsd|adhd|ocd|panic|psychiat|therap|counsel|sertraline|fluoxetine|escitalopram|bupropion|lithium|quetiapine|suicid|eating disorder)/i,
  reproductive: /\b(pregnan|ivf|fertility|miscarriage|abortion|contracept|birth control|iud|prenatal|obstetric)/i,
  sexual: /\b(erectile|sildenafil|tadalafil|sexual)/i,
  substance: /\b(alcohol use|opioid use|naloxone|buprenorphine|methadone|suboxone|rehab|addiction|substance)/i,
  genetic: /\b(genetic|brca|gene test|23andme|ancestrydna|carrier screen|huntington|apoe|genome|dna test)/i,
  hiv: /\b(hiv|prep\b|truvada|descovy|chlamydia|gonorrhea|syphilis|herpes|hpv|std|sti\b)/i,
};

/** Suggest sensitivity labels from the words in a record (the person confirms them). */
export function suggestSensitive(kind, data) {
  const text = Object.values(data || {}).filter((v) => typeof v === 'string').join(' ');
  return Object.entries(SENSITIVE_HINTS).filter(([, re]) => re.test(text)).map(([k]) => k);
}

const notes = { k: 'notes', label: 'Notes', type: 'textarea' };

export const KINDS = {
  condition: {
    label: 'Condition', plural: 'Conditions', icon: 'pulse', petLabel: 'Condition',
    fields: [
      { k: 'name', label: 'Condition', required: true, placeholder: 'e.g. Asthma' },
      { k: 'status', label: 'Status', type: 'select', options: opt('active', 'managed', 'resolved'), default: 'active' },
      { k: 'onset', label: 'Started', type: 'date' },
      { k: 'resolved', label: 'Resolved', type: 'date', when: (d) => d.status === 'resolved' },
      notes,
    ],
    title: (d) => d.name, sub: (d) => cap(d.status), date: (d) => d.onset,
  },
  medication: {
    label: 'Medication', plural: 'Medications', icon: 'pill',
    fields: [
      { k: 'name', label: 'Medicine', required: true, placeholder: 'e.g. Lisinopril' },
      { k: 'dose', label: 'Dose', placeholder: 'e.g. 10 mg' },
      { k: 'frequency', label: 'How often', placeholder: 'e.g. once a day' },
      { k: 'type', label: 'Type', type: 'select', options: opt('prescription', ['otc', 'Over the counter'], 'supplement', ['preventative', 'Preventative (flea, tick, heartworm)']), default: 'prescription' },
      { k: 'reason', label: 'For', placeholder: 'What it treats' },
      { k: 'prescriber', label: 'Prescribed by' },
      { k: 'pharmacy', label: 'Pharmacy' },
      { k: 'status', label: 'Status', type: 'select', options: opt('active', ['as-needed', 'As needed'], 'stopped'), default: 'active' },
      { k: 'start', label: 'Started', type: 'date' },
      { k: 'end', label: 'Stopped', type: 'date', when: (d) => d.status === 'stopped' },
      notes,
    ],
    title: (d) => d.name, sub: (d) => [d.dose, d.frequency].filter(Boolean).join(', ') || cap(d.status), date: (d) => d.start,
  },
  allergy: {
    label: 'Allergy', plural: 'Allergies', icon: 'alert',
    fields: [
      { k: 'substance', label: 'Allergic to', required: true, placeholder: 'e.g. Penicillin' },
      { k: 'category', label: 'Kind', type: 'select', options: opt('medication', 'food', 'environment', 'insect', 'latex', 'other'), default: 'medication' },
      { k: 'reaction', label: 'Reaction', placeholder: 'e.g. Hives, swelling' },
      { k: 'severity', label: 'Severity', type: 'select', options: opt('mild', 'moderate', 'severe', ['life-threatening', 'Life-threatening']), default: 'moderate' },
      { k: 'noted', label: 'First noticed', type: 'date' },
      notes,
    ],
    title: (d) => d.substance, sub: (d) => [cap(d.severity), d.reaction].filter(Boolean).join(' · '), date: (d) => d.noted,
  },
  immunization: {
    label: 'Vaccine', plural: 'Vaccines', icon: 'shield',
    fields: [
      { k: 'vaccine', label: 'Vaccine', required: true, placeholder: 'e.g. Flu, Rabies, DHPP' },
      { k: 'date', label: 'Given on', type: 'date', required: true },
      { k: 'dose', label: 'Dose number' },
      { k: 'lot', label: 'Lot number' },
      { k: 'givenBy', label: 'Given by' },
      { k: 'tag', label: 'Tag number', pet: true },
      { k: 'due', label: 'Next due', type: 'date' },
      notes,
    ],
    title: (d) => d.vaccine, sub: (d) => (d.due ? `Next due ${fmtDate(d.due)}` : d.givenBy || ''), date: (d) => d.date,
  },
  result: {
    label: 'Test result', plural: 'Test results', icon: 'flask',
    fields: [
      { k: 'test', label: 'Test', required: true, placeholder: 'e.g. Hemoglobin A1c' },
      { k: 'value', label: 'Result', placeholder: 'e.g. 5.6' },
      { k: 'unit', label: 'Unit', placeholder: 'e.g. %' },
      { k: 'range', label: 'Normal range', placeholder: 'e.g. 4.0–5.6' },
      { k: 'flag', label: 'Flag', type: 'select', options: opt('normal', 'high', 'low', 'abnormal'), default: 'normal' },
      { k: 'date', label: 'Date', type: 'date', required: true },
      { k: 'orderedBy', label: 'Ordered by' },
      notes,
    ],
    title: (d) => d.test, sub: (d) => [[d.value, d.unit].filter(Boolean).join(' '), d.flag && d.flag !== 'normal' ? cap(d.flag) : ''].filter(Boolean).join(' · '), date: (d) => d.date,
  },
  vital: {
    label: 'Measurement', plural: 'Measurements', icon: 'gauge',
    fields: [
      { k: 'type', label: 'Measurement', type: 'select', options: VITAL_TYPES.map(({ value, label }) => ({ value, label })), default: 'blood-pressure' },
      { k: 'value', label: 'Value', type: 'number', required: true, labelFor: (d) => (d.type === 'blood-pressure' ? 'Systolic (top number)' : 'Value') },
      { k: 'value2', label: 'Diastolic (bottom number)', type: 'number', when: (d) => d.type === 'blood-pressure' },
      { k: 'unit', label: 'Unit', placeholder: 'Leave blank for the usual unit' },
      { k: 'date', label: 'Date', type: 'date', required: true },
      notes,
    ],
    title: (d) => VITAL_TYPES.find((v) => v.value === d.type)?.label || 'Measurement',
    sub: (d) => vitalText(d), date: (d) => d.date,
  },
  visit: {
    label: 'Appointment', plural: 'Appointments', icon: 'calendar',
    fields: [
      { k: 'date', label: 'When', type: 'datetime-local', required: true },
      { k: 'type', label: 'Kind of visit', type: 'select', optionsFor: (kind) => VISIT_TYPES[kind].map((v) => ({ value: v, label: v })) },
      { k: 'provider', label: 'With', placeholder: 'Doctor, dentist, vet…' },
      { k: 'reason', label: 'Reason' },
      { k: 'status', label: 'Status', type: 'select', options: opt(['planned', 'Upcoming'], ['finished', 'Done'], ['cancelled', 'Cancelled']), default: 'finished' },
      { k: 'summary', label: 'What they said', type: 'textarea', placeholder: 'Diagnosis, findings, anything you want to remember' },
      { k: 'instructions', label: 'Instructions', type: 'textarea', placeholder: 'What to do next' },
      { k: 'followUp', label: 'Follow up by', type: 'date' },
      { k: 'questions', label: 'Questions for next time', type: 'textarea' },
    ],
    title: (d) => d.type || 'Appointment', sub: (d) => [d.provider, d.reason].filter(Boolean).join(' · '), date: (d) => d.date,
  },
  procedure: {
    label: 'Procedure', plural: 'Procedures and surgeries', icon: 'scalpel',
    fields: [
      { k: 'name', label: 'Procedure', required: true, placeholder: 'e.g. Hip replacement, crown, spay' },
      { k: 'type', label: 'Type', type: 'select', options: opt('surgery', ['dental', 'Dental work'], 'imaging', ['implant', 'Implant or device'], 'other'), default: 'surgery' },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'provider', label: 'Done by' },
      { k: 'site', label: 'Body part or tooth' },
      notes,
    ],
    title: (d) => d.name, sub: (d) => [cap(d.type), d.provider].filter(Boolean).join(' · '), date: (d) => d.date,
  },
  vision: {
    label: 'Vision prescription', plural: 'Vision prescriptions', icon: 'eye', person: true,
    fields: [
      { k: 'type', label: 'For', type: 'select', options: opt('glasses', 'contacts'), default: 'glasses' },
      { k: 'date', label: 'Written on', type: 'date', required: true },
      { k: 'odSph', label: 'Right eye (OD) sphere' }, { k: 'odCyl', label: 'OD cylinder' }, { k: 'odAxis', label: 'OD axis' }, { k: 'odAdd', label: 'OD add' },
      { k: 'osSph', label: 'Left eye (OS) sphere' }, { k: 'osCyl', label: 'OS cylinder' }, { k: 'osAxis', label: 'OS axis' }, { k: 'osAdd', label: 'OS add' },
      { k: 'pd', label: 'Pupil distance (PD)' },
      { k: 'provider', label: 'Prescribed by' },
      { k: 'expires', label: 'Expires', type: 'date' },
      notes,
    ],
    title: (d) => `${cap(d.type || 'glasses')} prescription`, sub: (d) => `OD ${d.odSph || '—'} / OS ${d.osSph || '—'}`, date: (d) => d.date,
  },
  document: {
    label: 'Document', plural: 'Documents', icon: 'file',
    fields: [
      { k: 'title', label: 'Title', required: true },
      { k: 'type', label: 'Type', type: 'select', optionsFor: (kind) => DOCUMENT_TYPES[kind].map((v) => ({ value: v, label: v })) },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'provider', label: 'From' },
      { k: 'file', label: 'File', type: 'file' },
      notes,
    ],
    title: (d) => d.title, sub: (d) => [d.type, d.file ? fmtSize(d.file.size) : ''].filter(Boolean).join(' · '), date: (d) => d.date,
  },
  provider: {
    label: 'Care team member', plural: 'Care team', icon: 'people',
    fields: [
      { k: 'name', label: 'Name', required: true, placeholder: 'Person or practice' },
      { k: 'role', label: 'Role', type: 'select', optionsFor: (kind) => PROVIDER_ROLES[kind].map((v) => ({ value: v, label: v })) },
      { k: 'organization', label: 'Practice or clinic' },
      { k: 'phone', label: 'Phone', type: 'tel' },
      { k: 'email', label: 'Email', type: 'email' },
      { k: 'address', label: 'Address', type: 'textarea' },
      { k: 'portal', label: 'Patient portal link', type: 'url' },
      { k: 'current', label: 'Current', type: 'select', options: opt(['yes', 'Current'], ['no', 'Former']), default: 'yes' },
      notes,
    ],
    title: (d) => d.name, sub: (d) => [d.role, d.organization].filter(Boolean).join(' · '),
  },
  insurance: {
    label: 'Insurance', plural: 'Insurance', icon: 'card',
    fields: [
      { k: 'type', label: 'Covers', type: 'select', options: opt('medical', 'dental', 'vision', 'pharmacy', 'pet', 'other'), default: 'medical' },
      { k: 'carrier', label: 'Insurer', required: true },
      { k: 'plan', label: 'Plan' },
      { k: 'member', label: 'Member ID' },
      { k: 'group', label: 'Group number' },
      { k: 'phone', label: 'Phone', type: 'tel' },
      { k: 'holder', label: 'Policy holder' },
      { k: 'card', label: 'Card photo', type: 'file' },
      notes,
    ],
    title: (d) => d.carrier, sub: (d) => [cap(d.type), d.member ? `ID ${d.member}` : ''].filter(Boolean).join(' · '),
  },
  family: {
    label: 'Family history', plural: 'Family history', icon: 'tree', person: true,
    fields: [
      { k: 'relation', label: 'Relative', required: true, placeholder: 'e.g. Mother' },
      { k: 'condition', label: 'Condition', required: true },
      { k: 'age', label: 'Age when diagnosed', type: 'number' },
      notes,
    ],
    title: (d) => `${d.relation}: ${d.condition}`, sub: (d) => (d.age ? `Diagnosed at ${d.age}` : ''),
  },
  contact: {
    label: 'Contact', plural: 'Emergency contacts', icon: 'phone',
    fields: [
      { k: 'name', label: 'Name', required: true },
      { k: 'relation', label: 'Relationship' },
      { k: 'phone', label: 'Phone', type: 'tel' },
      { k: 'email', label: 'Email', type: 'email' },
      notes,
    ],
    title: (d) => d.name, sub: (d) => [d.relation, d.phone].filter(Boolean).join(' · '),
  },
  note: {
    label: 'Note', plural: 'Notes and journal', icon: 'note',
    fields: [
      { k: 'title', label: 'Title', required: true, placeholder: 'e.g. Headaches after lunch' },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'body', label: 'Note', type: 'textarea' },
    ],
    title: (d) => d.title, sub: (d) => (d.body || '').slice(0, 80), date: (d) => d.date,
  },
};

/** Which record kinds appear for a person or a pet, in display order. */
export const ORDER = {
  person: ['visit', 'medication', 'condition', 'allergy', 'immunization', 'result', 'vital', 'procedure', 'vision', 'document', 'provider', 'insurance', 'family', 'contact', 'note'],
  pet: ['visit', 'medication', 'condition', 'allergy', 'immunization', 'result', 'vital', 'procedure', 'document', 'provider', 'insurance', 'contact', 'note'],
};

export const PET_LABELS = { medication: 'Medicines and preventatives', vital: 'Weight and measurements', provider: 'Vet and care team', contact: 'Emergency contacts' };
export const pluralFor = (kind, profileKind) => (profileKind === 'pet' && PET_LABELS[kind]) || KINDS[kind].plural;

export const PROFILE_FIELDS = {
  person: [
    { k: 'name', label: 'Name', required: true },
    { k: 'birthDate', label: 'Date of birth', type: 'date' },
    { k: 'sex', label: 'Sex', type: 'select', options: opt(['', 'Prefer not to say'], 'female', 'male', 'intersex', 'other') },
    { k: 'bloodType', label: 'Blood type', type: 'select', options: opt(['', 'Not known'], 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').map((o) => ({ ...o, label: o.value || o.label })) },
    { k: 'languages', label: 'Preferred language' },
    { k: 'organDonor', label: 'Organ donor', type: 'select', options: opt(['', 'Not recorded'], 'yes', 'no') },
    { k: 'notes', label: 'Important notes for anyone treating me', type: 'textarea', placeholder: 'e.g. Has a pacemaker; hard of hearing; advance directive on file' },
  ],
  pet: [
    { k: 'name', label: 'Name', required: true },
    { k: 'species', label: 'Species', placeholder: 'e.g. Dog, Cat, Rabbit', required: true },
    { k: 'breed', label: 'Breed' },
    { k: 'birthDate', label: 'Birthday (or best guess)', type: 'date' },
    { k: 'sex', label: 'Sex', type: 'select', options: opt(['', 'Not recorded'], 'female', 'male') },
    { k: 'neutered', label: 'Spayed or neutered', type: 'select', options: opt(['', 'Not recorded'], 'yes', 'no') },
    { k: 'color', label: 'Color and markings' },
    { k: 'microchip', label: 'Microchip number' },
    { k: 'license', label: 'License or tag number' },
    { k: 'diet', label: 'Food and feeding', type: 'textarea' },
    { k: 'behavior', label: 'Handling and behavior notes', type: 'textarea', placeholder: 'e.g. Nervous at the vet; muzzle for nail trims' },
    { k: 'notes', label: 'Other notes', type: 'textarea' },
  ],
};

// ---- display helpers ----

export function cap(s) { return s ? String(s)[0].toUpperCase() + String(s).slice(1).replace(/-/g, ' ') : ''; }

export function fmtDate(value, withTime = false) {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  if (withTime && value.length > 10) return d.toLocaleString(undefined, { ...opts, hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, opts);
}

export function fmtSize(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function vitalText(d) {
  const meta = VITAL_TYPES.find((v) => v.value === d.type);
  const unit = d.unit || meta?.unit || '';
  return d.type === 'blood-pressure' ? `${d.value ?? '—'}/${d.value2 ?? '—'} ${unit}` : `${d.value ?? '—'} ${unit}`.trim();
}

export function ageFrom(birthDate, at = new Date()) {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T12:00:00`);
  let years = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) years--;
  if (years < 2) {
    const months = Math.max(0, (at.getFullYear() - b.getFullYear()) * 12 + at.getMonth() - b.getMonth() - (at.getDate() < b.getDate() ? 1 : 0));
    return months < 24 ? `${months} month${months === 1 ? '' : 's'}` : `${years} years`;
  }
  return `${years}`;
}

export const recordTitle = (r) => KINDS[r.kind]?.title(r.data) || r.kind;
export const recordSub = (r) => KINDS[r.kind]?.sub?.(r.data) || '';
export const recordDate = (r) => KINDS[r.kind]?.date?.(r.data) || '';
export const isSensitive = (r) => Array.isArray(r.data?.sensitive) && r.data.sensitive.length > 0;
export const isActive = (r) => {
  const d = r.data;
  if (r.kind === 'medication') return d.status !== 'stopped';
  if (r.kind === 'condition') return d.status !== 'resolved';
  if (r.kind === 'provider') return d.current !== 'no';
  return true;
};

/** Short, dated entries for the timeline view, newest first. */
export function timeline(space) {
  return space.list().filter((r) => KINDS[r.kind] && recordDate(r)).map((r) => ({ r, date: recordDate(r) }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function searchRecords(space, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return space.list().filter((r) => KINDS[r.kind] && JSON.stringify(r.data).toLowerCase().includes(q));
}

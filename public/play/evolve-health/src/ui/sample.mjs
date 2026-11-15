// The sample household for "Explore with sample data". Everything here is fictional and lives only
// in this tab's memory. It is built through the real code paths: Rosa owns her own vault and gave
// Jordan manager access with an invite; Alex has asked to see Biscuit and is waiting for approval.
import { Vault } from '../core/vault.mjs';
import { SAMPLE_NODE } from '../core/sync.mjs';
import { randomId } from '../lib/bytes.mjs';

const KDF = { alg: 'argon2id', m: 1024, t: 1, p: 1 }; // sample only: real vaults use 64 MiB, 3 passes
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const at = (offset, time) => `${day(offset)}T${time}`;

async function account(name) {
  const vault = await Vault.open({ memory: true });
  await vault.create({ name, passphrase: `sample-${randomId(12)}`, kdf: KDF, sample: true });
  await vault.addNode(SAMPLE_NODE);
  return vault;
}

async function fill(space, rows) { for (const [kind, data] of rows) await space.put(kind, data); }

export async function buildSample() {
  const jordan = await account('Jordan');
  const me = await jordan.createProfile({ kind: 'person', name: 'Jordan Rivera', birthDate: '1989-06-14', bloodType: 'O+', languages: 'English, Spanish', organDonor: 'yes' });
  await fill(me, [
    ['allergy', { substance: 'Penicillin', category: 'medication', reaction: 'Hives', severity: 'moderate', noted: '2004-03-01' }],
    ['allergy', { substance: 'Latex', category: 'latex', reaction: 'Itchy rash', severity: 'mild' }],
    ['condition', { name: 'Asthma', status: 'managed', onset: '1998-09-01' }],
    ['condition', { name: 'Seasonal allergies', status: 'active', onset: '2010-04-01' }],
    ['condition', { name: 'Sprained left ankle', status: 'resolved', onset: '2024-05-11', resolved: '2024-07-02' }],
    ['condition', { name: 'Generalized anxiety', status: 'managed', onset: '2019-01-15', sensitive: ['mental'] }],
    ['medication', { name: 'Albuterol inhaler', dose: '90 mcg, 2 puffs', frequency: 'as needed for wheezing', status: 'as-needed', type: 'prescription', reason: 'Asthma', prescriber: 'Dr. Amara Okafor', pharmacy: 'Corner Pharmacy' }],
    ['medication', { name: 'Fluticasone nasal spray', dose: '50 mcg, 1 spray each nostril', frequency: 'once a day', status: 'active', type: 'prescription', reason: 'Seasonal allergies', prescriber: 'Dr. Amara Okafor' }],
    ['medication', { name: 'Cetirizine', dose: '10 mg', frequency: 'once a day in spring', status: 'active', type: 'otc' }],
    ['medication', { name: 'Sertraline', dose: '50 mg', frequency: 'once a day', status: 'active', type: 'prescription', reason: 'Anxiety', sensitive: ['mental'] }],
    ['medication', { name: 'Vitamin D3', dose: '2000 IU', frequency: 'once a day', status: 'active', type: 'supplement', start: '2026-03-21' }],
    ['immunization', { vaccine: 'Influenza (flu)', date: '2026-10-03', givenBy: 'Corner Pharmacy' }],
    ['immunization', { vaccine: 'COVID-19', date: '2025-10-10', givenBy: 'Corner Pharmacy' }],
    ['immunization', { vaccine: 'Tdap (tetanus, diphtheria, pertussis)', date: '2022-02-18', due: '2032-02-18' }],
    ['result', { test: 'Hemoglobin A1c', value: '5.4', unit: '%', range: '4.0–5.6', flag: 'normal', date: '2026-03-20', orderedBy: 'Dr. Amara Okafor' }],
    ['result', { test: 'LDL cholesterol', value: '112', unit: 'mg/dL', range: 'Under 100', flag: 'high', date: '2026-03-20', orderedBy: 'Dr. Amara Okafor' }],
    ['result', { test: 'Vitamin D, 25-hydroxy', value: '24', unit: 'ng/mL', range: '30–100', flag: 'low', date: '2026-03-20', orderedBy: 'Dr. Amara Okafor' }],
    ['result', { test: 'BRCA1/BRCA2 genetic test', value: 'No harmful variant found', flag: 'normal', date: '2025-08-12', sensitive: ['genetic'] }],
    ['vital', { type: 'blood-pressure', value: 116, value2: 74, date: '2024-08-02' }],
    ['vital', { type: 'blood-pressure', value: 122, value2: 80, date: '2025-09-15' }],
    ['vital', { type: 'blood-pressure', value: 118, value2: 76, date: '2026-03-20' }],
    ['vital', { type: 'weight', value: 171, date: '2024-08-02' }],
    ['vital', { type: 'weight', value: 169, date: '2025-09-15' }],
    ['vital', { type: 'weight', value: 166, date: '2026-03-20' }],
    ['procedure', { name: 'Wisdom teeth removal', type: 'dental', date: '2008-07-14', provider: 'Valley Oral Surgery' }],
    ['vision', { type: 'glasses', date: '2025-11-02', odSph: '-1.25', odCyl: '-0.50', odAxis: '180', osSph: '-1.00', osCyl: '-0.25', osAxis: '170', pd: '63', provider: 'Clearview Optometry', expires: '2027-11-02' }],
    ['visit', {
      date: '2026-03-20T10:30', type: 'Primary care', provider: 'Dr. Amara Okafor', reason: 'Annual physical', status: 'finished',
      summary: 'Asthma well controlled. Vitamin D low (24). LDL cholesterol a little high (112).',
      instructions: 'Keep using the fluticasone spray daily. Start vitamin D3 2000 IU a day. Less fried food, exercise most days.',
      followUp: '2026-09-20', questions: 'Do I still need the cetirizine if the nasal spray works?',
      transcript: [
        { t: 5, speaker: 'Dr. Okafor', text: 'Good to see you again. How has your breathing been?' },
        { t: 12, speaker: 'Jordan', text: 'Pretty good. I only used the inhaler a couple of times this winter.' },
        { t: 31, speaker: 'Dr. Okafor', text: 'That’s great. Your asthma looks well controlled, so keep using the fluticasone spray every day.' },
        { t: 64, speaker: 'Dr. Okafor', text: 'Your vitamin D came back low, at 24. I’d like you to start taking 2000 units of vitamin D3 daily.' },
        { t: 82, speaker: 'Dr. Okafor', text: 'Your LDL cholesterol is a little high at 112. Try to cut back on fried food and get some exercise most days.' },
        { t: 108, speaker: 'Dr. Okafor', text: 'We’ll recheck your cholesterol and vitamin D with blood work in six months.' },
        { t: 130, speaker: 'Dr. Okafor', text: 'If you get chest tightness that doesn’t get better with the inhaler, call us right away or go to the ER.' },
        { t: 151, speaker: 'Dr. Okafor', text: 'Otherwise I’ll see you in a year for your next physical.' },
      ],
    }],
    ['visit', { date: '2026-05-08T14:00', type: 'Dentist', provider: 'Dr. Kevin Lee, Bright Smile Dental', reason: 'Cleaning and check-up', status: 'finished', summary: 'Small cavity on a lower left molar. Gums healthy.', instructions: 'Floss once a day. Filling to be scheduled.' }],
    ['visit', { date: at(19, '09:30'), type: 'Dentist', provider: 'Dr. Kevin Lee, Bright Smile Dental', reason: 'Filling, lower left molar', status: 'planned' }],
    ['visit', { date: '2025-11-02T16:15', type: 'Eye doctor', provider: 'Clearview Optometry', reason: 'Eye exam', status: 'finished', summary: 'Slight change in prescription. Eyes healthy.' }],
    ['provider', { name: 'Dr. Amara Okafor', role: 'Primary care', organization: 'Eastside Family Medicine', phone: '(555) 010-0142', current: 'yes' }],
    ['provider', { name: 'Dr. Kevin Lee', role: 'Dentist', organization: 'Bright Smile Dental', phone: '(555) 010-0187', current: 'yes' }],
    ['provider', { name: 'Clearview Optometry', role: 'Eye doctor', phone: '(555) 010-0133', current: 'yes' }],
    ['provider', { name: 'Corner Pharmacy', role: 'Pharmacy', phone: '(555) 010-0110', current: 'yes' }],
    ['insurance', { type: 'medical', carrier: 'Sample Health Plan', plan: 'PPO', member: 'SAMPLE-0001', group: 'GRP-100', phone: '(555) 010-0100', holder: 'Jordan Rivera' }],
    ['insurance', { type: 'dental', carrier: 'Sample Dental Plan', member: 'SAMPLE-D-0001' }],
    ['family', { relation: 'Father', condition: 'Type 2 diabetes', age: 52 }],
    ['family', { relation: 'Mother', condition: 'Osteoporosis', age: 63 }],
    ['family', { relation: 'Grandmother', condition: 'Glaucoma', age: 70 }],
    ['contact', { name: 'Rosa Rivera', relation: 'Mother', phone: '(555) 010-0199' }],
    ['contact', { name: 'Alex Kim', relation: 'Partner', phone: '(555) 010-0123' }],
    ['share', { recipient: 'Bright Smile Dental', preset: 'dentist', presetLabel: 'Dentist', purpose: 'New patient forms', createdAt: Date.parse('2026-05-01T12:00:00Z'), expiresAt: Date.parse('2026-05-08T12:00:00Z'), count: 9, files: 0, kinds: {}, method: 'link', shareId: 'sample' }],
  ]);

  const biscuit = await jordan.createProfile({ kind: 'pet', name: 'Biscuit', species: 'Dog', breed: 'Golden retriever', birthDate: '2021-05-20', sex: 'female', neutered: 'yes', color: 'Gold', microchip: '985 000 000 000 001', license: 'Tag 4471',
    diet: '2 cups salmon kibble, morning and evening. No chicken.', behavior: 'Friendly. Nervous during nail trims: go slow and offer treats.' });
  await fill(biscuit, [
    ['allergy', { substance: 'Chicken', category: 'food', reaction: 'Itchy skin, ear infections', severity: 'mild' }],
    ['condition', { name: 'Seasonal skin allergies', status: 'managed', onset: '2023-04-01' }],
    ['medication', { name: 'Heartworm preventative (ivermectin/pyrantel chewable)', dose: '1 chewable (51–100 lb)', frequency: 'monthly, on the 1st', status: 'active', type: 'preventative', prescriber: 'Dr. Nina Alvarez' }],
    ['medication', { name: 'Flea and tick chewable (afoxolaner)', dose: '1 chewable (60–121 lb)', frequency: 'monthly, on the 1st', status: 'active', type: 'preventative' }],
    ['medication', { name: 'Oclacitinib', dose: '16 mg', frequency: 'once a day during itchy flare-ups', status: 'as-needed', type: 'prescription', reason: 'Skin allergies', prescriber: 'Dr. Nina Alvarez' }],
    ['immunization', { vaccine: 'Rabies (3-year)', date: '2024-06-01', due: '2027-06-01', tag: '4471', givenBy: 'Riverside Animal Clinic' }],
    ['immunization', { vaccine: 'DHPP', date: '2025-06-01', due: day(16), givenBy: 'Riverside Animal Clinic' }],
    ['immunization', { vaccine: 'Bordetella (kennel cough)', date: '2026-05-15', due: day(40), givenBy: 'Riverside Animal Clinic' }],
    ['immunization', { vaccine: 'Leptospirosis', date: '2026-05-15', due: '2027-05-15', givenBy: 'Riverside Animal Clinic' }],
    ['vital', { type: 'weight', value: 61, date: '2024-06-01' }],
    ['vital', { type: 'weight', value: 66, date: '2025-06-01' }],
    ['vital', { type: 'weight', value: 64, date: '2026-05-15' }],
    ['procedure', { name: 'Spay', type: 'surgery', date: '2022-01-10', provider: 'Riverside Animal Clinic' }],
    ['visit', { date: '2026-05-15T11:00', type: 'Vet check-up', provider: 'Dr. Nina Alvarez, Riverside Animal Clinic', reason: 'Annual exam and vaccines', status: 'finished', summary: 'Healthy. Lost 2 lb, which is good. Ears clear.', instructions: 'Keep her on the salmon food. Recheck weight at the next visit.' }],
    ['visit', { date: at(30, '08:00'), type: 'Grooming', provider: 'Sudsy Paws Grooming', reason: 'Bath and nail trim', status: 'planned' }],
    ['provider', { name: 'Riverside Animal Clinic', role: 'Veterinarian', organization: 'Dr. Nina Alvarez', phone: '(555) 010-0150', current: 'yes' }],
    ['provider', { name: 'Northside Pet Emergency', role: 'Emergency vet', phone: '(555) 010-0160', notes: 'Open 24 hours', current: 'yes' }],
    ['provider', { name: 'Sudsy Paws Grooming', role: 'Groomer', phone: '(555) 010-0170', current: 'yes' }],
    ['insurance', { type: 'pet', carrier: 'Sample Pet Insurance', member: 'PET-0001', phone: '(555) 010-0180' }],
    ['contact', { name: 'Jordan Rivera', relation: 'Owner', phone: '(555) 010-0175' }],
    ['contact', { name: 'Alex Kim', relation: 'Co-owner', phone: '(555) 010-0123' }],
  ]);

  // Rosa keeps her own vault and makes Jordan a manager.
  const rosa = await account('Rosa');
  const mom = await rosa.createProfile({ kind: 'person', name: 'Rosa Rivera', birthDate: '1951-02-03', sex: 'female', bloodType: 'A+', languages: 'Spanish, English', notes: 'Takes a blood thinner (apixaban). Right hip replacement. Wears hearing aids.' });
  await fill(mom, [
    ['allergy', { substance: 'Sulfa drugs', category: 'medication', reaction: 'Rash', severity: 'moderate' }],
    ['condition', { name: 'Atrial fibrillation', status: 'managed', onset: '2018-06-01' }],
    ['condition', { name: 'High blood pressure', status: 'managed', onset: '2009-01-01' }],
    ['condition', { name: 'Osteoporosis', status: 'active', onset: '2014-03-01' }],
    ['medication', { name: 'Apixaban', dose: '5 mg', frequency: 'twice a day', status: 'active', type: 'prescription', reason: 'Atrial fibrillation (blood thinner)', prescriber: 'Dr. Ravi Patel' }],
    ['medication', { name: 'Alendronate', dose: '70 mg', frequency: 'once a week, Sunday morning', status: 'active', type: 'prescription', reason: 'Osteoporosis', prescriber: 'Dr. Helen Moore' }],
    ['medication', { name: 'Amlodipine', dose: '5 mg', frequency: 'once a day', status: 'active', type: 'prescription', reason: 'Blood pressure' }],
    ['medication', { name: 'Calcium with vitamin D', dose: '600 mg / 800 IU', frequency: 'twice a day', status: 'active', type: 'supplement' }],
    ['procedure', { name: 'Right hip replacement', type: 'implant', date: '2021-08-17', provider: 'St. Clare Hospital' }],
    ['procedure', { name: 'Cataract surgery, left eye', type: 'surgery', date: '2023-04-12' }],
    ['immunization', { vaccine: 'Shingles (recombinant), dose 2', date: '2024-01-22' }],
    ['immunization', { vaccine: 'Pneumococcal conjugate', date: '2023-10-05' }],
    ['immunization', { vaccine: 'Influenza (high dose)', date: '2026-09-28' }],
    ['vital', { type: 'blood-pressure', value: 134, value2: 82, date: '2026-10-28' }],
    ['visit', { date: '2026-10-28T13:00', type: 'Specialist', provider: 'Dr. Ravi Patel, cardiology', reason: 'AFib follow-up', status: 'finished', summary: 'Heart rhythm stable. Blood pressure a little high.', instructions: 'Keep taking apixaban twice a day; don’t skip doses. Check blood pressure at home weekly.', followUp: '2027-04-28' }],
    ['visit', { date: at(9, '10:00'), type: 'Primary care', provider: 'Dr. Helen Moore', reason: 'Medicare annual wellness visit', status: 'planned' }],
    ['provider', { name: 'Dr. Helen Moore', role: 'Primary care', phone: '(555) 010-0144', current: 'yes' }],
    ['provider', { name: 'Dr. Ravi Patel', role: 'Specialist', organization: 'Cardiology', phone: '(555) 010-0155', current: 'yes' }],
    ['contact', { name: 'Jordan Rivera', relation: 'Child', phone: '(555) 010-0175' }],
  ]);
  await rosa.syncAll();
  const invite = await rosa.createInvite(mom, { role: 'manager', label: 'Jordan' });
  await jordan.acceptInvite(invite.code, { name: 'Jordan (my child)' });
  await rosa.syncAll();
  for (const req of rosa.requests()) await rosa.approveRequest(req.id);
  await rosa.syncAll();
  rosa.lock();

  // Alex asks to see Biscuit; Jordan can approve it in the sample.
  const petInvite = await jordan.createInvite(biscuit, { role: 'viewer', label: 'Alex' });
  const alex = await account('Alex');
  await alex.acceptInvite(petInvite.code, { name: 'Alex (partner)' });
  alex.lock();

  await jordan.syncAll();
  await jordan.syncAll();
  return jordan;
}

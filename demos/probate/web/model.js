// Pure drafting rules. No family data, network requests, legal conclusions or automatic attestations.
export const TITLES = {de226:'Spousal or Domestic Partner Property Order',de120:'Notice of Hearing—Decedent’s Estate or Trust',de135:'Proof of Holographic Instrument'};
export const commonKeys=['d_name','d_aka','d_date','d_lived','county','court_street','court_mailing','court_cityzip','court_branch','case_number','hearing','hearing_time','dept','s_name','partner','c_name','c_street','c_city','c_state','c_zip','c_phone','c_email','will'];
export function importShared(saved) {
  if (!saved || typeof saved!=='object' || Array.isArray(saved)) throw Error('Choose a saved answers object.');
  return Object.fromEntries(commonKeys.filter(k=>typeof saved[k]==='string').map(k=>[k,saved[k]]));
}
export function estate(a){return [a.d_name,a.d_aka ? `also known as ${a.d_aka}`:''].filter(Boolean).join(', ');}
export function longDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}):s||'';}
export function recipients(a){return (a.recipients||'').split(/\n/).filter(x=>x.trim()).map(line=>{const i=line.indexOf('|');return {name:(i<0?line:line.slice(0,i)).trim(),address:i<0?'':line.slice(i+1).trim()};});}
export function warnings(id,a,files=[]) {
 const out=[];
 for(const [key,label] of [['d_name','the decedent’s name'],['county','the court county']]) if(!a[key]?.trim()) out.push(`Add ${label}.`);
 if(id==='de226') {
  if(!a.partner) out.push('Choose spouse or registered domestic partner.');
  if(!a.s_name?.trim()) out.push('Add the surviving spouse or partner’s name.');
  if(!a.d_date) out.push('Add the date of death.');
  if(!a.will) out.push('Choose whether the decedent left a will.');
  if(!a.d_lived) out.push('Choose the decedent’s residence.');
  if(!a.passing?.trim()&&!a.confirmed?.trim()) out.push('Add at least one property list, matching the petition you will file.');
  if(a.confirmed?.trim()) out.push('Attachment 7a confirms the survivor’s existing property. Verify that it matches DE-221 Attachment 7b and the ownership facts.');
  if(!a.order_reviewed) out.push('Compare every description, parcel number, VIN and fractional interest with the final petition.');
  if(a.business) out.push('An unincorporated business may require creditor protections under item 6. Have the proposed order completed for that situation before filing.');
 }
 if(id==='de120') {
  if(a.notice_type==='de111') out.push('The opening DE-111 hearing requires DE-121, not DE-120.');
  if(!a.filer?.trim()) out.push('Add the person who filed the petition.');
  if(!a.description?.trim()) out.push('Add the full title and description of the petition being heard.');
  for(const k of ['case_number','hearing','hearing_time']) if(!a[k]) out.push(`Add the court-assigned ${k.replaceAll('_',' ')} before serving notice.`);
  if(!a.dept&&!a.room) out.push('Add the department or room assigned by the court before serving notice.');
  if(!recipients(a).length) out.push('Prepare the required recipient list; review DE-221 items 9–11 and requests for special notice.');
  if(recipients(a).some(x=>!x.address)) out.push('Each recipient needs a mailing address after the | separator.');
  if(a.service_mode==='completed') {
   if(!a.service_confirmed) out.push('The mailer must personally confirm the printed declarations. Otherwise the proof will remain blank.');
   for(const [k,label] of [['mailer','mailer’s name'],['mailer_address','mailer’s address'],['mailed','actual mailing date'],['mail_place','city and state of mailing'],['mail_method','mailing method'],['service_date','date the proof is signed']]) if(!a[k]) out.push(`Add the ${label}.`);
   if(!a.petition_copy) out.push('For a DE-221 hearing, review the requirement to mail a petition copy with the notice.');
   if(a.mailed&&a.hearing) {
    const days=(Date.parse(a.hearing+'T12:00:00Z')-Date.parse(a.mailed+'T12:00:00Z'))/86400000;
    if(days<15) out.push('The mailing date is less than 15 days before the hearing. Resolve notice timing before filing the proof.');
   }
  }
 }
 if(id==='de135') {
  if(!a.witness?.trim()) out.push('Add the handwriting witness’s name.');
  if(!a.witness_address?.trim()) out.push('Add the witness’s address.');
  if(!a.years?.trim()) out.push('Add how many years the witness knew the decedent.');
  if(!['saw_write','saw_document','letters','other'].some(k=>a[k])) out.push('Select a truthful basis for knowing the handwriting.');
  if(a.saw_document&&!a.document_details?.trim()) out.push('Describe the writing in item 3b.');
  if(a.other&&!a.other_details?.trim()) out.push('Describe the personal knowledge in item 3d.');
  if(!a.examined) out.push('The witness must examine and identify the entire instrument and its signature before signing.');
  if(!files.length) out.push('Attach a photographic copy of every page of this handwritten instrument as Attachment 4.');
 }
 return out;
}
export function proofReady(a){return a.service_mode==='completed'&&a.service_confirmed&&['mailer','mailer_address','mailed','mail_place','mail_method','service_date'].every(k=>a[k]);}
export function serviceDateError(a,now=new Date()) {
 for(const k of ['mailed','service_date']) if(a[k]&&Date.parse(a[k]+'T00:00:00')>now.getTime()) return 'Proof of mailing cannot certify a future mailing or signature date. Use the notice-only draft until mailing has occurred.';
 if(a.mailed&&a.service_date&&a.service_date<a.mailed) return 'The proof cannot be signed before mailing.';
 return '';
}

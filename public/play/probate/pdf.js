import {estate,longDate,recipients,proofReady,serviceDateError} from './model.js';
// Every suffix is checked against the pinned official templates in tests.
export async function buildPdf(P,template,fields,id,a,uploads=[]) {
 if(id==='de120'&&a.notice_type==='de111')throw Error('Use DE-121 for the opening DE-111 notice.');
 const doc=await P.PDFDocument.load(template), form=doc.getForm();
 const font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold);
 const notes=[];
 const clean=v=>{let out='';for(const c of String(v??'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\r/g,'')) {if(c==='\n'){out+=c;continue;}try{font.encodeText(c);out+=c;}catch{throw Error(`The form font cannot print “${c}”. Use a supported spelling for the PDF or complete that text in a PDF editor.`);}} return out;};
 function find(suffix,page) {const f=fields.filter(f=>f.name.endsWith(suffix)&&(!page||f.page===page));if(f.length!==1) throw Error(`Field mapping needs review: ${suffix} (${f.length} matches)`);return f[0];}
 function wrap(text,size,width) {
  const lines=[];
  for(const para of clean(text).split('\n')){let line='';for(const word of para.split(/\s+/).filter(Boolean)){
   if(font.widthOfTextAtSize(word,size)>width) {if(line){lines.push(line);line='';}let chunk='';for(const c of word){if(font.widthOfTextAtSize(chunk+c,size)>width){lines.push(chunk);chunk='';}chunk+=c;}line=chunk;continue;}
   const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;
  }lines.push(line);}return lines;
 }
 function set(suffix,value,page) {
  if(value===undefined||value===null||value===''||value===false)return;
  const meta=find(suffix,page);const f=form.getField(meta.name);
  if(value===true){f.check();return;}
  const text=clean(value),r=f.acroField.getWidgets()[0].getRectangle();
  const multi=f.isMultiline()||text.includes('\n');if(multi)f.enableMultiline();
  let size=9;while(size>=6){if(multi?wrap(text,size,r.width-4).length*size*1.2<=r.height-2:font.widthOfTextAtSize(text,size)<=r.width-4)break;size-=.5;}
  if(size<6)throw Error(`Text is too long for “${meta.label||suffix}”. Shorten that field or use an attachment; nothing was silently cut off.`);
  const max=f.getMaxLength();if(max!==undefined&&text.length>max)f.setMaxLength(text.length);
  f.setText(text);f.setFontSize(size);
 }
 const city=[a.c_city,[a.c_state,a.c_zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 const fullAddress=[a.c_street,city].filter(Boolean).join('\n');
 const countBefore=doc.getPageCount();
 function attachment(label,body) {
  if(!body?.trim())return;
  let page,y,num=0;
  function start(){page=doc.addPage([612,792]);num++;let heading=wrap(`Estate of ${estate(a)}`,9,350);let caseLines=wrap(`CASE NUMBER: ${a.case_number||''}`,9,165);let n=Math.max(heading.length,caseLines.length);if(n>5)throw Error('Estate caption or case number is too long.');heading.forEach((line,i)=>page.drawText(line,{x:36,y:752-i*11,size:9,font}));caseLines.forEach((line,i)=>page.drawText(line,{x:405,y:752-i*11,size:9,font}));y=752-n*11-20;page.drawText(label,{x:36,y,size:11,font:bold});y-=24;page.drawText(`${label}, page ${num}`,{x:36,y:32,size:8,font});}
  start();for(const line of wrap(body,10,540)){if(y<65)start();page.drawText(line,{x:36,y,size:10,font});y-=13;}
 }
 if(id==='de120') {
  const prefix='AttyPartyInfo[0].';
  for(const [s,v]of Object.entries({'Name[0]':a.c_name,'Street[0]':a.c_street,'City[0]':a.c_city,'State[0]':a.c_state,'Zip[0]':a.c_zip,'Phone[0]':a.c_phone,'Email[0]':a.c_email,'AttyFor[0]':'Self-Represented'}))set(prefix+s,v,1);
  for(const [s,v]of Object.entries({'CrtCounty[0]':a.county,'CrtStreet[0]':a.court_street,'CrtMailingAdd[0]':a.court_mailing,'CrtCityZip[0]':a.court_cityzip,'CrtBranch[0]':a.court_branch}))set('CourtInfo[0].'+s,v,1);
  for(const page of [1,2]) {set('name_cb[0]',true,page);set('status_cb[0]',true,page);set('name_tf[0]',estate(a),page);set('CaseNumber[0].CaseNumber[0]',a.case_number,page);}
  set('LI1[0].Name1[0]',a.filer,1);set('Capacity1[0]',a.capacity,1);set('Description1[0]',a.description,1);
  for(const [s,v]of Object.entries({'HearingDate[1]':longDate(a.hearing),'HearingTime[0]':a.hearing_time,'HearingDept[0]':a.dept,'HearingRm[0]':a.room,'HearingCourtAdd[0]':a.different_court}))set(s,v,1);
  if(proofReady(a)) {
   const error=serviceDateError(a);if(error)throw Error(error);
   set('Field2[0]',a.mailer_address,2);set(a.mail_method==='usps'?'CheckBox3a[0]':'CheckBox3b[0]',true,2);
   set('Datemail[0]',longDate(a.mailed),2);set('placemail[0]',a.mail_place,2);set('ServiceList5[0].LI1[0].CheckBoxCopy[0]',!!a.petition_copy,2);
   set('#area[0].Date[0]',longDate(a.service_date),2);set('PrintName[0]',a.mailer,2);
   const rows=recipients(a);
   for(const [i,row]of rows.slice(0,5).entries()){set(`servname${i+1}[0]`,row.name,2);set(`servaddy${i+1}[0]`,row.address,2);}
   if(rows.length>5){set('CheckBoxAttach[0]',true,2);attachment('DE-120: continuation of mailing recipients',rows.slice(5).map(x=>`${x.name}\n${x.address}`).join('\n\n'));}
  } else notes.push('Notice draft only: all proof-of-mailing entries are blank. Complete the proof after actual service.');
 } else if(id==='de135') {
  for(const[s,v]of Object.entries({'TEXT.0.0.0':a.c_name,'TEXT.0.0.1':a.c_street,'TEXT.0.0.2':city,'TEXT.0.3.0':a.c_phone,'TEXT.0.2.1.1':'Self-Represented','TEXT.0.6':a.county,'TEXT.0.7':a.court_street,'TEXT.0.8':a.court_mailing,'TEXT.0.9':a.court_cityzip,'TEXT.0.10':a.court_branch,'TEXT.0.12.0':estate(a),'TEXT.0.13.0':a.case_number,'TEXT.0.13.1':a.years,'TEXT.0.13.3':a.relationship,'CB.0.0':!!a.relationship,'CB.0.1':a.saw_write,'CB.0.2':a.saw_document,'TEXT.0.13.5':a.saw_document?a.document_details:'','CB.0.3':a.letters,'CB.0.4':a.other,'TEXT.0.13.7.1':a.other?a.other_details:'','TEXT.0.13.6.3':longDate(a.sign_date),'TEXT.0.13.7.3.0':a.witness,'TEXT.0.13.7.3.1.0.1':a.witness_address}))set(s,v);
  if(uploads.length)attachment("Attachment 4 to DE-135",`Complete photographic copy of ${a.instrument||"the handwritten instrument identified by the witness"}. The following pages are included in their original order. The witness must examine every page before signing.`);
  let pages=0;
  for(const upload of uploads){
   const data=upload.bytes;
   if(upload.type==='application/pdf'||upload.name.toLowerCase().endsWith('.pdf')){
    const source=await P.PDFDocument.load(data);const copied=await doc.copyPages(source,source.getPageIndices());for(const p of copied){doc.addPage(p);pages++;}
   } else {
    const img=upload.type==='image/png'?await doc.embedPng(data):await doc.embedJpg(data);const p=doc.addPage([612,792]);const scale=Math.min(576/img.width,730/img.height);p.drawImage(img,{x:(612-img.width*scale)/2,y:(792-img.height*scale)/2,width:img.width*scale,height:img.height*scale});pages++;
   }
  }
  if(pages)notes.push(`Attachment 4: ${pages} page(s) appended in your selected order. Verify the instrument is complete. Original uploaded PDFs were preserved.`);
 } else if(id==='de226') {
  for(const[s,v]of Object.entries({'Add1_ft[0]':a.c_name,'Add2_ft[0]':a.c_street,'Add3_ft[0]':city,'Tel_ft[0]':a.c_phone,'EMail_ft[0]':a.c_email,'EMail_ft[1]':'Self-Represented','Crtname_ft[0]':a.county,'CrtStreetAdd_ft[0]':a.court_street,'CrtMail_ft[0]':a.court_mailing,'CrtCityZip_ft[0]':a.court_cityzip,'CrtBranch[0]':a.court_branch,'Party_ft[0]':estate(a),'CaseNumber_ft[0]':a.case_number,'FillText103[0]':longDate(a.hearing),'FillText102[0]':a.hearing_time,'FillText100[0]':a.dept,'FillText101[0]':a.room,'FillText99[0]':longDate(a.d_date),'FillText98[0]':a.s_name}))set(s,v);
  if(a.partner){set(a.partner==='rdp'?'CheckBox21[1]':'CheckBox21[0]',true);set(a.partner==='rdp'?'CheckBox14[1]':'CheckBox14[0]',true);}
  if(a.d_lived)set(a.d_lived==='ca'?'CheckBox17[0]':'CheckBox17[1]',true);
  if(a.will)set(a.will==='no'?'CheckBox18[0]':'CheckBox18[1]',true);
  if(a.passing?.trim()){set('CheckBox11[0]',true);attachment('Attachment 5a to DE-226',a.passing);}
  if(a.confirmed?.trim()){set('CheckBox6[0]',true);attachment('Attachment 7a to DE-226',a.confirmed);}
  if(a.remaining?.trim()){set('CheckBox4[0]',true);set('CheckBox1[0]',true);attachment('Attachment 8 to DE-226',a.remaining);}
  if(a.orders?.trim()){set('CheckBox3[0]',true);set('CheckBox2[0]',true);attachment('Attachment 9 to DE-226',a.orders);}
  set('FillText140[0]',String(doc.getPageCount()-countBefore));

  notes.push('Proposed order only. Judicial date and signature remain blank. The judge decides whether to make the printed findings.');
 }
 form.updateFieldAppearances(font);
 doc.setTitle(`${id.toUpperCase()} draft - ${estate(a)}`);doc.setProducer('EvolveTech probate form helpers (pdf-lib)');
 return {bytes:await doc.save(),notes,pages:doc.getPageCount()};
}

// Where each DE-111 (Rev. July 1, 2017) answer goes: our key → the PDF field's full name.
// Keys follow the form's own numbering ("3g1d" is item 3g(1)(d)), so the map reads against the paper form.

const P1 = "topmostSubform[0].Page1[0].";
const HEAD = P1 + "StdP1Header_sf[0].";
const ATTY = HEAD + "AttyInfo[0].";
const COURT = HEAD + "CourtInfo[0].";
const TITLE = HEAD + "FormTitle[0].";
const P2 = "topmostSubform[0].Page2[0].Page2[0].";
const P3 = "topmostSubform[0].Page3[0].";
const P4 = "topmostSubform[0].Page4[0].";

export const FIELDS = {
  // Top box: attorney, or the petitioner when there is no attorney
  "atty.name": ATTY + "AttyName_ft[0]",
  "atty.bar": ATTY + "AttyBarNo_dc[0]",
  "atty.firm": ATTY + "AttyFirm_ft[0]",
  "atty.street": ATTY + "AttyStreet_ft[0]",
  "atty.city": ATTY + "AttyCity_ft[0]",
  "atty.state": ATTY + "AttyState_ft[0]",
  "atty.zip": ATTY + "AttyZip_ft[0]",
  "atty.phone": ATTY + "Phone_ft[0]",
  "atty.fax": ATTY + "Fax_ft[0]",
  "atty.email": ATTY + "Email_ft[0]",
  "atty.for": ATTY + "AttyFor_ft[0]",

  "court.county": COURT + "CrtCounty_ft[0]",
  "court.street": COURT + "Street_ft[0]",
  "court.mailing": COURT + "MailingAdd_ft[0]",
  "court.cityZip": COURT + "CityZip_ft[0]",
  "court.branch": COURT + "Branch_ft[0]",

  // "Estate of" and the case number repeat at the top of every page
  "estate.p1": HEAD + "TitlePartyName[0].Party1[0]",
  "estate.p2": P2 + "CaptionPx_sf[0].TitlePartyName[0].Party1[0]",
  "estate.p3": P3 + "PxCaption[0].TitlePartyName[0].Party1[0]",
  "estate.p4": P4 + "CaptionPx_sf[0].TitlePartyName[0].Party1[0]",
  "case.p1": HEAD + "CaseNumber[0].CaseNumber[0]",
  "case.p2": P2 + "CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]",
  "case.p3": P3 + "PxCaption[0].CaseNumber[0].CaseNumber[0]",
  "case.p4": P4 + "CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]",
  "hearing": HEAD + "CaseNumber[1].CaseNumber_ft[0]",
  "dept": HEAD + "CaseNumber[1].FillText121[0]",

  // PETITION FOR ...
  "title.probateLT": TITLE + "CheckBox23[0]",    // Probate of Will and for Letters Testamentary
  "title.lostLT": TITLE + "CheckBox23[1]",       // ... Lost Will ...
  "title.probateWWA": TITLE + "CheckBox22[0]",   // Probate of Will and for Letters of Administration with Will Annexed
  "title.lostWWA": TITLE + "CheckBox23[2]",
  "title.admin": TITLE + "CheckBox21[0]",        // Letters of Administration
  "title.special": TITLE + "CheckBox20[0]",      // Letters of Special Administration
  "title.specialGeneral": TITLE + "CheckBox17[0]",
  "title.iaea": TITLE + "CheckBox19[0]",         // Authorization to Administer Under the IAEA
  "title.iaeaLimited": TITLE + "CheckBox18[0]",

  // 1. Publication
  "1.newspaper": P1 + "FillText141[0]",
  "1a": P1 + "CheckBox1[0]",
  "1b": P1 + "CheckBox1[1]",

  // 2. Petitioner requests
  "2.petitioners": P1 + "FillText142[0]",
  "2a": P1 + "CheckBox3[0]",
  "2b.name": P1 + "FillText143[0]",
  "2b1": P1 + "CheckBox5[0]",
  "2b2": P1 + "CheckBox6[0]",
  "2b3": P1 + "CheckBox7[0]",
  "2b4": P1 + "CheckBox8[0]",
  "2b4.general": P1 + "CheckBox9[0]",
  "2c.full": P1 + "CheckBox12[0]",
  "2c.limited": P1 + "CheckBox12[1]",
  "2d1": P1 + "CheckBox11[0]",
  "2d2": P1 + "CheckBox13[0]",
  "2d2.amount": P1 + "FillText144[0]",
  "2d3": P1 + "CheckBox14[0]",
  "2d3.amount": P1 + "FillText145[0]",
  "2d3.institution": P1 + "FillText161[0]",

  // 3a-c. Death and residence
  "3a.date": P1 + "FillText146[0]",
  "3a.place": P1 + "FillText147[0]",
  "3a1": P1 + "CheckBox15[0]",
  "3a2": P1 + "CheckBox15[1]",
  "3a2.location": P1 + "FillText148[0]",
  "3b": P1 + "CheckBox81[0]",
  "3b.country": P1 + "TextField3g5[0]",
  "3c": P1 + "FillText149[0]",

  // 3d. Estimated value of the estate
  "3d1": P2 + "FillText162[0]",
  "3d2a": P2 + "FillText165[0]",
  "3d2b": P2 + "FillText164[0]",
  "3d3": P2 + "FillText163[0]",
  "3d4": P2 + "FillText173[0]",
  "3d5": P2 + "FillText173[1]",
  "3d6": P2 + "FillText178[0]",
  "3d7": P2 + "FillText177[0]",

  // 3e. Why no bond
  "3e1": P2 + "CheckBox73[0]",
  "3e1.special": P2 + "CheckBox72[0]",
  "3e2": P2 + "CheckBox74[0]",
  "3e3": P2 + "CheckBox75[0]",
  "3e4": P2 + "CheckBox76[0]",

  // 3f. The will
  "3f1": P2 + "CheckBox77[0]",
  "3f2": P2 + "CheckBox78[0]",
  "3f2.date": P2 + "FillText179[0]",
  "3f2.codicil": P2 + "CheckBox79[0]",
  "3f2.codicilDates": P2 + "FillText181[0]",
  "3f2.selfProving": P2 + "CheckBox57[0]",
  "3f3": P2 + "CheckBox57[1]",

  // 3g. Appointment
  "3g1a": P2 + "CheckBox58[0]",
  "3g1b": P2 + "CheckBox59[0]",
  "3g1c": P2 + "CheckBox60[0]",
  "3g1d": P2 + "CheckBox61[0]",
  "3g1d.death": P2 + "CheckBox63[0]",
  "3g1d.declination": P2 + "CheckBox62[0]",
  "3g1d.other": P2 + "CheckBox64[0]",
  "3g1d.reasons": P2 + "FillText182[0]",
  "3g1d.continued": P2 + "CheckBox65[0]",
  "3g2a": P2 + "CheckBox66[0]",
  "3g2b": P2 + "CheckBox67[0]",
  "3g2c": P2 + "CheckBox68[0]",
  "3g2c.relation": P2 + "FillTxt181[0]",
  "3g3": P2 + "CheckBox69[0]",
  "3g4": P2 + "CheckBox61[1]",

  // 3h. Where the proposed personal representative lives
  "3h1": P2 + "CheckBox70[0]",
  "3h2": P2 + "CheckBox70[1]",
  "3h2.address": P2 + "FillText183[0]",
  "3h3": P2 + "CheckBox81[0]",
  "3h4": P2 + "CheckBox81[1]",

  // 4. Will allows independent administration
  "4": P3 + "CheckBox56[0]",

  // 5. Spouse, partner, children
  "5a1": P3 + "CheckBox55[0]",
  "5a2": P3 + "CheckBox55[1]",
  "5a2a": P3 + "CheckBox53[0]",
  "5a2b": P3 + "CheckBox52[0]",
  "5a3": P3 + "CheckBox51[0]",
  "5a4": P3 + "CheckBox51[1]",
  "5a5": P3 + "CheckBox49[0]",
  "5a5a": P3 + "CheckBox48[0]",
  "5a5b": P3 + "CheckBox47[0]",
  "5a6": P3 + "CheckBox49[1]",
  "5a7": P3 + "CheckBox45[0]",
  "5a8": P3 + "CheckBox45[1]",
  "5b.was": P3 + "CheckBox43[0]",
  "5b.wasNot": P3 + "CheckBox43[1]",

  // 6. Other relatives (first box that applies)
  "6a": P3 + "CheckBox41[0]",
  "6b": P3 + "CheckBox40[0]",
  "6c": P3 + "CheckBox39[0]",
  "6d": P3 + "CheckBox38[0]",
  "6e": P3 + "CheckBox37[0]",
  "6f": P3 + "CheckBox36[0]",
  "6g": P3 + "CheckBox35[0]",
  "6h": P3 + "CheckBox34[0]",

  // 7. Spouse who died earlier
  "7a": P3 + "CheckBox33[0]",
  "7b": P3 + "CheckBox33[1]",
  "7b1": P3 + "CheckBox31[0]",
  "7b2": P3 + "CheckBox31[1]",
  "7b2a": P3 + "CheckBox29[0]",
  "7b2b": P3 + "CheckBox28[0]",
  "7b2c": P3 + "CheckBox27[0]",
  "7b2d": P3 + "CheckBox26[0]",
  "7b2e": P3 + "CheckBox25[0]",
  "7b3": P3 + "CheckBox24[0]",

  // 8-9. People to notify, attachments, signatures
  "8.continued": P4 + "CheckBox83[0]",
  "9.pages": P4 + "FillText277[0]",
  "9.attyDate": P4 + "FillText276[0]",
  "9.attyName": P4 + "FillText358[0]",
  "9.date": P4 + "FillText276[1]",
  "9.petitioner1": P4 + "FillText357[0]",
  "9.petitioner2": P4 + "FillText357[1]",
  "9.more": P4 + "CheckBox82[0]",
};

// Item 8's ten rows, top to bottom. The PDF numbers them 0, then 9 down to 1.
export const PEOPLE_ROWS = [0, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((i) => ({
  name: `${P4}FillText352[${i}]`,
  age: `${P4}FillText351[${i}]`,
  address: `${P4}FillText350[${i}]`,
}));

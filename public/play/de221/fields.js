// Where each DE-221 (Rev. January 1, 2014) answer goes: our key → the PDF field's full name.
// Keys follow the form's own numbering ("5a2.issue" is in item 5a(2)), so the map reads against the paper form.

const P1 = "DE-221[0].Page1[0].";
const P2 = "DE-221[0].Page2[0].";
const CAP = P1 + "P1Caption[0].";
const ATTY = CAP + "AttyPartyInfo[0].";
const COURT = CAP + "CourtInfo[0].";
const ROW = P2 + "List9[0].List[0].";
const SIG = P2 + "Signature[0].";

export const FIELDS = {
  // Top box: attorney, or the petitioner when there is no attorney
  "atty.block": ATTY + "Attorney[0]",
  "atty.phone": ATTY + "Phone[0]",
  "atty.fax": ATTY + "Fax[0]",
  "atty.email": ATTY + "Email[0]",
  "atty.for": ATTY + "AttorneyFor[0]",

  "court.county": COURT + "CrtCounty[0]",
  "court.street": COURT + "CrtStreet[0]",
  "court.mailing": COURT + "CrtMailingAdd[0]",
  "court.cityZip": COURT + "CrtCityZip[0]",
  "court.branch": COURT + "CrtBranch[0]",

  "estate.p1": CAP + "TitlePartyName[0].Name1[0]",
  "estate.p2": P2 + "PxCaption[0].TitlePartyName[0].Name1[0]",
  "case.p1": CAP + "Stamp[0].CaseNumber[0].CaseNumber[0]",
  "case.p2": P2 + "PxCaption[0].CaseNumber[0].CaseNumber[0]",
  "hearing": CAP + "Stamp[0].HearingDate[0].HearingDate[0]",
  "dept": CAP + "Dept[0].dept[0]",
  "time": CAP + "Dept[0].time[0]",

  // SPOUSAL / DOMESTIC PARTNER PROPERTY PETITION
  "title.spousal": CAP + "FormTitle[0].#area[0].CheckBoxCaption[0]",
  "title.partner": CAP + "FormTitle[0].#area[1].CheckBoxCaption[1]",

  // 1. What the petitioner asks for
  "1.petitioner": P1 + "List1[0].TextField[0]",
  "1a": P1 + "List1[0].LI1[0].#area[0].CheckBox1[0]",
  "1b": P1 + "List1[0].LI2[0].#area[0].CheckBox2[0]",
  "1c": P1 + "List1[0].LI3[0].#area[0].CheckBox3[0]",

  // 2. Who the petitioner is
  "2a": P1 + "List2[0].Itema[0].#area[0].CheckBox1[0]",
  "2b": P1 + "List2[0].Itemb[0].CheckBox1[0]",
  "2b.name": P1 + "List2[0].Itemb[0].name[0]",
  "2c": P1 + "List2[0].Itemc[0].#area[0].CheckBox1[0]",
  "2c.name": P1 + "List2[0].Itemc[0].#area[0].name[0]",
  "2d": P1 + "List2[0].Itemd[0].#area[0].CheckBox1[0]",
  "2e": P1 + "List2[0].Iteme[0].CheckBox1[0]",
  "2e.name": P1 + "List2[0].Iteme[0].TextField[0]",
  "2f": P1 + "List2[0].Itemf[0].CheckBox1[0]",
  "2f.name": P1 + "List2[0].Itemf[0].name[0]",

  // 3-4. Death, residence, will
  "3": P1 + "List3[0].Item[0].on_date[0]",
  "4a": P1 + "List4[0].Itema[0].#area[0].CheckBox1[0]",
  "4b": P1 + "List4[0].Itemb[0].#area[0].CheckBox1[0]",
  "4c.intestate": P1 + "List4[0].Itemc[0].#area[0].CheckBox1[0]",
  "4c.testate": P1 + "List4[0].Itemc[0].#area[0].#area[1].CheckBox2[0]",

  // 5-6. Family
  "5a1.none": P1 + "List5[0].ItemaSub[0].List5a1Sub[0].ItemsSub[0].#area[0].CheckBox1[0]",
  "5a1.child": P1 + "List5[0].ItemaSub[0].List5a1Sub[0].ItemsSub[0].#area[1].CheckBox2[0]",
  "5a1.natural": P1 + "List5[0].ItemaSub[0].List5a1Sub[0].ItemsSub[0].#area[2].CheckBox3[0]",
  "5a1.adoptedOut": P1 + "List5[0].ItemaSub[0].List5a1Sub[0].ItemsSub[0].#area[3].CheckBox4[0]",
  "5a2.none": P1 + "List5[0].ItemaSub[0].List5a2Sub[0].Item[0].#area[0].CheckBox1[0]",
  "5a2.issue": P1 + "List5[0].ItemaSub[0].List5a2Sub[0].Item[0].#area[1].CheckBox2[0]",
  "5b.is": P1 + "List5[0].ItembSub[0].#area[0].CheckBox1[0]",
  "5b.isNot": P1 + "List5[0].ItembSub[0].#area[1].CheckBox2[0]",
  "6a": P1 + "List6[0].ItemaSub[0].#area[0].CheckBox1[0]",
  "6b": P1 + "List6[0].ItembSub[0].#area[0].CheckBox2[0]",

  // 7-8. The property and any written agreement
  "7a": P1 + "List7[0].ItemaSub[0].#area[0].CheckBox1[0]",
  "7b": P2 + "List7[0].ItembSub[0].#area[0].CheckBox1[0]",
  "8.exists": P2 + "List8[0].Item[0].#area[0].CheckBoxCaption[0]",
  "8.none": P2 + "List8[0].Item[0].#area[1].CheckBoxCaption[1]",

  // 9-13
  "9.below": ROW + "#area[0].CheckBox1[0]",
  "9.attachment": ROW + "#area[1].CheckBox2[0]",
  "10.below": P2 + "List10[0].Item[0].#area[0].CheckBox1[0]",
  "10.attachment": P2 + "List10[0].Item[0].#area[1].CheckBox2[0]",
  "10.none": P2 + "List10[0].Item[0].#area[2].CheckBox3[0]",
  "10.text": P2 + "List10[0].Item[0].TextField[0]",
  "11": P2 + "List11[0].Item[0].#area[0].CheckBox[0]",
  "12a": P2 + "List12[0].Item1[0].#area[0].CheckBox1[0]",
  "12b": P2 + "List12[0].Item2[0].#area[0].CheckBox2[0]",
  "12b.date": P2 + "List12[0].Item2[0].on_date_ft[0]",
  "12c": P2 + "List12[0].Item3[0].#area[0].CheckBox3[0]",
  "13": P2 + "List13[0].Item[0].TextField[0]",

  // Signatures: the first pair is the attorney's, left blank without one
  "sig.attorneyDate": SIG + "SigDate1[0]",
  "sig.attorneyName": SIG + "SigName1[0]",
  "sig.date": SIG + "SigDate[0]",
  "sig.name": SIG + "SigName[0]",
};

// Item 9 has room for three people.
export const PEOPLE_ROWS = [1, 4, 7].map((n) => ({
  name: `${ROW}TextField${n}[0]`,
  age: `${ROW}TextField${n + 1}[0]`,
  address: `${ROW}TextField${n + 2}[0]`,
}));

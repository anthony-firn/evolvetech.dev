// The questions, in plain words, grouped into steps. app.js renders them; logic.js turns answers into the form.
//
// Question types: text, textarea, date, select, number, choice (one answer), multi (several), people (item 9 list),
// assets (property cards), note (text that can depend on answers). `when(a)` hides a question until it applies.
// `item` names the place on DE-221 so people can check the paper form.
import { hasWill, asksRelatives, isPartner, bond, separateShare, survivor, fill } from "./logic.js";

export const COUNTIES = ["Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa", "Del Norte",
  "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake", "Lassen", "Los Angeles",
  "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", "Mono", "Monterey", "Napa", "Nevada", "Orange",
  "Placer", "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino", "San Diego", "San Francisco",
  "San Joaquin", "San Luis Obispo", "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra",
  "Siskiyou", "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare", "Tuolumne", "Ventura", "Yolo",
  "Yuba"];

export const LINKS = {
  de111: "../de111/",
  formalProbate: "https://selfhelp.courts.ca.gov/probate/formal-probate",
  simpleTransfer: "https://selfhelp.courts.ca.gov/probate/simple-transfer",
  selfHelpCenters: "https://selfhelp.courts.ca.gov/self-help-centers",
  findCourt: "https://courts.ca.gov/find-my-court",
  hireLawyer: "https://selfhelp.courts.ca.gov/hire-lawyer",
  form: (id) => `https://selfhelp.courts.ca.gov/jcc-form/${id}`,
};

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

// The property cards. Titles marked here can go on the petition; the others pass some other way.
export const PETITION_TITLES = ["sole", "spouses_cp", "spouses_tic", "other_tic"];
export const KINDS = [
  { value: "real", label: "Real estate (house, condo, land)" },
  { value: "vehicle", label: "Vehicle (car, truck, RV, boat)" },
  { value: "account", label: "Bank, brokerage or other account" },
  { value: "business", label: "A business they ran that isn’t a corporation or LLC" },
  { value: "other", label: "Something else" },
];
export const LABEL_HINTS = {
  real: "The street address. If they owned only a share, say so: “One-half interest in 456 Sample Street, Fresno, California”.",
  vehicle: "Year, make, model and the last four digits of the VIN. List it even if there is still a loan.",
  account: "The bank and type of account, with only the last four digits of the number.",
  business: "Its name, any trade name, and what it does.",
  other: "Describe it so someone could identify it.",
};
export const TITLE_HINTS = {
  real: "Look at how the owners are named on the most recent recorded deed. Being in one name doesn’t decide who inherits, so read the next questions too.",
  vehicle: "Look at the title or registration. Owners joined by OR pass to the survivor, so choose joint tenants. For AND, choose tenants in common unless it says joint tenancy. A lender shown as legal owner doesn’t change this.",
  account: "Look at a recent statement, or ask the bank. Joint accounts and payable-on-death accounts usually pass outside this petition.",
  business: "Most sole proprietorships are in one person’s name.",
  other: "Choose the closest one.",
};
export const titleOptions = (a) => {
  const both = isPartner(a) ? "Both partners" : "Both spouses";
  return [
    { value: "sole", label: "Only the person who died" },
    { value: "spouses_cp", label: `${both} “as community property”` },
    { value: "cprs", label: `${both} “community property with right of survivorship”` },
    { value: "spouses_jt", label: `${both} “as joint tenants”` },
    { value: "spouses_tic", label: `${both}, some other way or not stated` },
    { value: "other_tic", label: "They and someone else, as tenants in common or not stated" },
    { value: "other_jt", label: "They and someone else “as joint tenants” (or OR on a vehicle)" },
    { value: "trust", label: "A living trust" },
    { value: "beneficiary", label: "A named beneficiary, payable-on-death or transfer-on-death" },
  ];
};
export const sourceOptions = (a) => {
  const word = bond(a).replace("registered domestic ", "");
  return [
    { value: "earnings", label: `During the ${word}, paid for with earnings or shared money` },
    { value: "elsewhere", label: `During the ${word}, with earnings, while living outside California` },
    { value: "before", label: `Before the ${word}` },
    { value: "gift", label: "As a gift or inheritance to them alone" },
    { value: "own_funds", label: `During the ${word}, paid for only with their own separate money` },
    { value: "mixed", label: "A mix of these" },
    { value: "unsure", label: "I’m not sure" },
  ];
};

export const STEPS = [
  {
    id: "person", title: "The person who died",
    intro: "Start with the basics from the death certificate.",
    questions: [
      { id: "d_name", type: "text", label: "Their full legal name", item: "Top of every page: “Estate of”",
        hint: "As it is on the death certificate. Courts often write it in capital letters.", autocomplete: "off" },
      { id: "d_aka", type: "text", label: "Other names they used (optional)", item: "“Estate of”",
        hint: "Include any name on a deed or account that differs, such as a short form like “Bob Smith”." },
      { id: "d_date", type: "date", label: "Date they died", item: "Item 3" },
      { id: "d_lived", type: "choice", label: "Where did they live?", item: "Item 4a or 4b", options: [
        { value: "ca", label: "In California" },
        { value: "outside", label: "Outside California, but they owned property in California",
          hint: "You file in the California county where the property is." }] },
      { id: "d_county", type: "select", label: "County they lived in", options: COUNTIES, when: (a) => a.d_lived === "ca",
        hint: "This is usually the county where you file, even if some property is in another county." },
    ],
  },
  {
    id: "survivor", title: "The surviving spouse or partner",
    intro: "The petition is filed by the surviving spouse or registered domestic partner. If you are a child or relative helping them, answer for them. They read and sign it.",
    questions: [
      { id: "partner", type: "choice", label: "The survivor was their", item: "Top of page 1", options: [
        { value: "spouse", label: "Spouse" },
        { value: "rdp", label: "Registered domestic partner", hint: "A partnership registered with the state, not just living together." }] },
      { id: "s_name", type: "text", label: "The survivor’s full legal name", item: "Items 1 and 2" },
      { id: "married_date", type: "date", label: (a) => (isPartner(a) ? "Date they registered their partnership" : "Date they married"), item: "Attachment 7",
        hint: "From the certificate. Courts compare this with when the property was bought." },
      { id: "married_place", type: "text", label: "City and state (optional)", item: "Attachment 7" },
      { id: "ended", type: "choice", label: (a) => `Was the ${bond(a)} ended by a court, or did a court order end their property rights?`, item: "Attachment 7",
        hint: "Living apart doesn’t count. A divorce, annulment or final order dividing all their property does.", options: YES_NO },
      { type: "note", tone: "warn", when: (a) => a.ended === "yes",
        text: "That person may not be a surviving spouse or partner under the law (Probate Code § 78). Talk to a lawyer before using this form." },
      { id: "filer", type: "choice", label: "Who is filing?", item: "Item 2", options: [
        { value: "self", label: "The survivor" },
        { value: "pr", label: "The personal representative of the survivor, who has since died" },
        { value: "guardian", label: "The survivor’s conservator or guardian of the estate" }] },
      { id: "filer_name", type: "text", label: "That person’s full name", item: "Item 1", when: (a) => a.filer !== "self" },
    ],
  },
  {
    id: "will", title: "The will",
    intro: "What the will says decides much of what can pass through this petition. A living trust is different: property in a trust isn’t handled here.",
    questions: [
      { id: "will", type: "choice", label: "Did they leave a will?", item: "Item 4c", options: [
        { value: "yes", label: "Yes, and I have the original" },
        { value: "lost", label: "Yes, but the original can’t be found" },
        { value: "no", label: "No will" }] },
      { type: "note", when: hasWill, tone: "info",
        text: "Whoever has the original will must give it to the court clerk within 30 days after the death (Probate Code § 8200). Keep a copy to attach to this form." },
      { id: "will_date", type: "date", label: "Date the will was signed", item: "Attachment 7", when: hasWill },
      { id: "codicil", type: "choice", label: "Are there any codicils?", item: "Attachment 4c", when: hasWill, options: YES_NO,
        hint: "A codicil is a signed change added to a will later." },
      { id: "codicil_dates", type: "text", label: "Date of each codicil", when: (a) => hasWill(a) && a.codicil === "yes",
        hint: "For example “June 1, 2021 and May 3, 2023”." },
      { id: "will_handwritten", type: "choice", label: "Is the will handwritten?", item: "Attachment 4c", when: hasWill, options: [
        { value: "no", label: "No, it is typed or printed" },
        { value: "yes", label: "Yes, all or mostly in their handwriting" }] },
      { id: "will_foreign", type: "choice", label: "Is it written in a language other than English?", item: "Attachment 4c",
        when: hasWill, options: YES_NO },
      { id: "will_gives", type: "choice", label: (a) => `What does the will give the ${survivor(a)}?`, item: "Attachment 7", when: hasWill, options: [
        { value: "all", label: "Everything, with no strings attached" },
        { value: "some", label: "Some property, with the rest going to other people", hint: "You’ll say who gets each item on the property step." },
        { value: "trust", label: "Property in a trust, or only for life or with other limits",
          hint: "Property left that way goes through probate instead (Probate Code § 13501)." },
        { value: "none", label: "Nothing" }] },
      { id: "executors", type: "textarea", label: "Executors named in the will, and any personal representative already appointed (optional)", item: "Item 10",
        when: hasWill, hint: "Each person’s name and address. Include backups named in the will. Leave blank if there are none." },
      { id: "trustee", type: "choice", label: "Is the petitioner the trustee of a trust that receives property under the will?", item: "Item 11",
        when: hasWill, options: YES_NO, hint: "Most people choose No." },
      { id: "trust_people", type: "textarea", label: "Everyone interested in that trust, with addresses", item: "Attachment 11",
        when: (a) => hasWill(a) && a.trustee === "yes" },
    ],
  },
  {
    id: "family", title: "Family",
    intro: "The court needs to know who would inherit by law, even when there is a will. Everyone counted here gets notice and can object. Answer about people alive when the person died.",
    questions: [
      { id: "children", type: "choice", label: "Did they have any children who were alive when they died?", item: "Item 5a(1)",
        options: YES_NO, hint: "Count adopted children too, and children from an earlier relationship." },
      { id: "child_count", type: "choice", label: "How many?", when: (a) => a.children === "yes", options: [
        { value: "one", label: "One" }, { value: "many", label: "Two or more" }] },
      { id: "child_kinds", type: "multi", label: "Which describes their children?", item: "Item 5a(1)",
        when: (a) => a.children === "yes", options: [
          { value: "natural", label: "Children born to them or adopted by them" },
          { value: "adopted_out", label: "A child born to them who was later adopted by someone else" }] },
      { id: "grandkids", type: "choice", label: "Did any of their children die before them, leaving children of their own who are alive?",
        item: "Item 5a(2)", options: YES_NO, hint: "These are grandchildren whose parent died first." },
      { id: "grandkid_lines", type: "choice", label: "How many of their children died leaving descendants?", when: (a) => a.grandkids === "yes",
        options: [{ value: "one", label: "One" }, { value: "many", label: "Two or more" }] },
      { id: "stepchild", type: "choice", label: "Was there a stepchild or foster child they would have adopted if something legal hadn’t stopped them?",
        item: "Item 5b", options: [{ value: "is_not", label: "No" }, { value: "is", label: "Yes" }],
        hint: "This is uncommon (Probate Code § 6454). Most people choose No." },
      { id: "relatives", type: "choice", label: "Who are their closest living relatives? Choose the first one that is true.",
        item: "Item 6", when: asksRelatives, options: [
          { value: "a", label: "A parent (mother or father)" },
          { value: "b", label: "Brothers or sisters, or their children or grandchildren" },
          { value: "none", label: "Neither of these" }] },
      { type: "note", tone: "info", when: (a) => a.will === "no", text: (a) => {
        const share = separateShare(a);
        if (!share) return "";
        const who = survivor(a);
        return share.words === "all"
          ? `With no will and this family, the ${who} inherits all of the decedent’s community and separate property.`
          : `With no will and this family, the ${who} inherits all of the decedent’s share of community property, but only <strong>${share.words}</strong> of their separate property (Probate Code § 6401). The relatives inherit the rest of the separate property, and that part can’t go through this petition.`;
      } },
    ],
  },
  {
    id: "property", title: "What they owned",
    intro: "List everything, even property you think stays off the petition. Each card tells you where that item goes. You don’t need dollar values for this form.",
    questions: [
      { type: "note", tone: "plain",
        text: "<strong>Being in one name doesn’t make it separate.</strong> Property acquired during a marriage is presumed community property, no matter whose name is on the title (Family Code § 760).<br><strong>A mortgage doesn’t stop this.</strong> You don’t list the loan. It stays with the property, and the payments have to continue.<br><strong>Living there doesn’t matter.</strong> This petition isn’t limited to the home they lived in. A rental, or a share of someone else’s house, can go on it if that interest passes to the survivor." },
      { id: "assets", type: "assets", label: "Property", item: "Attachments 7, 7a and 7b" },
      { type: "note", tone: "total", text: (a) => {
        const { passing, confirmed, placed, remains } = fill(a);
        if (!placed.length) return "";
        const left = placed.filter(({ p }) => p.route === "leave").length;
        const open = placed.filter(({ p }) => p.route === "unsure").length;
        return `<dl class="totals"><dt>On Attachment 7a (passing to the survivor)</dt><dd>${passing.length}</dd>` +
          `<dt>On Attachment 7b (already the survivor’s)</dt><dd>${confirmed.length}</dd>` +
          `<dt>Passing outside this petition</dt><dd>${left}</dd>` +
          `<dt>Needing probate for some or all</dt><dd>${remains.length}</dd>` +
          `<dt>Still to work out</dt><dd>${open}</dd></dl>`;
      } },
    ],
  },
  {
    id: "extras", title: "Agreements and other requests",
    questions: [
      { id: "agreement", type: "choice", label: "Did they sign a written agreement dividing their community property unevenly?", item: "Item 8", options: YES_NO,
        hint: "This means an agreement that one spouse gets more than half overall. A prenuptial or postnuptial agreement can also change what counts as community property, so if there is one, have a lawyer read it first." },
      { id: "referee", type: "choice", label: "Do you want a probate referee right away?", item: "Item 1c", options: YES_NO,
        hint: "A probate referee is a court-appointed appraiser. Someone might ask for one to value property, for example for taxes. Most people choose No." },
      { id: "facts_extra", type: "textarea", label: "Anything else the court should know? (optional)", item: "Attachment 7",
        hint: "This tool writes Attachment 7 from your answers. Add any other facts that show why the property passes to the survivor. You can read the full text before downloading." },
    ],
  },
  {
    id: "people", title: "People to notify",
    intro: "Everyone you list here gets a notice of the hearing and a chance to object. The court checks this list closely.",
    questions: [
      { type: "note", tone: "plain", text: (a) => {
        const list = [];
        if (a.children === "yes") list.push("Every child");
        if (a.grandkids === "yes") list.push("The children of any child who died before them");
        if (hasWill(a)) list.push("Everyone named in the will or codicils, even people who have died. Mark them as deceased.");
        if (asksRelatives(a) && a.relatives === "a") list.push("Their parent or parents");
        if (asksRelatives(a) && a.relatives === "b") list.push("Their brothers and sisters, and the children of any who have died");
        if (!list.length) list.push("Anyone you counted on the family step");
        return `<strong>Be sure to include:</strong><ul>${list.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      } },
      { id: "people", type: "people", label: "People", item: "Item 9" },
    ],
  },
  {
    id: "court", title: "Court",
    questions: [
      { id: "county", type: "select", label: "Which county court will you file in?", item: "Top of page 1", options: COUNTIES,
        hint: "The county where they lived. If they lived outside California, the county where their property is. Property in another county still goes on this petition." },
      { type: "note", tone: "plain",
        text: `Find the court’s address on the county court’s website (<a href="${LINKS.findCourt}" target="_blank" rel="noopener">find your court</a>). Large counties have several courthouses; use the one that handles probate.` },
      { id: "court_street", type: "text", label: "Court street address", item: "Top of page 1" },
      { id: "court_mailing", type: "text", label: "Court mailing address (if different)", item: "Top of page 1" },
      { id: "court_cityzip", type: "text", label: "Court city and ZIP code", item: "Top of page 1" },
      { id: "court_branch", type: "text", label: "Branch name (if any)", item: "Top of page 1" },
      { id: "probate", type: "choice", label: "Is anyone filing for probate of this estate?", item: "Item 12", options: [
        { value: "none", label: "No", hint: "Nothing has been filed and nothing is being filed with this." },
        { value: "with", label: "Yes, a Petition for Probate (DE-111) is being filed with this",
          hint: "The two are filed as separate petitions under the same case number (Rules of Court, rule 7.301)." },
        { value: "filed", label: "Yes, one was already filed", hint: "File this in that case. No additional fee applies (Probate Code § 13652)." }] },
      { id: "probate_date", type: "date", label: "Date it was filed", item: "Item 12b", when: (a) => a.probate === "filed" },
      { id: "case_number", type: "text", label: "Case number (optional)", item: "Top of every page",
        hint: "The clerk usually gives you one when you file. Leave blank unless a case is already open." },
      { id: "hearing", type: "text", label: "Hearing date (optional)", item: "Top of page 1", hint: "Leave blank unless the court already gave you one." },
      { id: "dept", type: "text", label: "Department (optional)", item: "Top of page 1", short: true },
      { id: "hearing_time", type: "text", label: "Hearing time (optional)", item: "Top of page 1", short: true },
    ],
  },
  {
    id: "you", title: "Your contact details and signing",
    intro: "Without a lawyer, the petitioner’s details go in the box at the top of page 1, and the form says “Self-Represented”.",
    questions: [
      { id: "c_name", type: "text", label: "Petitioner’s full name", item: "Top of page 1", autocomplete: "name" },
      { id: "c_street", type: "text", label: "Street address", item: "Top of page 1", autocomplete: "street-address" },
      { id: "c_city", type: "text", label: "City", item: "Top of page 1", autocomplete: "address-level2" },
      { id: "c_state", type: "text", label: "State", item: "Top of page 1", short: true, autocomplete: "address-level1" },
      { id: "c_zip", type: "text", label: "ZIP code", item: "Top of page 1", short: true, inputmode: "numeric", autocomplete: "postal-code" },
      { id: "c_phone", type: "text", label: "Phone", item: "Top of page 1", inputmode: "tel", autocomplete: "tel" },
      { id: "c_email", type: "text", label: "Email (optional)", item: "Top of page 1", inputmode: "email", autocomplete: "email" },
      { id: "extra_pages", type: "number", label: "How many pages will you attach yourself? (optional)", item: "Item 13",
        hint: "Count the will copy, codicils and any agreement. Pages this tool adds are counted for you." },
      { id: "sign_date", type: "date", label: "Date you will sign (optional)", item: "Page 2",
        hint: "You can leave this blank and write the date by hand when you sign." },
      { type: "note", tone: "warn",
        text: "The petitioner signs page 2 by hand, under “I declare under penalty of perjury”. That covers the attachments too, so read every statement and fix anything that isn’t true." },
    ],
  },
];

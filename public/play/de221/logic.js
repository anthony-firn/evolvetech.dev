// Plain answers → what DE-221 says. Pure functions, shared by the page and the tests.
//
// `place(asset, answers)` works out where one piece of property goes. `fill(answers)` returns
// { values, people, attachment9, facts, passing, confirmed, placed, attachments, warnings, notes }.
// values maps keys from fields.js to text, or to true for a checked box.

export const ROWS_ON_FORM = 3;
export const ROWS_PER_ATTACHMENT_PAGE = 14;

export const BLANK = {
  // The person who died
  d_name: "", d_aka: "", d_date: "", d_lived: "ca", d_county: "",
  // The surviving spouse or partner
  partner: "spouse", s_name: "", married_date: "", married_place: "", ended: "",
  filer: "self", filer_name: "",
  // The will
  will: "", will_date: "", codicil: "no", codicil_dates: "", will_handwritten: "no", will_foreign: "no",
  will_gives: "", executors: "", trustee: "no", trust_people: "",
  // Family
  children: "", child_count: "", child_kinds: ["natural"], grandkids: "", grandkid_lines: "", stepchild: "is_not",
  relatives: "",
  // Property
  assets: [],
  agreement: "no", referee: "no", facts_extra: "", facts_override: "",
  // People to notify
  people: [],
  // Court
  probate: "none", probate_date: "", county: "", court_street: "", court_mailing: "", court_cityzip: "", court_branch: "",
  case_number: "", hearing: "", dept: "", hearing_time: "",
  // Contact and signing
  c_name: "", c_street: "", c_city: "", c_state: "CA", c_zip: "", c_phone: "", c_email: "",
  extra_pages: "", sign_date: "",
};

export const BLANK_ASSET = {
  kind: "real", label: "", legal: "", apn: "", title: "", share: "", co_owner: "", source: "", acquired: "", funds: "",
  deed: false, will_to: "", basis: "", recorded: "", document_number: "", title_wording: "",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];

export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : (iso || "").trim();
}

export function amount(text) {
  const n = parseFloat(String(text ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const hasWill = (a) => a.will === "yes" || a.will === "lost";
export const hasIssue = (a) => a.children === "yes" || a.grandkids === "yes";
export const asksRelatives = (a) => a.children === "no" && a.grandkids === "no";
export const isPartner = (a) => a.partner === "rdp";
// What the form calls the survivor, and the shorter word for the marriage or partnership.
export const survivor = (a) => (isPartner(a) ? "surviving registered domestic partner" : "surviving spouse");
export const bond = (a) => (isPartner(a) ? "registered domestic partnership" : "marriage");
export const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`);
export const filerName = (a) => (a.filer === "self" ? a.s_name.trim() : a.filer_name.trim());

export function estateName(a) {
  const name = a.d_name.trim();
  return a.d_aka.trim() ? `${name}, also known as ${a.d_aka.trim()}` : name;
}

// Prob. Code § 6401(c): the survivor's share of separate property when there is no will. Null until family is answered.
export function separateShare(a) {
  const lines = (a.children === "yes" ? (a.child_count === "many" ? 2 : 1) : 0) +
    (a.grandkids === "yes" ? (a.grandkid_lines === "many" ? 2 : 1) : 0);
  if (a.children === "" || a.grandkids === "") return null;
  if ((a.children === "yes" && !a.child_count) || (a.grandkids === "yes" && !a.grandkid_lines)) return null;
  if (lines >= 2) return { words: "one-third", sentence: "more than one child, or their descendants, survived" };
  if (lines === 1) return { words: "one-half", sentence: "one child, or that child’s descendants, survived" };
  if (a.relatives === "") return null;
  if (a.relatives === "none") return { words: "all", sentence: "no children, parents, brothers, sisters or their descendants survived" };
  return { words: "one-half", sentence: "no children survived, but a parent or a brother, sister or their descendants did" };
}

// How property titled each way leaves the estate. These never go on the petition.
const OUTSIDE = {
  other_jt: (x) => `It passes to the surviving joint tenant${x.co_owner.trim() ? `, ${x.co_owner.trim()},` : ""} without a court case. For real estate, that person records an Affidavit of Death of Joint Tenant with a death certificate (Probate Code § 210).`,
  spouses_jt: (x, a) => `It passes to the ${survivor(a)} as joint tenant, without this petition. For real estate, record an Affidavit of Death of Joint Tenant with a death certificate (Probate Code § 210).`,
  cprs: (x, a) => `It passes to the ${survivor(a)} without this petition, the same way joint tenancy does (Civil Code § 682.1).`,
  trust: () => "It follows the trust’s terms, not this petition. The successor trustee handles it.",
  beneficiary: () => "It goes to the named beneficiary directly. Contact the bank, insurer or DMV with a death certificate.",
};

// Text used when the interest is less than the whole property.
const INTEREST = { community: "community property", quasi: "quasi-community property" };

function character(x) {
  // Acquisition facts do not establish legal character. Saved answers must be reviewed too.
  if (x.basis === "will") return "unknown";
  return { community: "community", quasi: "quasi", separate: "separate" }[x.basis] || "unknown";
}

// Does the decedent's interest in this asset go to the survivor? Returns true, false, or null when we can't tell yet.
function byWill(x, a) {
  if (a.will_gives === "all") return true;
  if (a.will_gives === "none" || a.will_gives === "trust") return false;
  if (a.will_gives === "some") return { spouse: true, other: false }[x.will_to] ?? null;
  return null;
}

function held(x) {
  if (x.title === "other_tic") return Math.min(100, amount(x.share)) || 0;
  return 100;
}

// Where one asset goes. route: "leave" (never on the petition), "petition" (7a and/or 7b), or "unsure" (not listed yet).
export function place(x, a) {
  x = { ...BLANK_ASSET, ...x };
  const notes = [];
  const out = { route: "unsure", character: character(x), passing: null, confirmed: null, remains: null, headline: "", reason: "", notes };
  const spouse = survivor(a);

  if (!x.title) { out.headline = "Choose how title is held to see where this goes."; return out; }
  if (OUTSIDE[x.title]) {
    out.route = "leave";
    out.headline = "Leave this off the petition.";
    out.reason = OUTSIDE[x.title](x, a);
    if (x.title === "other_jt") notes.push("If marital money paid for the share, ask a lawyer whether the spouse has a claim.");
    if (x.title === "spouses_jt" || x.title === "cprs") notes.push("If this was really community property, a court finding can matter for taxes on a later sale. Ask a tax professional before skipping it.");
    return out;
  }
  if (x.deed && x.basis !== "will") notes.push("A deed or agreement like that can make property separate (Family Code § 852). Have a lawyer read it before you swear this is community property.");
  if (x.source === "mixed") notes.push("Property bought before the marriage but paid down with earnings during it can be part community and part separate. Ask a lawyer how to describe it.");

  const share = held(x);
  if (x.title === "other_tic" && (!share || amount(x.share) > 100)) { out.headline = "Enter the share they owned to see where this goes."; return out; }
  const part = share < 100 ? ` the ${share}% interest held in the decedent’s name` : "";
  const kind = out.character;
  if (!x.basis) {
    out.headline = "Choose the legal basis after reviewing the deed and ownership facts. Acquisition during marriage alone does not settle this.";
    return out;
  }
  if (x.basis === "will" && !hasWill(a)) {
    out.headline = "The will-only request requires a will giving this interest to the survivor.";
    return out;
  }
  if ((kind === "community" || kind === "quasi") && a.agreement === "yes") {
    out.headline = "The unequal-property agreement needs individual review before the interests can be listed. This helper cannot assume each person owns half.";
    return out;
  }
  if (kind === "quasi" && a.d_lived === "outside") {
    out.headline = "Review the applicable state law before claiming quasi-community property for a nonresident decedent.";
    return out;
  }
  const will = hasWill(a);
  if (!a.will) { out.headline = "Answer the will questions to see where this goes."; return out; }
  const toSpouse = will ? byWill(x, a) : null;
  if (will && !a.will_gives) { out.headline = "Answer what the will gives the survivor to see where this goes."; return out; }
  if (will && toSpouse === null) { out.headline = "Choose who the will gives this to."; return out; }

  if (kind === "community" || kind === "quasi") {
    const words = INTEREST[kind];
    const home = share < 100 ? `the decedent’s one-half of${part}, which is ${words}` : `the decedent’s one-half interest in this ${words}`;
    const own = share < 100 ? `the ${spouse}’s one-half of${part}, which is ${words}` : `the ${spouse}’s one-half interest in this ${words}`;
    out.route = "petition";
    out.confirmed = own;
    const section = kind === "community" ? 100 : 101;
    const owns = `The ${spouse} already owns one-half${share < 100 ? " of that interest" : ""} under Probate Code § ${section}.`;
    if (!will) {
      out.passing = home;
      out.reason = `${owns} The decedent’s one-half passes to the ${spouse} under Probate Code § 6401(${kind === "community" ? "a" : "b"}).`;
    } else if (toSpouse) {
      out.passing = home;
      out.reason = `${owns} The decedent’s one-half passes to the ${spouse} under the decedent’s will.`;
    } else {
      out.remains = `the decedent’s one-half${part ? ` of${part}` : ""}`;
      out.reason = `${owns} The decedent’s one-half does not pass to the ${spouse} and remains subject to administration.`;
    }
    out.headline = out.passing ? "Goes on Attachments 7a and 7b." : "The survivor’s half goes on Attachment 7b. The other half needs probate.";
    return out;
  }

  if (kind === "separate" || (will && toSpouse)) {
    const name = kind === "separate" ? "separate property interest" : "interest";
    const whole = `the decedent’s entire ${name}${part ? `, being${part}` : ""}`;
    out.route = "petition";
    if (will) {
      if (toSpouse) {
        out.passing = whole;
        out.reason = `The decedent’s interest passes to the ${spouse} under the decedent’s will.`;
        out.headline = "Goes on Attachment 7a.";
        if (kind === "unknown") notes.push("This draft requests only the decedent’s interest under the will. It does not determine or confirm any interest the survivor already owns; review that issue before filing.");
      } else {
        out.route = "probate";
        out.remains = whole;
        out.headline = "This doesn’t pass to the survivor, so it needs probate.";
        out.reason = "The will gives it to someone else.";
      }
      return out;
    }
    const portion = separateShare(a);
    if (!portion) { out.route = "unsure"; out.headline = "Answer the family questions to see where this goes."; return out; }
    if (portion.words === "all") {
      out.passing = whole;
      out.reason = `With no will, all of the decedent’s separate property passes to the ${spouse} because ${portion.sentence} (Probate Code § 6401(c)).`;
      out.headline = "Goes on Attachment 7a.";
      return out;
    }
    const interest = `the decedent’s separate property interest${part ? `, being${part}` : ""}`;
    const rest = portion.words === "one-half" ? "one-half" : "two-thirds";
    out.passing = `${portion.words} of ${interest}`;
    out.remains = `${rest} of ${interest}`;
    out.reason = `With no will, ${portion.words} of the decedent’s separate property passes to the ${spouse} because ${portion.sentence} (Probate Code § 6401(c)). The other ${rest} does not pass to the ${spouse} and remains subject to administration.`;
    out.headline = `${portion.words[0].toUpperCase()}${portion.words.slice(1)} goes on Attachment 7a. The other ${rest} goes to the children or other relatives and needs probate or another route.`;
    return out;
  }

  out.headline = kind === "unknown" && x.source
    ? "Work out whether this is community or separate property before listing it."
    : "Say how they got it to see where this goes.";
  return out;
}

const describe = (x) => [`${x.label.trim().replace(/\.$/, "")}.`, x.kind === "real" && x.apn.trim() ? `Assessor’s Parcel Number ${x.apn.trim()}.` : "",
  x.kind === "real" && x.legal.trim() ? `Legal description: ${x.legal.trim()}` : ""].filter(Boolean).join(" ");

function titleSentence(x, a) {
  const spouse = survivor(a);
  return {
    sole: "Title is in the decedent’s name alone.",
    spouses_cp: `Title is held by the decedent and the ${spouse} as community property.`,
    spouses_tic: `Title is held by the decedent and the ${spouse}.`,
    other_tic: `The decedent held a ${held(x)}% interest as a tenant in common${x.co_owner.trim() ? ` with ${x.co_owner.trim()}` : ""}.`,
  }[x.title] || "";
}

function sourceSentence(x) {
  const when = { earnings: "during the marriage, with earnings or shared funds",
    elsewhere: "during the marriage, while the couple lived outside California, with funds that would have been community property had they lived in California",
    before: "by the decedent before the marriage", gift: "by the decedent as a gift or inheritance",
    own_funds: "with the decedent’s separate funds" }[x.source];
  const date = x.acquired ? ` on ${longDate(x.acquired)}` : "";
  return when ? `It was acquired${date} ${when}.` : (date ? `It was acquired${date}.` : "");
}

const CHARACTER_WORDS = { community: "It is community property.", quasi: "It is quasi-community property.",
  separate: "It is the decedent’s separate property.", unknown: "" };

function marriageFact(a) {
  const place = a.married_place.trim() ? ` in ${a.married_place.trim()}` : "";
  const when = a.married_date ? ` on ${longDate(a.married_date)}${place}` : place;
  const who = a.s_name.trim() || `The ${survivor(a)}`;
  const verb = isPartner(a) ? `${who} and the decedent registered their domestic partnership${when}` : `${who} and the decedent married${when}`;
  // These sentences are sworn, so they only appear when the person told us they are true.
  if (a.ended !== "no") return `${verb}. The decedent died${a.d_date ? ` on ${longDate(a.d_date)}` : ""}.`;
  return `${verb}, and remained ${isPartner(a) ? "registered domestic partners" : "married"} until the decedent died${a.d_date ? ` on ${longDate(a.d_date)}` : ""}. ` +
    `The ${bond(a)} was never ended by ${isPartner(a) ? "termination" : "divorce"} or annulment, and no court order ended their property rights.`;
}

function willFact(a) {
  if (!a.will) return "";
  if (!hasWill(a)) return "The decedent died without a will.";
  const dated = a.will_date ? ` dated ${longDate(a.will_date)}` : "";
  const gives = { all: `The will gives all of the decedent’s property outright to the ${survivor(a)}.`,
    some: `The will gives part of the decedent’s property to the ${survivor(a)}, as stated below.`,
    none: `The will does not give the property below to the ${survivor(a)}.`,
    trust: `The will leaves the ${survivor(a)}’s share in trust or with limits.` }[a.will_gives] || "";
  return `The decedent left a will${dated}, a copy of which is Attachment 4c.${a.codicil === "yes" ? ` The codicil(s)${a.codicil_dates ? ` dated ${a.codicil_dates}` : ""} are also included in Attachment 4c.` : ""} ${gives}`.trim();
}

function factsFor(a, listed) {
  const items = listed.map(({ x, p, tag }) => [`Item ${tag}: ${x.label.trim() || "(not described)"}.`, titleSentence(x, a), sourceSentence(x),
    x.recorded ? `The deed was recorded on ${longDate(x.recorded)}${x.document_number ? ` as Document No. ${x.document_number}` : ""}.` : "",
    x.title_wording ? `The deed describes title as: ${x.title_wording}.` : "",
    x.funds.trim() ? `Funds used: ${x.funds.trim().replace(/\.$/, "")}.` : "", CHARACTER_WORDS[p.character], p.reason]
    .filter(Boolean).join(" "));
  return [marriageFact(a), willFact(a), ...items, a.facts_extra.trim()].filter(Boolean);
}

export function personRow(p) {
  const name = [p.name, p.relation].map((s) => (s || "").trim()).filter(Boolean).join(", ");
  if (p.deceased) return { name, age: "", address: "Deceased" };
  return { name, age: p.adult ? "Adult" : String(p.age || "").trim(), address: (p.address || "").trim() };
}

export function fill(answers) {
  const a = { ...BLANK, ...answers };
  const v = {};
  const warnings = [];
  const notes = [];
  const attachments = [];
  const set = (key, value) => { if (value !== "" && value != null && value !== false) v[key] = value; };
  const will = hasWill(a);
  const name = filerName(a);

  // Top box: a self-represented petitioner puts their own contact details here.
  const who = a.c_name.trim() || name;
  const town = `${a.c_city.trim()}${a.c_city.trim() ? ", " : ""}${a.c_state.trim().toUpperCase().slice(0, 2)} ${a.c_zip.trim()}`.trim();
  set("atty.block", [who, a.c_street.trim(), town].filter(Boolean).join("\n"));
  set("atty.phone", a.c_phone.trim());
  set("atty.email", a.c_email.trim());
  set("atty.for", "Self-Represented");
  set("court.county", a.county.trim().toUpperCase());
  set("court.street", a.court_street.trim());
  set("court.mailing", a.court_mailing.trim());
  set("court.cityZip", a.court_cityzip.trim());
  set("court.branch", a.court_branch.trim());
  for (const page of [1, 2]) {
    set(`estate.p${page}`, estateName(a));
    set(`case.p${page}`, a.case_number.trim());
  }
  set("hearing", a.hearing.trim());
  set("dept", a.dept.trim());
  set("time", a.hearing_time.trim());
  set(isPartner(a) ? "title.partner" : "title.spousal", true);

  // Where each piece of property goes
  const placed = a.assets.filter((x) => (x.label || "").trim()).map((x, i) => ({ x: { ...BLANK_ASSET, ...x }, p: place(x, a), tag: letter(i) }));
  const passing = placed.filter(({ p }) => p.passing).map(({ x, p, tag }) => ({ tag, text: describe(x), interest: p.passing }));
  const confirmed = placed.filter(({ p }) => p.confirmed).map(({ x, p, tag }) => ({ tag, text: describe(x), interest: p.confirmed }));
  const remains = placed.filter(({ p }) => p.remains);
  const listed = placed.filter(({ p }) => p.route === "petition");
  for (const { x, p, tag } of placed) {
    if (p.route === "unsure") warnings.push(`Item ${tag}, ${x.label.trim()}: ${p.headline} It isn’t on the petition yet.`);
    if (x.kind === "real" && (p.passing || p.confirmed)) {
      if (!x.legal.trim()) warnings.push(`Item ${tag}, ${x.label.trim()}: add the legal description from the deed. The form requires it for real estate.`);
      if (!x.apn.trim()) warnings.push(`Item ${tag}, ${x.label.trim()}: add the Assessor’s Parcel Number. The form requires it for real estate.`);
    }
    if (p.passing && x.kind === "business") {
      warnings.push(`Item ${tag}, ${x.label.trim()}: if the decedent ran this unincorporated business, the court must require a list of its known creditors and amounts owed, and may order more to protect them (Probate Code § 13658). Include any trade name in the description.`);
    }
    if (p.passing || p.confirmed) for (const note of p.notes) warnings.push(`Item ${tag}, ${x.label.trim()}: ${note}`);
  }

  // 1. What the petitioner asks for
  set("1.petitioner", name);
  if (passing.length) set("1a", true);
  if (confirmed.length) set("1b", true);
  if (a.referee === "yes") set("1c", true);

  // 2. Who the petitioner is
  const boxes = isPartner(a) ? { self: "2d", pr: "2e", guardian: "2f" } : { self: "2a", pr: "2b", guardian: "2c" };
  set(boxes[a.filer], true);
  if (a.filer !== "self") set(`${boxes[a.filer]}.name`, a.s_name.trim());

  // 3-4. Death, residence, will
  set("3", longDate(a.d_date));
  set(a.d_lived === "ca" ? "4a" : "4b", true);
  if (a.will === "no") set("4c.intestate", true);
  if (will) {
    set("4c.testate", true);
    const extra = [a.codicil === "yes" ? " and every codicil" : "", a.will_handwritten === "yes" ?
      ". Because it is handwritten, also attach a typed copy" : "", a.will_foreign === "yes" ?
      ". Attach an English translation too" : ""].join("");
    attachments.push({ id: "4c", text: `Attachment 4c: a copy of the will${extra}.` });
  }

  // 5-6. Family
  if (a.children === "no") set("5a1.none", true);
  if (a.children === "yes") {
    set("5a1.child", true);
    if (a.child_kinds.includes("natural")) set("5a1.natural", true);
    if (a.child_kinds.includes("adopted_out")) set("5a1.adoptedOut", true);
  }
  if (a.grandkids === "no") set("5a2.none", true);
  if (a.grandkids === "yes") set("5a2.issue", true);
  set(a.stepchild === "is" ? "5b.is" : "5b.isNot", true);
  if (asksRelatives(a) && (a.relatives === "a" || a.relatives === "b")) set(`6${a.relatives}`, true);

  // 7. The property, with the three attachments this tool writes
  if (passing.length) set("7a", true);
  if (confirmed.length) set("7b", true);
  const facts = a.facts_override.trim() ? [a.facts_override.trim()] : factsFor(a, listed);
  if (a.facts_override.trim()) notes.push("Attachment 7 uses your replacement text. The helper has not checked that it supports every interest listed on Attachments 7a and 7b. Read the complete PDF before signing.");
  if (passing.length || confirmed.length) {
    attachments.push({ id: "7", text: "Attachment 7: the facts showing why this property passes to or belongs to the survivor. This tool adds it to the PDF for you.", generated: true });
  }
  if (passing.length) attachments.push({ id: "7a", text: "Attachment 7a: property passing from the decedent. This tool adds it to the PDF for you.", generated: true });
  if (confirmed.length) attachments.push({ id: "7b", text: "Attachment 7b: property that already belonged to the survivor. This tool adds it to the PDF for you.", generated: true });

  // 8. Written agreement
  set(a.agreement === "yes" ? "8.exists" : "8.none", true);
  if (a.agreement === "yes") {
    attachments.push({ id: "8", text: "Attachment 8: a copy of the written agreement, if the property lists rely on it." });
  }

  // 9. Everyone who must be notified
  const rows = a.people.filter((p) => (p.name || "").trim()).map(personRow);
  const people = rows.length <= ROWS_ON_FORM ? rows : [];
  const attachment9 = rows.length > ROWS_ON_FORM ? rows : [];
  if (rows.length) set(attachment9.length ? "9.attachment" : "9.below", true);
  if (attachment9.length) attachments.push({ id: "9", text: `Attachment 9: the ${rows.length} people to notify. This tool adds it to the PDF for you.`, generated: true });

  // 10-11. Executors and trustee
  const executors = will ? a.executors.trim() : "";
  if (executors) { set("10.below", true); set("10.text", executors); } else set("10.none", true);
  const trustee = will && a.trustee === "yes";
  if (trustee) {
    set("11", true);
    attachments.push({ id: "11", text: "Attachment 11: everyone interested in the trust. This tool adds it to the PDF for you.", generated: true });
  }

  // 12. Probate
  if (a.probate === "with") set("12a", true);
  if (a.probate === "filed") { set("12b", true); set("12b.date", longDate(a.probate_date)); }
  if (a.probate === "none") set("12c", true);

  // Signature. Without a lawyer the attorney lines stay blank.
  set("sig.name", name);
  set("sig.date", longDate(a.sign_date));

  if (a.county === "San Luis Obispo" && confirmed.length) notes.push("San Luis Obispo Local Rule 11.1302 requires additional marriage, property and financial history when relying on community or quasi-community property. Supply those facts and supporting documents; these basic questions do not cover all of them.");
  if (a.assets.some(x => !x.basis && x.label)) notes.push("Previously saved property answers need review: acquisition facts no longer automatically classify property. Choose the legal basis on each property card.");

  // Things to check
  if (!a.ended) warnings.push("Confirm whether the marriage or partnership ended or a court ended property rights before signing.");
  if (a.ended === "yes") {
    warnings.push("You said the marriage or partnership ended, or a court ended their property rights. That person may not count as a surviving spouse or partner (Probate Code § 78), so this form may not be available. Talk to a lawyer before filing.");
  }
  if (a.d_lived === "outside") {
    warnings.push("They lived outside California. Quasi-community property rules apply only when the person who died lived in California (Probate Code § 101), and the law of their home state may matter. Ask a lawyer before you describe property as community or quasi-community.");
  }
  if (a.filer === "pr" && a.will === "no") {
    notes.push("With no will, an heir must outlive the person who died by at least 120 hours to inherit (Probate Code § 6403). Check the survivor’s date of death.");
  }
  if (a.will === "lost") {
    warnings.push("The original will is missing. The law may presume it was revoked (Probate Code § 6124), so explain in an attachment why that doesn’t apply, and expect the court to look closely.");
  }
  if (will && a.will_gives === "trust") {
    warnings.push("Property left in trust, or left to the survivor with limits, is subject to probate instead (Probate Code § 13501). Only the survivor’s own half of community property can be confirmed here.");
  }
  if (a.agreement === "yes") {
    notes.push("Any written agreement that splits community property unevenly changes what each spouse’s share is. Make sure Attachments 7a and 7b match it.");
  }
  if (remains.length && a.probate === "none") {
    warnings.push("Some property doesn’t pass to the survivor, but item 12 says no probate petition is being filed. That property still needs probate (DE-111) or another route, such as a small estate affidavit.");
  }
  if (!passing.length && !confirmed.length) warnings.push("Nothing is listed on Attachment 7a or 7b yet. Add property, or check whether this petition is needed at all.");
  if (a.d_lived === "ca" && a.county && a.d_county && a.county.trim().toLowerCase() !== a.d_county.trim().toLowerCase()) {
    warnings.push(`They lived in ${a.d_county} County, but the court is set to ${a.county} County. This petition goes in the county where the estate could be administered, which for a California resident is the county where they lived (Probate Code §§ 7051, 13650).`);
  }
  if (!rows.length) warnings.push("Item 9 is empty. List everyone the will names, the children, and the relatives from item 6.");
  for (const [key, label] of [["d_name", "the name of the person who died"], ["d_date", "the date they died"],
    ["s_name", "the survivor’s name"], ["will", "whether there was a will"], ["county", "the county court"]]) {
    if (!String(a[key]).trim()) warnings.push(`Still missing: ${label}.`);
  }
  if (!a.married_date) warnings.push("Still missing: the date of the marriage or partnership. Courts look for it in Attachment 7.");
  if (a.filer !== "self" && !name) warnings.push("Still missing: the petitioner’s name.");

  return { values: v, people, attachment9, facts, passing, confirmed, remains, placed, trustPeople: trustee ? a.trust_people.trim() : "",
    attachments, warnings, notes };
}

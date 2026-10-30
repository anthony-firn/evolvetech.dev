// Plain answers → what DE-111 says. Pure functions, shared by the page and the tests.
//
// `fill(answers)` returns { values, people, overflow, extraSigners, attachments, warnings, notes, estate, role }.
// values maps keys from fields.js to text, or to true for a checked box.

export const SMALL_ESTATE_LIMIT = 208850;   // Prob. Code § 13100, deaths on or after April 1, 2025 (form DE-300)
export const HOME_PETITION_LIMIT = 750000;  // Prob. Code § 13151 primary residence petition (DE-310), same dates
export const ROWS_ON_FORM = 10;
export const ROWS_PER_ATTACHMENT_PAGE = 14;

export const BLANK = {
  // The person who died
  d_name: "", d_aka: "", d_date: "", d_place: "",
  d_lived: "ca", d_street: "", d_city: "", d_county: "", d_state: "", d_zip: "", d_property: "",
  d_foreign: "no", d_country: "",
  // The will
  will: "", will_date: "", codicil: "no", codicil_dates: "",
  will_selfproving: "", will_handwritten: "no", will_foreign: "no",
  will_waives_bond: "", will_bars_iaea: "no",
  executor_named: "", executor_serves: "", others_wont_act: "no", others_why: [], others_other: "",
  // Who is asking, who will be in charge
  petitioners: [""], rep_same: "yes", reps: [""], relation: "", nominated: "no",
  rep_lives: "ca", rep_address: "",
  // Family
  spouse: "", rdp: "", children: "", child_kinds: ["natural"], grandkids: "", stepchild: "was_not",
  relatives: "", prior_spouse: "", prior_real: "no", prior_personal: "no", prior_kin: "",
  // Property
  personal: "", income_real: "", income_personal: "", real_gross: "", real_debt: "",
  // Authority and bond
  iaea: "full", waivers: "", bond_type: "bond", bond_amount: "", blocked_amount: "", blocked_where: "",
  // People to notify
  people: [],
  // Court and newspaper
  county: "", court_street: "", court_mailing: "", court_cityzip: "", court_branch: "",
  case_number: "", hearing: "", dept: "", newspaper: "", publication: "",
  // Contact and signing
  c_name: "", c_street: "", c_city: "", c_state: "CA", c_zip: "", c_phone: "", c_email: "",
  extra_pages: "", sign_date: "",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];

export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : (iso || "").trim();
}

export function amount(text) {
  const n = parseFloat(String(text ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function money(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Whole dollars for amounts quoted in sentences.
export const dollars = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

export function joinNames(names) {
  const list = names.map((s) => s.trim()).filter(Boolean);
  if (list.length < 3) return list.join(" and ");
  return `${list.slice(0, -1).join(", ")}, and ${list.at(-1)}`;
}

export const hasWill = (a) => a.will === "yes" || a.will === "lost";
export const hasIssue = (a) => a.children === "yes" || a.grandkids === "yes";
export const hasSpouseOrPartner = (a) => a.spouse === "yes" || a.rdp === "yes";
// Item 6 applies when no children or grandchildren survived; with a spouse or partner only 6a and 6b count.
export const asksRelatives = (a) => a.children === "no" && a.grandkids === "no";
// Item 7 applies only when no spouse, partner or issue survived.
export const asksPriorSpouse = (a) => asksRelatives(a) && a.spouse !== "yes" && a.spouse !== "" && a.rdp === "no";

export function petitioners(a) { return a.petitioners.map((s) => s.trim()).filter(Boolean); }
export function reps(a) { return a.rep_same === "yes" ? petitioners(a) : a.reps.map((s) => s.trim()).filter(Boolean); }

export function role(a) {
  if (!hasWill(a)) return "administrator";
  return a.executor_named === "yes" && a.executor_serves === "yes" ? "executor" : "administrator_wwa";
}

export const ROLE_WORDS = {
  executor: "executor",
  administrator_wwa: "administrator with will annexed",
  administrator: "administrator",
};

export function estate(a) {
  const personal = amount(a.personal), incomeReal = amount(a.income_real), incomePersonal = amount(a.income_personal);
  const realGross = amount(a.real_gross), realDebt = amount(a.real_debt);
  const subtotal = personal + incomeReal + incomePersonal;
  const realNet = realGross - realDebt;
  const total = subtotal + realNet;
  // Prob. Code § 8482(a): personal property + a year's income, plus the real property when full IAEA authority
  // covers selling it. The court sets the final amount.
  const bond = subtotal + (effectiveIaea(a) === "full" ? Math.max(0, realNet) : 0);
  return { personal, incomeReal, incomePersonal, subtotal, realGross, realDebt, realNet, total, bond };
}

export function effectiveIaea(a) {
  if (hasWill(a) && a.will_bars_iaea === "yes") return "none";
  return a.iaea || "none";
}

export function noBondReason(a) {
  if (hasWill(a) && a.will_waives_bond === "yes") return "3e1";
  if (a.waivers === "yes") return hasWill(a) ? "3e2" : "3e3";
  return null;
}

export function estateName(a) {
  const name = a.d_name.trim();
  return a.d_aka.trim() ? `${name}, also known as ${a.d_aka.trim()}` : name;
}

function residence(a) {
  const place = [a.d_street, a.d_city].map((s) => s.trim()).filter(Boolean).join(", ");
  if (a.d_lived === "ca") {
    const county = a.d_county.trim() ? `, ${a.d_county.trim()} County` : "";
    return [place, `California ${a.d_zip.trim()}`.trim()].filter(Boolean).join(", ") + county;
  }
  return [place, `${a.d_state.trim()} ${a.d_zip.trim()}`.trim()].filter(Boolean).join(", ");
}

export function personRow(p) {
  const name = [p.name, p.relation].map((s) => (s || "").trim()).filter(Boolean).join("\n");
  if (p.deceased) return { name, age: "", address: "Deceased" };
  return { name, age: p.adult ? "Adult" : String(p.age || "").trim(), address: (p.address || "").trim() };
}

export function fill(a) {
  a = { ...BLANK, ...a };
  const v = {};
  const warnings = [];
  const notes = [];
  const attachments = [];
  const set = (key, value) => { if (value !== "" && value != null && value !== false) v[key] = value; };
  const r = role(a);
  const will = hasWill(a);
  const est = estate(a);
  const iaea = effectiveIaea(a);

  // Top box: a self-represented petitioner puts their own contact details here.
  set("atty.name", a.c_name.trim() || petitioners(a)[0] || "");
  set("atty.street", a.c_street.trim());
  set("atty.city", a.c_city.trim());
  set("atty.state", a.c_state.trim().toUpperCase().slice(0, 2));
  set("atty.zip", a.c_zip.trim());
  set("atty.phone", a.c_phone.trim());
  set("atty.email", a.c_email.trim());
  set("atty.for", "Self-Represented");
  set("court.county", a.county.trim().toUpperCase());
  set("court.street", a.court_street.trim());
  set("court.mailing", a.court_mailing.trim());
  set("court.cityZip", a.court_cityzip.trim());
  set("court.branch", a.court_branch.trim());
  for (const page of [1, 2, 3, 4]) {
    set(`estate.p${page}`, estateName(a));
    set(`case.p${page}`, a.case_number.trim());
  }
  set("hearing", a.hearing.trim());
  set("dept", a.dept.trim());

  // PETITION FOR ...
  if (r === "executor") { set("title.probateLT", true); if (a.will === "lost") set("title.lostLT", true); }
  if (r === "administrator_wwa") { set("title.probateWWA", true); if (a.will === "lost") set("title.lostWWA", true); }
  if (r === "administrator") set("title.admin", true);
  if (iaea !== "none") set("title.iaea", true);
  if (iaea === "limited") set("title.iaeaLimited", true);

  // 1. Newspaper notice
  set("1.newspaper", a.newspaper.trim());
  if (a.publication === "requested") set("1a", true);
  if (a.publication === "arranged") set("1b", true);

  // 2. What the petitioners ask for
  set("2.petitioners", joinNames(petitioners(a)));
  if (will) set("2a", true);
  set("2b.name", joinNames(reps(a)));
  set({ executor: "2b1", administrator_wwa: "2b2", administrator: "2b3" }[r], true);
  if (iaea === "full") set("2c.full", true);
  if (iaea === "limited") set("2c.limited", true);
  const why = noBondReason(a);
  if (why) {
    set("2d1", true);
    set(why, true);
    if (a.rep_lives !== "ca") {
      warnings.push("The person who will be in charge lives outside California. The court can require a bond " +
        "even when the will or the heirs waive it (Probate Code § 8571).");
    }
  } else if (a.bond_type === "blocked") {
    set("2d3", true);
    set("2d3.amount", amount(a.blocked_amount) ? money(amount(a.blocked_amount)) : "");
    set("2d3.institution", a.blocked_where.trim());
  } else {
    const bond = amount(a.bond_amount) || est.bond;
    set("2d2", true);
    set("2d2.amount", bond ? money(bond) : "");
    if (amount(a.bond_amount) && Math.abs(amount(a.bond_amount) - est.bond) > 0.5) {
      attachments.push({ id: "2", text: "Attachment 2: why you are asking for a bond amount different from the " +
        `usual maximum of $${money(est.bond)} (Probate Code § 8482).` });
    }
  }

  // 3a-c. Death and residence
  set("3a.date", longDate(a.d_date));
  set("3a.place", a.d_place.trim());
  if (a.d_lived === "ca") set("3a1", true);
  else { set("3a2", true); set("3a2.location", a.d_property.trim()); }
  if (a.d_foreign === "yes") { set("3b", true); set("3b.country", a.d_country.trim()); }
  set("3c", residence(a));

  // 3d. Value of the estate: the form says to complete it in all cases
  const lines = { "3d1": est.personal, "3d2a": est.incomeReal, "3d2b": est.incomePersonal, "3d3": est.subtotal,
    "3d4": est.realGross, "3d5": est.realDebt, "3d6": est.realNet, "3d7": est.total };
  for (const [key, n] of Object.entries(lines)) set(key, money(n));
  if (est.realNet < 0) warnings.push("The loans on the real estate are larger than its value, so its net value is negative. Check those two numbers.");

  // 3f. The will
  if (!will) set("3f1", true);
  else {
    set("3f2", true);
    set("3f2.date", longDate(a.will_date));
    if (a.codicil === "yes") { set("3f2.codicil", true); set("3f2.codicilDates", a.codicil_dates.trim()); }
    if (a.will_selfproving === "yes") set("3f2.selfProving", true);
    const extra = [a.codicil === "yes" ? " and every codicil" : "", a.will_handwritten === "yes" ?
      ". Because it is handwritten, also attach a typed copy" : "", a.will_foreign === "yes" ?
      ". Attach an English translation too" : ""].join("");
    attachments.push({ id: "3f2", text: `Attachment 3f(2): a copy of the will${extra}.` });
    if (a.will === "lost") {
      set("3f3", true);
      attachments.push({ id: "3f3", text: "Attachment 3f(3): a copy of the lost will, or a written statement of " +
        "what it said, and why the law should not presume it was revoked (Probate Code § 6124)." });
    }
    if (a.will_selfproving !== "yes" && a.will !== "lost") {
      notes.push(a.will_handwritten === "yes"
        ? "For a handwritten will, the court may ask for a Proof of Holographic Instrument (form DE-135) from someone who knows the handwriting."
        : "The will isn't marked self-proving, so the court may ask for a Proof of Subscribing Witness (form DE-131) signed by one of the witnesses.");
    }
  }

  // 3g. Why this person should be appointed
  const nominated = a.nominated === "yes";
  if (r === "executor") set("3g1a", true);
  if (r === "administrator_wwa") {
    if (a.executor_named === "no") set("3g1b", true);
    if (nominated) set("3g1c", true);
  }
  const othersWontAct = (r === "executor" && a.others_wont_act === "yes") ||
    (r === "administrator_wwa" && a.executor_named === "yes");
  if (othersWontAct) {
    set("3g1d", true);
    for (const reason of a.others_why) set(`3g1d.${reason}`, true);
    if (a.others_why.includes("other")) set("3g1d.reasons", a.others_other.trim());
  }
  if (r === "administrator") {
    set(nominated ? "3g2b" : "3g2a", true);
    if (a.relation.trim()) { set("3g2c", true); set("3g2c.relation", a.relation.trim()); }
  }
  if (nominated) {
    const id = r === "administrator" ? "3g(2)(b)" : "3g(1)(c)";
    attachments.push({ id: id.replace(/[()]/g, ""), text: `Attachment ${id}: the signed nomination from the person ` +
      "who has the right to serve and chose your proposed personal representative instead." });
  }

  // 3h. Where the proposed personal representative lives
  if (a.rep_lives === "ca") { set("3h1", true); set("3h3", true); }
  else {
    set("3h2", true);
    set("3h2.address", a.rep_address.trim());
    set(a.rep_lives === "abroad" ? "3h4" : "3h3", true);
  }

  // 4. Independent administration
  if (will && a.will_bars_iaea !== "yes") set("4", true);

  // 5. Spouse, partner, children
  if (a.spouse === "yes") set("5a1", true);
  if (a.spouse === "divorced") { set("5a2", true); set("5a2a", true); }
  if (a.spouse === "widowed") { set("5a2", true); set("5a2b", true); }
  if (a.rdp === "yes") set("5a3", true);
  if (a.rdp === "no") set("5a4", true);
  if (a.children === "yes") {
    set("5a5", true);
    if (a.child_kinds.includes("natural")) set("5a5a", true);
    if (a.child_kinds.includes("adopted_out")) set("5a5b", true);
  }
  if (a.children === "no") set("5a6", true);
  if (a.grandkids === "yes") set("5a7", true);
  if (a.grandkids === "no") set("5a8", true);
  if (a.stepchild === "was") set("5b.was", true);
  if (a.stepchild === "was_not") set("5b.wasNot", true);

  // 6. Closest other relatives: the first box that applies
  if (asksRelatives(a) && /^[a-h]$/.test(a.relatives)) {
    if (hasSpouseOrPartner(a) && !"ab".includes(a.relatives)) {
      warnings.push("With a surviving spouse or partner, only items 6a and 6b apply, so item 6 was left blank.");
    } else set(`6${a.relatives}`, true);
  }

  // 7. A spouse who died before them
  if (asksPriorSpouse(a)) {
    if (a.prior_spouse === "no") set("7a", true);
    if (a.prior_spouse === "yes") {
      set("7b", true);
      if (a.prior_real === "yes") set("7b1", true);
      if (a.prior_personal === "yes") set("7b2", true);
      if (a.prior_real === "yes" || a.prior_personal === "yes") {
        if (/^[a-e]$/.test(a.prior_kin)) set(`7b2${a.prior_kin}`, true);
      } else set("7b3", true);
    }
  }

  // 8. Everyone who must be notified
  const rows = a.people.filter((p) => (p.name || "").trim()).map(personRow);
  const people = rows.slice(0, ROWS_ON_FORM);
  const overflow = rows.slice(ROWS_ON_FORM);
  if (overflow.length) {
    set("8.continued", true);
    attachments.push({ id: "8", text: `Attachment 8: the other ${overflow.length} people to notify. This tool adds it to the PDF for you.`, generated: true });
  }

  // 9. Signatures. The first two petitioners sign on page 4; anyone else signs on an added page.
  const names = petitioners(a);
  set("9.petitioner1", names[0] || "");
  set("9.petitioner2", names[1] || "");
  const extraSigners = names.slice(2);
  if (extraSigners.length) {
    set("9.more", true);
    attachments.push({ id: "sign", text: "A signature page for the other petitioners. This tool adds it to the PDF for you.", generated: true });
  }
  set("9.date", longDate(a.sign_date));
  const generatedPages = Math.ceil(overflow.length / ROWS_PER_ATTACHMENT_PAGE) + (extraSigners.length ? 1 : 0);
  const pages = Math.round(amount(a.extra_pages)) + generatedPages;
  set("9.pages", pages ? String(pages) : "");

  if (why === "3e2" || why === "3e3") {
    attachments.push({ id: why, text: `Attachment 3e(${why.at(-1)}): a signed Waiver of Bond (form DE-142) from ` +
      `every ${why === "3e2" ? "beneficiary in the will" : "heir"}.` });
  }
  if (a.d_lived === "ca" && a.county && a.d_county && a.county.trim().toLowerCase() !== a.d_county.trim().toLowerCase()) {
    warnings.push(`They lived in ${a.d_county} County, but the court is set to ${a.county} County. A petition for a California resident is filed in the county where they lived (Probate Code § 7051).`);
  }
  if (!rows.length) warnings.push("Item 8 is empty. List everyone who has to be told about the case.");
  for (const [key, label] of [["d_name", "the name of the person who died"], ["d_date", "the date they died"],
    ["will", "whether there was a will"], ["county", "the county court"], ["newspaper", "the newspaper"]]) {
    if (!String(a[key]).trim()) warnings.push(`Still missing: ${label}.`);
  }
  if (!names.length) warnings.push("Still missing: the petitioner's name.");

  return { values: v, people, overflow, extraSigners, attachments, warnings, notes, estate: est, role: r };
}

// Plain-words hints that probate might not be needed. Shown before and after the questions, never decisive.
export function shortcuts(a) {
  const est = estate(a);
  const tips = [];
  if (est.personal + est.realGross > 0 && est.personal + est.realGross <= SMALL_ESTATE_LIMIT) {
    tips.push(`The property you listed adds up to $${money(est.personal + est.realGross)}, which is under the ${dollars(SMALL_ESTATE_LIMIT)} small-estate limit. If they died on or after April 1, 2025, a simpler process may work instead of probate.`);
  }
  if (est.realGross > 0 && est.realGross <= HOME_PETITION_LIMIT) {
    tips.push(`If the real estate was their main home and is worth ${dollars(HOME_PETITION_LIMIT)} or less, a Petition to Determine Succession to Real Property (DE-310) may transfer it without full probate (deaths on or after April 1, 2025).`);
  }
  if (a.spouse === "yes" || a.rdp === "yes") {
    tips.push("Property going to a surviving spouse or registered domestic partner can often pass with a Spousal or Domestic Partner Property Petition (DE-221) instead.");
  }
  return tips;
}

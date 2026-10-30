// The questions, in plain words, grouped into steps. app.js renders them; logic.js turns answers into the form.
//
// Question types: text, textarea, date, money, number, select, choice (one answer), multi (several), names (list of
// names), people (item 8 list), note (text that can depend on answers). `when(a)` hides a question until it applies.
// `item` names the place on DE-111 so people can check the paper form.
import { hasWill, asksRelatives, asksPriorSpouse, hasSpouseOrPartner, role, ROLE_WORDS, estate, money, noBondReason,
  shortcuts, effectiveIaea } from "./logic.js";

export const COUNTIES = ["Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa", "Del Norte",
  "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake", "Lassen", "Los Angeles",
  "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", "Mono", "Monterey", "Napa", "Nevada", "Orange",
  "Placer", "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino", "San Diego", "San Francisco",
  "San Joaquin", "San Luis Obispo", "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra",
  "Siskiyou", "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare", "Tuolumne", "Ventura", "Yolo",
  "Yuba"];

export const LINKS = {
  formalProbate: "https://selfhelp.courts.ca.gov/probate/formal-probate",
  simpleTransfer: "https://selfhelp.courts.ca.gov/probate/simple-transfer",
  selfHelpCenters: "https://selfhelp.courts.ca.gov/self-help-centers",
  findCourt: "https://courts.ca.gov/find-my-court",
  terms: "https://selfhelp.courts.ca.gov/wills-estates-probate/terms",
  form: (id) => `https://selfhelp.courts.ca.gov/jcc-form/${id}`,
};

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const willNamesExecutor = (a) => hasWill(a) && a.executor_named === "yes";
const needsBond = (a) => !noBondReason(a);

export const STEPS = [
  {
    id: "person", title: "The person who died",
    intro: "Start with the basics from the death certificate.",
    questions: [
      { id: "d_name", type: "text", label: "Their full legal name", item: "Top of every page: “Estate of”",
        hint: "As it is on the death certificate. Courts often write it in capital letters.", autocomplete: "off" },
      { id: "d_aka", type: "text", label: "Other names they used (optional)", item: "“Estate of”",
        hint: "Only if accounts or property are in another name, such as a maiden name or a short form like “Bob Smith”." },
      { id: "d_date", type: "date", label: "Date they died", item: "Item 3a" },
      { id: "d_place", type: "text", label: "Where they died", item: "Item 3a",
        hint: "City and state, for example “Fresno, California”." },
      { id: "d_lived", type: "choice", label: "Where did they live?", item: "Item 3a", options: [
        { value: "ca", label: "In California" },
        { value: "outside", label: "Outside California, but they owned property in California",
          hint: "You file in the California county where the property is." }] },
      { id: "d_street", type: "text", label: "Their home street address", item: "Item 3c", autocomplete: "off" },
      { id: "d_city", type: "text", label: "City", item: "Item 3c" },
      { id: "d_county", type: "select", label: "County", item: "Item 3c", options: COUNTIES, when: (a) => a.d_lived === "ca",
        hint: "This is usually the county where you file." },
      { id: "d_state", type: "text", label: "State or country", item: "Item 3c", when: (a) => a.d_lived === "outside" },
      { id: "d_zip", type: "text", label: "ZIP code", item: "Item 3c", inputmode: "numeric", short: true },
      { id: "d_property", type: "textarea", label: "Where is their property in California?", item: "Item 3a(2)",
        when: (a) => a.d_lived === "outside", hint: "The address of the property in the county where you will file." },
      { id: "d_foreign", type: "choice", label: "Were they a citizen of another country (not the United States)?",
        item: "Item 3b", options: YES_NO },
      { id: "d_country", type: "text", label: "Which country?", item: "Item 3b", when: (a) => a.d_foreign === "yes" },
    ],
  },
  {
    id: "will", title: "The will",
    intro: "A will is a signed paper that says who gets their property. A living trust is different: property in a trust usually doesn’t go through probate.",
    questions: [
      { id: "will", type: "choice", label: "Did they leave a will?", item: "Items 2a and 3f", options: [
        { value: "yes", label: "Yes, and I have the original" },
        { value: "lost", label: "Yes, but the original can’t be found" },
        { value: "no", label: "No will" }] },
      { type: "note", when: hasWill, tone: "info",
        text: "Whoever has the original will must give it to the court clerk within 30 days after the death (Probate Code § 8200). Keep a copy to attach to this form." },
      { id: "will_date", type: "date", label: "Date the will was signed", item: "Item 3f(2)", when: hasWill },
      { id: "codicil", type: "choice", label: "Are there any codicils?", item: "Item 3f(2)", when: hasWill, options: YES_NO,
        hint: "A codicil is a signed change added to a will later." },
      { id: "codicil_dates", type: "text", label: "Date of each codicil", item: "Item 3f(2)",
        when: (a) => hasWill(a) && a.codicil === "yes", hint: "For example “June 1, 2021 and May 3, 2023”." },
      { id: "will_handwritten", type: "choice", label: "Is the will handwritten?", item: "Item 3f(2)", when: hasWill, options: [
        { value: "no", label: "No, it is typed or printed" },
        { value: "yes", label: "Yes, all or mostly in their handwriting" }] },
      { id: "will_selfproving", type: "choice", label: "Is the will “self-proving”?", item: "Item 3f(2)",
        when: (a) => a.will === "yes",
        hint: "Look near the witnesses’ signatures. If two witnesses signed a paragraph saying they “declare under penalty of perjury under the laws of the State of California” that they saw it signed, it is self-proving.",
        options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "I’m not sure" }] },
      { id: "will_foreign", type: "choice", label: "Is it written in a language other than English?", item: "Item 3f(2)",
        when: hasWill, options: YES_NO },
      { id: "will_waives_bond", type: "choice", label: "Does the will say no bond is required?", item: "Item 3e(1)",
        when: hasWill, options: YES_NO,
        hint: "Look for words like “no bond shall be required” or “I waive bond”. A bond works like an insurance policy that protects the heirs, and it costs the estate money every year." },
      { id: "will_bars_iaea", type: "choice", label: "Does the will forbid using the Independent Administration of Estates Act?",
        item: "Item 4", when: hasWill, options: YES_NO,
        hint: "This is rare. Most wills don’t mention it at all. If it isn’t mentioned, choose No." },
      { id: "executor_named", type: "choice", label: "Does the will name an executor?", item: "Item 3g(1)", when: hasWill,
        options: YES_NO, hint: "The executor is the person the will chooses to handle the estate. Some wills also name a backup." },
      { id: "executor_serves", type: "choice", label: "Will one of the executors named in the will serve?", item: "Items 2b and 3g(1)",
        when: willNamesExecutor, options: [
          { value: "yes", label: "Yes, one of them (or a backup named in the will) will serve" },
          { value: "no", label: "No, none of them can or will serve" }] },
      { id: "others_wont_act", type: "choice", label: "Did the will name anyone else as executor who won’t serve?",
        item: "Item 3g(1)(d)", when: (a) => willNamesExecutor(a) && a.executor_serves === "yes", options: YES_NO,
        hint: "For example, a first choice who has died, with the backup serving instead." },
      { id: "others_why", type: "multi", label: "Why won’t they serve?", item: "Item 3g(1)(d)",
        when: (a) => willNamesExecutor(a) && (a.executor_serves === "no" || a.others_wont_act === "yes"), options: [
          { value: "death", label: "They died" },
          { value: "declination", label: "They declined (said no)" },
          { value: "other", label: "Another reason" }] },
      { id: "others_other", type: "textarea", label: "Explain the other reason", item: "Item 3g(1)(d)",
        when: (a) => willNamesExecutor(a) && a.others_why.includes("other") && (a.executor_serves === "no" || a.others_wont_act === "yes") },
    ],
  },
  {
    id: "who", title: "Who is asking, and who will be in charge",
    intro: "The petitioner is the person who files this form. The personal representative is the person the court puts in charge of the estate. Usually they are the same person.",
    questions: [
      { id: "petitioners", type: "names", label: "Petitioner’s full name", add: "Add another petitioner", item: "Item 2",
        hint: "If more than one person is asking together, add each one. Every petitioner signs the form." },
      { id: "rep_same", type: "choice", label: "Who should the court put in charge?", item: "Item 2b", options: [
        { value: "yes", label: "The petitioner (or petitioners)" },
        { value: "no", label: "Someone else" }] },
      { id: "reps", type: "names", label: "Full name of the person to be put in charge", add: "Add another person",
        item: "Item 2b", when: (a) => a.rep_same === "no" },
      { type: "note", tone: "info", text: (a) => {
        if (!a.will) return "";
        const r = role(a);
        const why = { executor: "the will names them as executor.",
          administrator_wwa: "there is a will, but no executor named in it will serve.",
          administrator: "there is no will." }[r];
        return `The court will call the person in charge the <strong>${ROLE_WORDS[r]}</strong>, because ${why}`;
      } },
      { id: "relation", type: "text", label: "How is the petitioner related to the person who died?", item: "Item 3g(2)(c)",
        when: (a) => a.will === "no", hint: "For example daughter, son, wife, brother or niece." },
      { type: "note", when: (a) => a.will === "no", tone: "plain",
        text: "Without a will, the law sets who has the first right to serve: the spouse or registered domestic partner, then children, grandchildren, parents, brothers and sisters, and then more distant relatives (Probate Code § 8461). If someone ahead of you wants to serve, they can object." },
      { id: "nominated", type: "choice", label: "Did someone with a stronger right to serve sign a paper asking the court to appoint this person instead?",
        item: "Item 3g(1)(c) or 3g(2)(b)", when: (a) => a.will && role(a) !== "executor", options: YES_NO,
        hint: "For example, the spouse has the first right but asks in writing for the daughter to serve. Most people choose No." },
      { id: "rep_lives", type: "choice", label: "Where does the person to be in charge live?", item: "Item 3h", options: [
        { value: "ca", label: "In California" },
        { value: "us", label: "In another U.S. state" },
        { value: "abroad", label: "Outside the United States" }] },
      { id: "rep_address", type: "textarea", label: "Their permanent address", item: "Item 3h(2)",
        when: (a) => a.rep_lives !== "ca" },
      { type: "note", tone: "warn", when: (a) => a.rep_lives !== "ca",
        text: "Courts often require a bond when the person in charge lives outside California, even if the will or the heirs waive it." },
    ],
  },
  {
    id: "family", title: "Family",
    intro: "The court needs to know who would inherit by law, even when there is a will. Answer about family members who were alive when the person died.",
    questions: [
      { id: "spouse", type: "choice", label: "When they died, were they married?", item: "Item 5a(1)–(2)", options: [
        { value: "yes", label: "Yes, married" },
        { value: "divorced", label: "No, divorced or never married" },
        { value: "widowed", label: "No, their spouse had already died" }],
        hint: "Answer about their situation on the day they died." },
      { id: "rdp", type: "choice", label: "Did they have a registered domestic partner?", item: "Item 5a(3)–(4)", options: YES_NO,
        hint: "A partnership registered with the state, not just living together." },
      { id: "children", type: "choice", label: "Did they have any children who were alive when they died?", item: "Item 5a(5)–(6)",
        options: YES_NO, hint: "Count adopted children too." },
      { id: "child_kinds", type: "multi", label: "Which describes their children?", item: "Item 5a(5)",
        when: (a) => a.children === "yes", options: [
          { value: "natural", label: "Children born to them or adopted by them" },
          { value: "adopted_out", label: "A child born to them who was later adopted by someone else" }] },
      { id: "grandkids", type: "choice", label: "Did any of their children die before them, leaving children of their own who are alive?",
        item: "Item 5a(7)–(8)", options: YES_NO, hint: "These are grandchildren whose parent died first." },
      { id: "stepchild", type: "choice", label: "Was there a stepchild or foster child they would have adopted if something legal hadn’t stopped them?",
        item: "Item 5b", options: [{ value: "was_not", label: "No" }, { value: "was", label: "Yes" }],
        hint: "This is uncommon. It only counts if the relationship began when the child was a minor, lasted for life, and a legal barrier prevented the adoption (Probate Code § 6454). Most people choose No." },
      { id: "relatives", type: "choice", label: "Who are their closest living relatives? Choose the first one on the list that is true.",
        item: "Item 6", when: asksRelatives, options: (a) => {
          const list = [
            { value: "a", label: "A parent (mother or father)" },
            { value: "b", label: "Brothers or sisters, or their children or grandchildren" },
            { value: "c", label: "A grandparent" },
            { value: "d", label: "Aunts, uncles or cousins" },
            { value: "e", label: "Children or grandchildren of a spouse who died earlier" },
            { value: "f", label: "Other relatives (next of kin)" },
            { value: "g", label: "Parents of a spouse who died earlier, or that spouse’s brothers, sisters, nieces or nephews" },
            { value: "h", label: "No known relatives" }];
          return hasSpouseOrPartner(a) ? [...list.slice(0, 2), { value: "none", label: "Neither of these" }] : list;
        } },
      { id: "prior_spouse", type: "choice", label: "Did they have a spouse or registered domestic partner who died before them?",
        item: "Item 7", when: asksPriorSpouse, options: YES_NO },
      { id: "prior_real", type: "choice", label: "Did that spouse die 15 years or less before them, owning real estate (or a share of it) that passed to them?",
        item: "Item 7b(1)", when: (a) => asksPriorSpouse(a) && a.prior_spouse === "yes", options: YES_NO },
      { id: "prior_personal", type: "choice", label: "Did that spouse die 5 years or less before them, owning personal property worth $10,000 or more that passed to them?",
        item: "Item 7b(2)", when: (a) => asksPriorSpouse(a) && a.prior_spouse === "yes", options: YES_NO },
      { id: "prior_kin", type: "choice", label: "Choose the first one that is true.", item: "Item 7b",
        when: (a) => asksPriorSpouse(a) && a.prior_spouse === "yes" && (a.prior_real === "yes" || a.prior_personal === "yes"),
        options: [
          { value: "a", label: "Children or grandchildren of that spouse are alive" },
          { value: "b", label: "A parent of that spouse is alive" },
          { value: "c", label: "Brothers, sisters, nieces or nephews of that spouse are alive" },
          { value: "d", label: "Other relatives of the person who died" },
          { value: "e", label: "Other relatives of that spouse" }] },
    ],
  },
  {
    id: "property", title: "What they owned",
    intro: "Give your best estimates. Exact values come later, on the Inventory and Appraisal.",
    questions: [
      { type: "note", tone: "plain",
        text: "Leave out anything that passes without probate: property in a living trust, property owned in joint tenancy, and accounts or policies with a named beneficiary or “payable on death” (life insurance, IRAs, 401(k)s)." },
      { id: "personal", type: "money", label: "Personal property", item: "Item 3d(1)",
        hint: "Everything except real estate: bank and investment accounts in their name only, cars, valuables, money owed to them." },
      { id: "income_personal", type: "money", label: "Yearly income from personal property", item: "Item 3d(2)(b)",
        hint: "Interest, dividends and similar income for one year. Enter 0 if none." },
      { id: "real_gross", type: "money", label: "Market value of their real estate in California", item: "Item 3d(4)",
        hint: "What their home, land or buildings would sell for today. If they co-owned it (not as joint tenants), only their share. Enter 0 if none." },
      { id: "real_debt", type: "money", label: "Loans against that real estate", item: "Item 3d(5)", when: (a) => estate(a).realGross > 0,
        hint: "Mortgages, home equity loans and liens." },
      { id: "income_real", type: "money", label: "Yearly rent or other income from the real estate", item: "Item 3d(2)(a)",
        when: (a) => estate(a).realGross > 0, hint: "Enter 0 if none." },
      { type: "note", tone: "total", text: (a) => {
        const e = estate(a);
        return `<dl class="totals"><dt>Subtotal, item 3d(3)</dt><dd>$${money(e.subtotal)}</dd>` +
          `<dt>Net real estate, item 3d(6)</dt><dd>$${money(e.realNet)}</dd>` +
          `<dt>Total, item 3d(7)</dt><dd>$${money(e.total)}</dd></dl>`;
      } },
      { type: "note", tone: "info", text: (a) => {
        const tips = shortcuts(a);
        return tips.length ? `<strong>You may not need full probate.</strong><ul>${tips.map((t) => `<li>${t}</li>`).join("")}</ul>` +
          `<a href="${LINKS.simpleTransfer}" target="_blank" rel="noopener">Read about simpler ways to transfer property</a>` : "";
      } },
    ],
  },
  {
    id: "powers", title: "Authority and bond",
    intro: "Two choices about how closely the court watches the estate.",
    questions: [
      { id: "iaea", type: "choice", label: "How much freedom should the person in charge have?", item: "Item 2c",
        when: (a) => !(hasWill(a) && a.will_bars_iaea === "yes"), options: [
          { value: "full", label: "Full authority (most common)",
            hint: "They can do most things, including selling real estate, by mailing a Notice of Proposed Action (DE-165) to the heirs instead of going to court each time." },
          { value: "limited", label: "Limited authority",
            hint: "The same, except that selling, borrowing against or trading real estate needs a court hearing." },
          { value: "none", label: "No independent authority", hint: "Most actions need a court order. Rarely chosen." }] },
      { type: "note", tone: "info", when: (a) => hasWill(a) && a.will_bars_iaea === "yes",
        text: "The will forbids independent administration, so the petition won’t ask for it." },
      { type: "note", tone: "info", when: (a) => noBondReason(a) === "3e1",
        text: "The will waives bond, so the petition asks for no bond (item 3e(1)). The court can still require one." },
      { id: "waivers", type: "choice", label: "Will everyone who inherits sign a Waiver of Bond?", item: "Item 3e(2) or 3e(3)",
        when: (a) => noBondReason(a) !== "3e1", options: YES_NO,
        hint: "Each heir or beneficiary signs their own Waiver of Bond (DE-142), and all of them must be adults. If anyone can’t or won’t sign, a bond is needed." },
      { id: "bond_type", type: "choice", label: "How do you want to handle the bond?", item: "Item 2d", when: needsBond, options: [
        { value: "bond", label: "Buy a bond from a surety (insurance) company",
          hint: "The yearly premium is paid from the estate. Ask a surety company for a quote." },
        { value: "blocked", label: "Put the estate’s cash in a blocked account instead",
          hint: "Money in a blocked account can’t be taken out without a court order. This only works for cash." }] },
      { id: "bond_amount", type: "money", label: "Bond amount (optional)", item: "Item 2d(2)",
        when: (a) => needsBond(a) && a.bond_type === "bond",
        hint: (a) => `Leave blank to use $${money(estate(a).bond)}: personal property plus a year’s income${effectiveIaea(a) === "full" ? ", plus the real estate’s net value because of full authority" : ""}. That is the usual maximum (Probate Code § 8482). The court sets the final amount.` },
      { id: "blocked_amount", type: "money", label: "Amount going into the blocked account", item: "Item 2d(3)",
        when: (a) => needsBond(a) && a.bond_type === "blocked" },
      { id: "blocked_where", type: "textarea", label: "Bank or institution, and its location", item: "Item 2d(3)",
        when: (a) => needsBond(a) && a.bond_type === "blocked" },
    ],
  },
  {
    id: "people", title: "People to notify",
    intro: "Everyone you list here gets mailed a notice about the court hearing. The court checks this list closely.",
    questions: [
      { type: "note", tone: "plain", text: (a) => {
        const list = [];
        if (a.spouse === "yes") list.push("The spouse");
        if (a.rdp === "yes") list.push("The registered domestic partner");
        if (a.children === "yes") list.push("Every child");
        if (a.grandkids === "yes") list.push("The children of any child who died before them");
        if (hasWill(a)) list.push("Everyone named in the will or codicils, even people who have died. Mark them as deceased.");
        if (willNamesExecutor(a)) list.push("Every executor named in the will");
        if (asksRelatives(a) && a.relatives && a.relatives !== "none" && a.relatives !== "h") list.push("The relatives you chose for item 6");
        if (a.prior_kin) list.push("The relatives you chose for item 7");
        list.push("The petitioner and the person to be put in charge");
        return `<strong>Be sure to include:</strong><ul>${list.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      } },
      { id: "people", type: "people", label: "People", item: "Item 8" },
    ],
  },
  {
    id: "court", title: "Court and newspaper",
    questions: [
      { id: "county", type: "select", label: "Which county court will you file in?", item: "Top of page 1", options: COUNTIES,
        hint: "The county where they lived. If they lived outside California, the county where their property is." },
      { type: "note", tone: "plain",
        text: `Find the court’s address on the county court’s website (<a href="${LINKS.findCourt}" target="_blank" rel="noopener">find your court</a>). Large counties have several courthouses; use the one that handles probate.` },
      { id: "court_street", type: "text", label: "Court street address", item: "Top of page 1" },
      { id: "court_mailing", type: "text", label: "Court mailing address (if different)", item: "Top of page 1" },
      { id: "court_cityzip", type: "text", label: "Court city and ZIP code", item: "Top of page 1" },
      { id: "court_branch", type: "text", label: "Branch name (if any)", item: "Top of page 1" },
      { id: "newspaper", type: "text", label: "Newspaper for the public notice", item: "Item 1",
        hint: "The Notice of Petition to Administer Estate (DE-121) must run three times in a newspaper of general circulation in the city where they lived. Many courts post a list of approved papers. Call one and ask what it charges for a probate notice." },
      { id: "publication", type: "choice", label: "Have you already asked the newspaper to publish the notice?", item: "Item 1a or 1b", options: [
        { value: "requested", label: "Yes, I have asked them", hint: "The form will say “Publication requested.”" },
        { value: "arranged", label: "Not yet, I will arrange it", hint: "The form will say “Publication to be arranged.”" }] },
      { id: "case_number", type: "text", label: "Case number (optional)", item: "Top of every page",
        hint: "The clerk usually gives you one when you file. Leave blank unless you already have one." },
      { id: "hearing", type: "text", label: "Hearing date and time (optional)", item: "Top of page 1", hint: "Leave blank unless the court already gave you one." },
      { id: "dept", type: "text", label: "Department (optional)", item: "Top of page 1", short: true },
    ],
  },
  {
    id: "you", title: "Your contact details and signing",
    intro: "Without a lawyer, your own details go in the box at the top of page 1, and the form says “Self-Represented”.",
    questions: [
      { id: "c_name", type: "text", label: "Your full name", item: "Top of page 1", autocomplete: "name" },
      { id: "c_street", type: "text", label: "Street address", item: "Top of page 1", autocomplete: "street-address" },
      { id: "c_city", type: "text", label: "City", item: "Top of page 1", autocomplete: "address-level2" },
      { id: "c_state", type: "text", label: "State", item: "Top of page 1", short: true, autocomplete: "address-level1" },
      { id: "c_zip", type: "text", label: "ZIP code", item: "Top of page 1", short: true, inputmode: "numeric", autocomplete: "postal-code" },
      { id: "c_phone", type: "text", label: "Phone", item: "Top of page 1", inputmode: "tel", autocomplete: "tel" },
      { id: "c_email", type: "text", label: "Email (optional)", item: "Top of page 1", inputmode: "email", autocomplete: "email" },
      { id: "extra_pages", type: "number", label: "How many pages will you attach?", item: "Item 9",
        hint: "Count the pages of the will copy, codicils, bond waivers and anything else you attach. Pages this tool adds are counted for you." },
      { id: "sign_date", type: "date", label: "Date you will sign (optional)", item: "Item 9",
        hint: "You can leave this blank and write the date by hand when you sign." },
      { type: "note", tone: "warn",
        text: "Every petitioner must sign page 4 by hand, under “I declare under penalty of perjury”. Signing means you swear the facts in the petition are true." },
    ],
  },
];

// The step-by-step page. Answers live only in this browser (localStorage); the PDF is built here with pdf-lib.
import { STEPS, LINKS, KINDS, LABEL_HINTS, TITLE_HINTS, PETITION_TITLES, titleOptions, sourceOptions } from "./steps.js";
import { BLANK, BLANK_ASSET, fill, place, hasWill, letter, survivor, bond } from "./logic.js";
import { buildPdf, attachmentBlocks } from "./pdf.js";
import { EXAMPLE } from "./example.js";

const KEY = "de221-answers-v1";
const DE111_KEY = "de111-answers-v1";
const main = document.getElementById("main");
const nav = document.getElementById("steps");
const status = document.getElementById("save-status");
let answers = load();
let current = -1;  // -1 is the welcome screen; STEPS.length is the review screen

// ---------- storage ----------

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") return { ...BLANK, ...saved };
  } catch { /* private window or blocked storage: start fresh */ }
  return structuredClone(BLANK);
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(answers)); status.textContent = "Saved on this device"; }
    catch { status.textContent = "Not saved: this browser blocks storage. Use “Save answers to a file”."; }
  }, 300);
}

const hasAnswers = () => Object.keys(BLANK).some((k) => JSON.stringify(answers[k]) !== JSON.stringify(BLANK[k]));

// ---------- small DOM helpers ----------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;  // only ever our own copy, never user input
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

// replaceChildren() would print null as text, so optional parts go through this.
function put(node, ...children) { node.replaceChildren(...children.flat().filter((c) => c != null && c !== false)); }

const resolve = (value) => (typeof value === "function" ? value(answers) : value);
let uid = 0;
const nextId = (base) => `${base}-${++uid}`;

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------- questions ----------

function itemTag(q) { return q.item ? el("span", { class: "item" }, `Form: ${q.item}`) : null; }

function labelBlock(q, forId) {
  const hint = resolve(q.hint);
  const hintId = hint ? nextId("hint") : null;
  return {
    hintId,
    nodes: [
      el(forId ? "label" : "legend", { class: "q-label", for: forId }, resolve(q.label), itemTag(q)),
      hint ? el("p", { class: "hint", id: hintId, "data-hint": q.id }, hint) : null,
    ],
  };
}

function textInput(q) {
  const id = nextId(q.id);
  const { hintId, nodes } = labelBlock(q, id);
  const attrs = { id, name: q.id, "aria-describedby": hintId, autocomplete: q.autocomplete || "off", inputmode: q.inputmode,
    class: q.short ? "short" : null };
  let input;
  if (q.type === "textarea") input = el("textarea", { ...attrs, rows: 3 });
  else if (q.type === "select") {
    input = el("select", attrs, el("option", { value: "" }, "Choose…"), ...q.options.map((o) => el("option", { value: o }, o)));
  } else if (q.type === "money") {
    input = el("input", { ...attrs, type: "text", inputmode: "decimal", class: "money-input", placeholder: "0" });
  } else {
    input = el("input", { ...attrs, type: { date: "date", number: "number" }[q.type] || "text", min: q.type === "number" ? 0 : null });
  }
  input.value = answers[q.id] ?? "";
  input.addEventListener("input", () => { answers[q.id] = input.value; changed(); });
  if (q.type === "money") {
    input.addEventListener("blur", () => {
      const n = parseFloat(input.value.replace(/[$,\s]/g, ""));
      if (Number.isFinite(n)) { input.value = n.toLocaleString("en-US", { maximumFractionDigits: 2 }); answers[q.id] = input.value; save(); }
    });
  }
  const field = q.type === "money" ? el("span", { class: "money" }, el("span", { "aria-hidden": "true" }, "$"), input) : input;
  return el("div", { class: "q" }, ...nodes, field);
}

function choiceInput(q) {
  const multi = q.type === "multi";
  const { hintId, nodes } = labelBlock(q);
  const wrap = el("fieldset", { class: "q", "aria-describedby": hintId }, ...nodes);
  const box = el("div", { class: "options" });
  const draw = () => {
    const options = resolve(q.options);
    box.classList.toggle("options-inline", options.length <= 3 && options.every((o) => !o.hint && o.label.length <= 14));
    box.replaceChildren(...options.map((o) => {
      const id = nextId(q.id);
      const checked = multi ? answers[q.id].includes(o.value) : answers[q.id] === o.value;
      const input = el("input", { type: multi ? "checkbox" : "radio", name: q.id, id, value: o.value, checked });
      input.addEventListener("change", () => {
        if (multi) {
          const set = new Set(answers[q.id]);
          input.checked ? set.add(o.value) : set.delete(o.value);
          answers[q.id] = [...set];
        } else answers[q.id] = o.value;
        changed();
      });
      return el("label", { class: "option", for: id }, input,
        el("span", {}, el("span", { class: "option-label" }, o.label), o.hint ? el("span", { class: "option-hint" }, o.hint) : null));
    }));
  };
  draw();
  wrap.redraw = typeof q.options === "function" ? draw : null;
  wrap.append(box);
  return wrap;
}

function personCard(p, i, redraw) {
  const field = (key, label, attrs = {}) => {
    const id = nextId(`p${i}-${key}`);
    const input = attrs.multiline ? el("textarea", { id, rows: 2 }) : el("input", { id, type: "text", autocomplete: "off", ...attrs });
    input.value = p[key] ?? "";
    input.addEventListener("input", () => { p[key] = input.value; changed(); });
    return el("div", { class: `pfield pfield-${key}` }, el("label", { for: id }, label), input);
  };
  const toggle = (key, label, after) => {
    const id = nextId(`p${i}-${key}`);
    const input = el("input", { id, type: "checkbox", checked: !!p[key] });
    input.addEventListener("change", () => { p[key] = input.checked; changed(); after?.(); });
    return el("label", { class: "check", for: id }, input, label);
  };
  const card = el("fieldset", { class: "person" });
  const draw = () => {
    put(card,
      el("legend", {}, p.name?.trim() || `Person ${i + 1}`),
      field("name", "Full name"),
      field("relation", "Relationship to the person who died", { placeholder: "Daughter, brother, friend named in will…" }),
      toggle("deceased", "This person has died", draw),
      p.deceased ? null : toggle("adult", "18 or older", draw),
      p.deceased || p.adult ? null : field("age", "Age", { inputmode: "numeric", class: "short" }),
      p.deceased ? null : field("address", "Mailing address", { multiline: true }),
      el("button", { type: "button", class: "link danger", onclick: () => { answers.people.splice(i, 1); redraw(); changed(); } },
        "Remove this person"),
    );
  };
  draw();
  return card;
}

function peopleInput(q) {
  const wrap = el("div", { class: "q" });
  const list = el("div", { class: "people" });
  const count = el("p", { class: "hint", "aria-live": "polite" });
  const draw = () => {
    list.replaceChildren(...answers.people.map((p, i) => personCard(p, i, draw)));
    const n = answers.people.length;
    count.textContent = n > 3 ? `${n} people. The form fits 3, so everyone goes on an Attachment 9 page that is added for you.`
      : `${n} of 3 rows on the form used.`;
  };
  draw();
  wrap.append(el("h3", { class: "q-label" }, "People to notify", itemTag(q)), count, list,
    el("button", { type: "button", class: "secondary", onclick: () => {
      answers.people.push({ name: "", relation: "", adult: true, age: "", address: "", deceased: false });
      draw(); changed();
      list.lastChild.querySelector("input").focus();
    } }, "+ Add a person"));
  return wrap;
}

// One piece of property. Parts are built once and shown or hidden, so typing never loses focus.
function assetCard(x, i, remove) {
  const field = (key, label, make, hint) => {
    const id = nextId(`a${i}-${key}`);
    const input = make(id);
    const hintNode = hint ? el("p", { class: "hint", id: `${id}-hint` }, typeof hint === "string" ? hint : "") : null;
    if (hintNode) input.setAttribute("aria-describedby", hintNode.id);
    input.value = x[key] ?? "";
    input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { x[key] = input.value; changed(); });
    return el("div", { class: `pfield pfield-${key}` }, el("label", { for: id }, label), hintNode, input);
  };
  const text = (attrs = {}) => (id) => el("input", { id, type: "text", autocomplete: "off", ...attrs });
  const date = (id) => el("input", { id, type: "date", autocomplete: "off" });
  const area = (id) => el("textarea", { id, rows: 2 });
  const select = (options) => (id) => el("select", { id }, el("option", { value: "" }, "Choose…"),
    ...options.map((o) => el("option", { value: o.value }, o.label)));
  const word = bond(answers).replace("registered domestic ", "");

  const legend = el("legend", {});
  const parts = {
    label: field("label", "What is it?", text(), true),
    legal: field("legal", "Legal description", area, "Copy it word for word from the deed. It usually starts “Lot”, “Parcel” or “That certain real property”."),
    apn: field("apn", "Assessor’s Parcel Number", text({ class: "short" }), "It’s on the property tax bill and often on the deed."),
    title: field("title", "Who owns it on the title?", select(titleOptions(answers)), true),
    share: field("share", "What percent did they own?", text({ class: "short", inputmode: "decimal", placeholder: "50" }), "For a half share, enter 50."),
    co_owner: field("co_owner", "Name of the other owner (optional)", text()),
    source: field("source", "How did they get it?", select(sourceOptions(answers)), `This decides whether it is community or separate property. Think about when they got it and whose money paid for it.`),
    acquired: field("acquired", "Date they got it", date, `Courts compare this with the date of the ${word}.`),
    funds: field("funds", "What paid for it? (optional)", area, "The down payment, closing costs and who made the payments, for example “Down payment from joint savings; mortgage paid from wages”. Courts look for this."),
    will_to: field("will_to", "Who does the will give it to?", select([{ value: "spouse", label: `The ${survivor(answers)}` }, { value: "other", label: "Someone else" }])),
  };
  const deedId = nextId(`a${i}-deed`);
  const deedBox = el("input", { id: deedId, type: "checkbox", checked: !!x.deed });
  deedBox.addEventListener("change", () => { x.deed = deedBox.checked; changed(); });
  const deed = el("label", { class: "check", for: deedId }, deedBox,
    "A deed or agreement calls it one person’s “sole and separate property”, or the other spouse signed an interspousal transfer or quitclaim deed");
  const result = el("div", { class: "place", "aria-live": "polite" });
  const kind = field("kind", "What kind of property is it?", select(KINDS));

  const card = el("fieldset", { class: "person asset" }, legend, kind, parts.label, parts.legal, parts.apn, parts.title, parts.share,
    parts.co_owner, parts.source, parts.acquired, parts.funds, deed, parts.will_to, result,
    el("button", { type: "button", class: "link danger", onclick: remove }, "Remove this item"));

  card.refresh = () => {
    const onPetition = PETITION_TITLES.includes(x.title);
    legend.textContent = `Item ${letter(i)}${x.label?.trim() ? `: ${x.label.trim()}` : ""}`;
    parts.label.querySelector(".hint").textContent = LABEL_HINTS[x.kind] || "";
    parts.title.querySelector(".hint").textContent = TITLE_HINTS[x.kind] || "";
    parts.legal.hidden = parts.apn.hidden = x.kind !== "real" || !(onPetition || !x.title);
    parts.share.hidden = x.title !== "other_tic";
    parts.co_owner.hidden = x.title !== "other_tic" && x.title !== "other_jt";
    parts.source.hidden = parts.acquired.hidden = parts.funds.hidden = deed.hidden = !onPetition;
    parts.will_to.hidden = !(onPetition && answers.will_gives === "some" && hasWill(answers));
    const p = place(x, answers);
    result.className = `place place-${p.route}`;
    put(result, el("strong", {}, p.headline), p.reason ? el("p", {}, p.reason) : null, ...p.notes.map((n) => el("p", {}, n)));
  };
  card.refresh();
  return card;
}

function assetsInput(q) {
  const wrap = el("div", { class: "q" });
  const list = el("div", { class: "assets" });
  const draw = () => {
    list.replaceChildren(...answers.assets.map((x, i) => assetCard(x, i, () => { answers.assets.splice(i, 1); draw(); changed(); })));
  };
  draw();
  wrap.refresh = () => { for (const card of list.children) card.refresh(); };
  wrap.append(el("h3", { class: "q-label" }, "Property", itemTag(q)), list,
    el("button", { type: "button", class: "secondary", onclick: () => {
      answers.assets.push({ ...BLANK_ASSET });
      draw(); changed();
      list.lastChild.querySelector("select").focus();
    } }, "+ Add property"));
  return wrap;
}

function noteBlock(q) {
  const node = el("div", { class: `note note-${q.tone || "plain"}` });
  node.refresh = () => { const html = resolve(q.text); node.innerHTML = html; node.hidden = !html; };
  node.refresh();
  return node;
}

function render(q) {
  if (q.type === "note") return noteBlock(q);
  if (q.type === "choice" || q.type === "multi") return choiceInput(q);
  if (q.type === "people") return peopleInput(q);
  if (q.type === "assets") return assetsInput(q);
  return textInput(q);
}

// ---------- screens ----------

let blocks = [];  // [question, node] for the visible step

function changed() {
  save();
  for (const [q, node] of blocks) {
    const show = !q.when || q.when(answers);
    node.hidden = !show;
    if (show && node.refresh) node.refresh();
    if (show && node.redraw) node.redraw();
    if (show && typeof q.label === "function") node.querySelector(".q-label").firstChild.textContent = resolve(q.label);
    if (show && typeof q.hint === "function") {
      const hint = node.querySelector(`[data-hint="${q.id}"]`);
      if (hint) hint.textContent = q.hint(answers);
    }
  }
  drawNav();
}

function stepDone(step) {
  return step.questions.filter((q) => q.id && q.type !== "note" && (!q.when || q.when(answers)) && !/optional/i.test(resolve(q.label)))
    .every((q) => {
      const v = answers[q.id];
      if (q.type === "people") return v.some((p) => p.name?.trim());
      if (q.type === "assets") return v.some((x) => x.label?.trim());
      if (Array.isArray(v)) return v.some((x) => String(x).trim());
      return String(v ?? "").trim() !== "";
    });
}

function drawNav() {
  nav.replaceChildren(...[...STEPS.map((s, i) => [s.title, i, stepDone(s)]), ["Check and download", STEPS.length, false]]
    .map(([title, i, done]) => el("li", { class: [i === current && "current", done && "done"].filter(Boolean).join(" ") },
      el("button", { type: "button", "aria-current": i === current ? "step" : null, onclick: () => go(i) },
        el("span", { class: "dot", "aria-hidden": "true" }, done ? "✓" : String(i + 1)),
        el("span", {}, title, done ? el("span", { class: "sr-only" }, " (done)") : null)))));
  document.getElementById("progress-text").textContent = current < 0 ? "" :
    current < STEPS.length ? `Step ${current + 1} of ${STEPS.length + 1}: ${STEPS[current].title}` : `Step ${STEPS.length + 1} of ${STEPS.length + 1}: Check and download`;
}

function go(i) {
  current = i;
  nav.parentElement.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "Show all steps";
  if (i < 0) welcome();
  else if (i >= STEPS.length) review();
  else showStep(STEPS[i]);
  drawNav();
  document.body.classList.toggle("on-welcome", i < 0);
  window.scrollTo({ top: 0 });
  main.querySelector("h2")?.focus();
}

function pager() {
  return el("div", { class: "pager" },
    el("button", { type: "button", class: "secondary", onclick: () => go(current - 1) }, current === 0 ? "Back to start" : "Back"),
    el("button", { type: "button", class: "primary", onclick: () => go(current + 1) },
      current === STEPS.length - 1 ? "Check my answers" : "Next"));
}

function showStep(step) {
  blocks = step.questions.map((q) => [q, render(q)]);
  put(main,
    el("h2", { tabindex: "-1" }, step.title),
    step.intro ? el("p", { class: "lede" }, step.intro) : null,
    ...blocks.map(([, node]) => node),
    pager());
  changed();
}

function welcome() {
  blocks = [];
  const resume = hasAnswers();
  const fileInput = el("input", { type: "file", accept: "application/json,.json", class: "sr-only", id: "open-file" });
  fileInput.addEventListener("change", openFile);
  const de111 = savedDe111();
  const link = (href, text) => el("a", { href, target: "_blank", rel: "noopener" }, text);
  put(main,
    el("h2", { class: "welcome-title", tabindex: "-1" }, "Fill out the Spousal Property Petition (DE-221)"),
    el("p", { class: "lede" }, "When a married person or registered domestic partner dies, this California court form can move property to the survivor without full probate. Answer questions in plain language and get the official form filled in, with Attachments 7, 7a and 7b written for you."),
    el("ul", { class: "promises" },
      el("li", {}, el("strong", {}, "Private. "), "Your answers stay in this browser on this device. Nothing is sent anywhere."),
      el("li", {}, el("strong", {}, "Free. "), "No account, no fees."),
      el("li", {}, el("strong", {}, "About 30 minutes. "), "Stop any time. Your answers are saved on this device until you erase them.")),
    el("div", { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => go(0) }, resume ? "Continue where I left off" : "Start"),
      el("button", { type: "button", class: "secondary", onclick: exampleSheet }, "See a filled-in example"),
      el("label", { class: "secondary button", for: "open-file" }, "Open saved answers"), fileInput),
    de111 && !resume ? el("div", { class: "note note-info" }, "You have answers saved in our DE-111 helper. ",
      el("button", { type: "button", class: "link", onclick: () => importDe111(de111) }, "Start with the answers the two forms share")) : null,
    el("h2", {}, "Is this the right form?"),
    el("p", {}, "This form may fit if:"),
    el("ul", {},
      el("li", {}, "The person who died was married or in a registered domestic partnership."),
      el("li", {}, "A will leaves property outright to the survivor, or there is no will and the law gives it to them."),
      el("li", {}, "The property is real estate, vehicles, accounts or anything else. There is no dollar limit, a mortgage doesn’t stop it, and it can cover more than the home they lived in.")),
    el("p", {}, "It covers only what actually passes to the survivor:"),
    el("ul", {},
      el("li", {}, el("strong", {}, "Community property: "), "with no will, or a will leaving it to the survivor, all of it can go through this form."),
      el("li", {}, el("strong", {}, "Separate property with no will: "), "the survivor gets only one-half or one-third if there are children or close relatives. Their part needs probate or another route."),
      el("li", {}, el("strong", {}, "Joint tenancy, living trusts and named beneficiaries: "), "these pass on their own and stay off this form."),
      el("li", {}, el("strong", {}, "Property left in a trust by the will, or to someone else: "), "this needs probate.")),
    el("p", {}, "Need probate for some or all of it? Use our ", el("a", { href: LINKS.de111 }, "Petition for Probate helper (DE-111)"),
      ". The two can be filed together."),
    el("h2", {}, "Have these nearby"),
    el("ul", {},
      el("li", {}, "The death certificate and the marriage or partnership certificate"),
      el("li", {}, "The will and any codicils (signed changes to the will), if there is one"),
      el("li", {}, "The most recent recorded deed for each property. It shows who owns it, the legal description and often the parcel number."),
      el("li", {}, "Vehicle titles and recent account statements"),
      el("li", {}, "Records of what paid for each property: down payment, closing costs, who made the payments"),
      el("li", {}, "Names, ages and addresses of children and of everyone named in the will")),
    el("p", {}, link(LINKS.simpleTransfer, "Simpler ways to transfer property"), " · ",
      link(LINKS.form("DE-221"), "The official form"), " · ", link(LINKS.selfHelpCenters, "Free help at your court’s self-help center")),
    el("aside", { class: "note note-warn" }, el("strong", {}, "Not legal advice. "),
      "This tool fills in the official form from your answers. It is not a lawyer and doesn’t review your situation. Whether property is community or separate can be hard to tell and affects who inherits, so talk to a lawyer if you’re unsure or anyone disagrees. Your county may require extra local forms. The court’s self-help center can check your forms for free."),
    el("p", {}, el("button", { type: "button", class: "link", onclick: loadExample }, "Walk through the questions with made-up example answers"),
      resume ? " · " : null, resume ? el("button", { type: "button", class: "link danger", onclick: eraseAll }, "Erase my saved answers") : null),
  );
}

// ---------- review and download ----------

function summary(a, r) {
  const who = survivor(a);
  const lines = [];
  if (r.passing.length) lines.push(`Determine that ${r.passing.length} item${r.passing.length === 1 ? "" : "s"} of the decedent’s property pass${r.passing.length === 1 ? "es" : ""} to the ${who} without probate.`);
  if (r.confirmed.length) lines.push(`Confirm that the ${who} already owns their share of ${r.confirmed.length} item${r.confirmed.length === 1 ? "" : "s"}.`);
  if (a.referee === "yes") lines.push("Appoint a probate referee right away.");
  lines.push(`${r.people.length + r.attachment9.length} people to notify.`);
  return lines;
}

function routes(r) {
  return el("ul", { class: "routes" }, ...r.placed.map(({ x, p, tag }) => el("li", {}, el("strong", {}, `Item ${tag}, ${x.label.trim()}: `), p.headline,
    p.reason && p.route === "leave" ? el("span", {}, p.reason) : null)));
}

function draft(r) {
  const blocks = attachmentBlocks(r);
  const section = (title, list) => (list.length ? [el("h4", {}, title),
    ...list.map((b) => el("p", {}, b.head ? el("strong", {}, `${b.head}\n`) : null, b.text))] : []);
  return el("details", { class: "draft" }, el("summary", {}, "Read what this tool wrote for Attachments 7, 7a and 7b"),
    ...section("Attachment 7: facts", blocks.a7), ...section("Attachment 7a: passing to the survivor", blocks.a7a),
    ...section("Attachment 7b: already the survivor’s", blocks.a7b));
}

function nextSteps(a) {
  const f = (id, text) => el("a", { href: LINKS.form(id), target: "_blank", rel: "noopener" }, text || id);
  return el("ol", { class: "next" },
    el("li", {}, el("strong", {}, "Read it, then sign. "), "The petitioner signs page 2 by hand. Leave the attorney lines blank. Make at least two copies."),
    el("li", {}, el("strong", {}, "Check your county’s rules. "), "Many counties want their own forms and extra papers. Riverside, for example, requires its own attachment with a copy of the death certificate and the deed that gave the decedent title. Look at your court’s probate page or ask its ", el("a", { href: LINKS.selfHelpCenters, target: "_blank", rel: "noopener" }, "self-help center"), "."),
    hasWill(a) ? el("li", {}, el("strong", {}, "Give the court the original will "), "if it hasn’t been filed yet.") : null,
    el("li", {}, el("strong", {}, "File it "), `with the probate clerk at the ${a.county ? `${a.county} County` : "county"} superior court, with a Notice of Hearing (`, f("DE-120"), "). The filing fee is usually $435, and some counties charge a little more. There is no additional fee if a probate case is already open. If you can’t afford it, ask for a fee waiver (", f("FW-001"), "). The clerk sets a hearing date."),
    el("li", {}, el("strong", {}, "Give notice. "), "At least 15 days before the hearing, an adult who isn’t part of the case mails the Notice of Hearing and a copy of the petition to everyone in items 9 and 10, then fills in the proof of service on the notice. File that with the court. Newspaper publication isn’t part of this petition. If the will gives to a charity with no named recipient, notify the Attorney General too (Probate Code § 13655)."),
    el("li", {}, el("strong", {}, "Prepare the order "), "(", f("DE-226"), "). Its Attachments 5a and 7a list the same property as your Attachments 7a and 7b, so you can reuse them. Ask the clerk when it’s due."),
    el("li", {}, el("strong", {}, "Check the court’s probate notes "), "before the hearing. They list anything the court wants fixed. Then go to the hearing if your court requires it."),
    el("li", {}, el("strong", {}, "After the judge signs, "), "get certified copies of the order. Record one with the county recorder where each property is located, usually with a Preliminary Change of Ownership Report. Give copies to banks, the DMV and anyone else who holds property."),
    el("li", {}, el("strong", {}, "Keep paying the mortgages. "), "Tell each loan servicer about the death. Federal law generally stops a lender from calling a home loan due because of a transfer to a relative when the borrower dies (12 U.S.C. § 1701j-3(d)), but ask the servicer before transferring a home nobody in the family will live in."),
    el("li", {}, el("strong", {}, "Know what comes with it. "), "The survivor can be personally liable for the decedent’s debts, up to the net value of certain property, mainly what they received (Probate Code §§ 13550, 13551). If debts are large, ask a lawyer whether probate is safer; the survivor can also choose to have property go through probate (§ 13502)."),
    el("li", {}, el("strong", {}, "Ask about property tax. "), "Transfers to a spouse aren’t reassessed. A later transfer to a child generally avoids reassessment only if the home was the parent’s main home and the child moves in (Proposition 19). The county assessor can tell you how this applies."));
}

async function makePdf(a) {
  if (!window.PDFLib) throw new Error("The PDF library didn’t load. Check your connection and reload the page.");
  const template = await (await fetch("de221-fillable.pdf")).arrayBuffer();
  return buildPdf(window.PDFLib, template, a);
}

function fileName(a) {
  const name = (a.d_name || "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `DE-221${name ? `-Estate-of-${name}` : ""}.pdf`;
}

async function exampleSheet() {
  try { download((await makePdf(EXAMPLE)).bytes, "DE-221-example-fictional.pdf", "application/pdf"); }
  catch (err) { alert(err.message); }
}

function review() {
  blocks = [];
  const result = fill(answers);
  const out = el("p", { class: "result", role: "status", "aria-live": "polite" });
  const build = async (open) => {
    out.textContent = "Building your PDF…";
    try {
      const { bytes, result: r } = await makePdf(answers);
      if (open) window.open(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), "_blank", "noopener");
      else download(bytes, fileName(answers), "application/pdf");
      const extra = r.warnings.filter((w) => !result.warnings.includes(w));
      out.textContent = extra.length ? `Done. ${extra.join(" ")}` : "Done. Look it over before you print.";
    } catch (err) { out.textContent = `Couldn’t build the PDF: ${err.message}`; }
  };
  const lawyer = el("a", { href: LINKS.hireLawyer, target: "_blank", rel: "noopener" }, "talk to a lawyer");
  put(main,
    el("h2", { tabindex: "-1" }, "Check and download"),
    result.warnings.length ? el("div", { class: "note note-warn" }, el("strong", {}, "Look at these first"),
      el("ul", {}, ...result.warnings.map((w) => el("li", {}, w)))) : el("div", { class: "note note-ok" }, "No problems found in your answers."),
    result.notes.length ? el("div", { class: "note note-info" }, el("ul", {}, ...result.notes.map((n) => el("li", {}, n)))) : null,
    result.placed.length ? el("h3", {}, "Where each item goes") : null,
    result.placed.length ? routes(result) : null,
    result.remains.length ? el("div", { class: "note note-info" }, el("strong", {}, "You’ll also need another route for some property. "),
      "What doesn’t pass to the survivor needs probate or a simpler process if it qualifies. If you need probate, use our ", el("a", { href: LINKS.de111 }, "DE-111 helper"),
      ". The two petitions are filed separately under the same case number (Rules of Court, rule 7.301).")
      : result.passing.length ? el("div", { class: "note note-ok" }, "Everything you listed passes to the survivor or outside this petition, so you may not need probate.") : null,
    el("h3", {}, "Your petition asks the court to"),
    el("ul", {}, ...summary(answers, result).map((s) => el("li", {}, s))),
    result.attachments.length ? el("h3", {}, "Attach these behind page 2") : null,
    result.attachments.length ? el("ul", { class: "attach" }, ...result.attachments.map((x) => el("li", {}, x.text))) : null,
    result.passing.length || result.confirmed.length ? draft(result) : null,
    el("div", { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => build(false) }, "Download the filled-in DE-221 (PDF)"),
      el("button", { type: "button", class: "secondary", onclick: () => build(true) }, "Open it in a new tab")),
    out,
    el("p", { class: "hint" }, "The PDF stays editable, so you can fix small things in a PDF reader. Print it single-sided on plain letter paper."),
    el("p", {}, "If you’re unsure whether something is community or separate property, or anyone may object, ", lawyer, " before you file."),
    el("h3", {}, "What happens next"),
    nextSteps(answers),
    el("h3", {}, "Keep your answers"),
    el("div", { class: "actions" },
      el("button", { type: "button", class: "secondary", onclick: () => download(JSON.stringify(answers, null, 2), "de221-answers.json", "application/json") }, "Save answers to a file"),
      el("button", { type: "button", class: "link danger", onclick: eraseAll }, "Erase my answers from this device")),
    el("p", { class: "hint" }, "The answers file has personal information in it. Keep it somewhere safe."),
    el("div", { class: "pager" }, el("button", { type: "button", class: "secondary", onclick: () => go(current - 1) }, "Back")),
  );
}

function eraseAll() {
  if (!confirm("Erase all your answers from this device? This can’t be undone.")) return;
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  answers = structuredClone(BLANK);
  status.textContent = "Answers erased";
  go(-1);
}

async function openFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    if (hasAnswers() && !confirm("Replace the answers saved on this device with the ones in this file?")) return;
    answers = { ...structuredClone(BLANK), ...Object.fromEntries(Object.entries(data).filter(([k]) => k in BLANK)) };
    save();
    go(0);
  } catch { alert("That file isn’t a saved answers file from this tool."); }
}

const toggle = document.getElementById("steps-toggle");
toggle.addEventListener("click", () => {
  const open = nav.parentElement.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Hide steps" : "Show all steps";
});

function savedDe111() {
  try {
    const saved = JSON.parse(localStorage.getItem(DE111_KEY) || "null");
    return saved && String(saved.d_name || "").trim() ? saved : null;
  } catch { return null; }
}

// Copy what both forms ask for. A few DE-111 answers use different words for the same thing.
function importDe111(old) {
  const shared = ["d_name", "d_aka", "d_date", "d_lived", "d_county", "will", "will_date", "codicil", "codicil_dates", "will_handwritten",
    "will_foreign", "children", "child_kinds", "grandkids", "people", "county", "court_street", "court_mailing", "court_cityzip",
    "court_branch", "case_number", "c_name", "c_street", "c_city", "c_state", "c_zip", "c_phone", "c_email"];
  answers = { ...structuredClone(BLANK), ...Object.fromEntries(shared.filter((k) => k in old).map((k) => [k, old[k]])) };
  if (old.stepchild === "was") answers.stepchild = "is";
  if (["a", "b", "none"].includes(old.relatives)) answers.relatives = old.relatives;
  save();
  go(0);
}

function loadExample() {
  if (hasAnswers() && !confirm("Replace your answers with the made-up example?")) return;
  answers = { ...structuredClone(BLANK), ...structuredClone(EXAMPLE) };
  save();
  go(0);
}

go(-1);

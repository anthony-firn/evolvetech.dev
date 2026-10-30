// The step-by-step page. Answers live only in this browser (localStorage); the PDF is built here with pdf-lib.
import { STEPS, LINKS } from "./steps.js";
import { BLANK, fill, hasWill, role, ROLE_WORDS, estate, money, longDate, joinNames, reps, noBondReason, effectiveIaea,
  shortcuts } from "./logic.js";
import { buildPdf } from "./pdf.js";
import { EXAMPLE } from "./example.js";

const KEY = "de111-answers-v1";
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
      el(forId ? "label" : "legend", { class: "q-label", for: forId }, q.label, itemTag(q)),
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

function namesInput(q) {
  const { nodes } = labelBlock(q);
  const wrap = el("fieldset", { class: "q" }, ...nodes);
  const list = el("div", { class: "names" });
  const draw = () => {
    const names = answers[q.id].length ? answers[q.id] : [""];
    list.replaceChildren(...names.map((name, i) => {
      const id = nextId(q.id);
      const input = el("input", { id, type: "text", value: name, autocomplete: "off", "aria-label": `${q.label} ${i + 1}` });
      input.addEventListener("input", () => { answers[q.id][i] = input.value; changed(); });
      const remove = names.length > 1 ? el("button", { type: "button", class: "link", onclick: () => {
        answers[q.id].splice(i, 1); draw(); changed();
      } }, "Remove") : null;
      return el("div", { class: "name-row" }, input, remove);
    }));
  };
  if (!answers[q.id].length) answers[q.id] = [""];
  draw();
  wrap.append(list, el("button", { type: "button", class: "secondary", onclick: () => {
    answers[q.id].push(""); draw(); list.lastChild.querySelector("input").focus(); changed();
  } }, `+ ${q.add}`));
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
    count.textContent = n > 10 ? `${n} people. The form fits 10; the other ${n - 10} go on an Attachment 8 page that is added for you.`
      : `${n} of 10 rows on the form used.`;
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

function noteBlock(q) {
  const node = el("div", { class: `note note-${q.tone || "plain"}` });
  node.refresh = () => { const html = resolve(q.text); node.innerHTML = html; node.hidden = !html; };
  node.refresh();
  return node;
}

function render(q) {
  if (q.type === "note") return noteBlock(q);
  if (q.type === "choice" || q.type === "multi") return choiceInput(q);
  if (q.type === "names") return namesInput(q);
  if (q.type === "people") return peopleInput(q);
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
    if (show && typeof q.hint === "function") {
      const hint = node.querySelector(`[data-hint="${q.id}"]`);
      if (hint) hint.textContent = q.hint(answers);
    }
  }
  drawNav();
}

function stepDone(step) {
  return step.questions.filter((q) => q.id && q.type !== "note" && (!q.when || q.when(answers)) && !/optional/i.test(q.label))
    .every((q) => {
      const v = answers[q.id];
      if (q.type === "people") return v.some((p) => p.name?.trim());
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
  put(main,
    el("h2", { class: "welcome-title", tabindex: "-1" }, "Fill out the Petition for Probate (DE-111)"),
    el("p", { class: "lede" }, "Answer questions in plain language and get the official California court form filled in, ready to print, sign and file."),
    el("ul", { class: "promises" },
      el("li", {}, el("strong", {}, "Private. "), "Your answers stay in this browser on this device. Nothing is sent anywhere."),
      el("li", {}, el("strong", {}, "Free. "), "No account, no fees."),
      el("li", {}, el("strong", {}, "About 30 minutes. "), "Stop any time. Your answers are saved on this device until you erase them.")),
    el("div", { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => go(0) }, resume ? "Continue where I left off" : "Start"),
      el("button", { type: "button", class: "secondary", onclick: exampleSheet }, "See a filled-in example"),
      el("label", { class: "secondary button", for: "open-file" }, "Open saved answers"), fileInput),
    el("h2", {}, "Have these nearby"),
    el("ul", {},
      el("li", {}, "The death certificate"),
      el("li", {}, "The will and any codicils (signed changes to the will), if there is one"),
      el("li", {}, "Names, ages and addresses of close family and of everyone named in the will"),
      el("li", {}, "Rough values of what they owned (accounts, vehicles, home) and any loans on it")),
    el("h2", {}, "Is probate the right step?"),
    el("p", {}, "Probate is the court process that puts someone in charge of a person’s property after they die, so debts get paid and what is left goes to the right people. You may not need it if:"),
    el("ul", {},
      el("li", {}, "Everything was in a living trust, owned in joint tenancy, or had a named beneficiary (life insurance, retirement accounts, payable-on-death accounts)."),
      el("li", {}, "The property that would go through probate is worth $208,850 or less (deaths on or after April 1, 2025). A small estate affidavit may work."),
      el("li", {}, "Their main home is worth $750,000 or less. A Petition to Determine Succession to Real Property (DE-310) may work."),
      el("li", {}, "Everything goes to a surviving spouse or registered domestic partner (Spousal Property Petition, DE-221).")),
    el("p", {}, el("a", { href: LINKS.simpleTransfer, target: "_blank", rel: "noopener" }, "Simpler ways to transfer property"), " · ",
      el("a", { href: LINKS.formalProbate, target: "_blank", rel: "noopener" }, "How formal probate works"), " · ",
      el("a", { href: LINKS.selfHelpCenters, target: "_blank", rel: "noopener" }, "Free help at your court’s self-help center")),
    el("aside", { class: "note note-warn" }, el("strong", {}, "Not legal advice. "),
      "This tool fills in the official form from your answers. It is not a lawyer and doesn’t review your situation. Your county may require extra local forms. The court’s self-help center can check your forms for free."),
    el("p", {}, el("button", { type: "button", class: "link", onclick: loadExample }, "Walk through the questions with made-up example answers"),
      resume ? " · " : null, resume ? el("button", { type: "button", class: "link danger", onclick: eraseAll }, "Erase my saved answers") : null),
  );
}

// ---------- review and download ----------

function summary(a) {
  const r = role(a);
  const e = estate(a);
  const lines = [];
  if (hasWill(a)) lines.push(`Admit the will${a.will_date ? ` dated ${longDate(a.will_date)}` : ""} to probate${a.will === "lost" ? " (original lost)" : ""}.`);
  lines.push(`Appoint ${joinNames(reps(a)) || "(name missing)"} as ${ROLE_WORDS[r]}.`);
  const iaea = effectiveIaea(a);
  lines.push(iaea === "none" ? "No independent administration." : `${iaea === "full" ? "Full" : "Limited"} authority under the Independent Administration of Estates Act.`);
  const why = noBondReason(a);
  if (why) lines.push(`No bond, because ${why === "3e1" ? "the will waives it" : "everyone who inherits will sign a waiver"}.`);
  else if (a.bond_type === "blocked") lines.push("Cash goes into a blocked account instead of a bond.");
  else lines.push(`Bond of $${money(Number(String(a.bond_amount).replace(/[$,]/g, "")) || e.bond)}.`);
  lines.push(`Estimated estate value: $${money(e.total)}.`);
  lines.push(`${a.people.filter((p) => p.name?.trim()).length} people to notify.`);
  return lines;
}

function nextSteps(a) {
  const f = (id, text) => el("a", { href: LINKS.form(id), target: "_blank", rel: "noopener" }, text || id);
  return el("ol", { class: "next" },
    el("li", {}, el("strong", {}, "Sign it. "), "Each petitioner signs page 4 by hand. Make at least two copies."),
    el("li", {}, el("strong", {}, "File it "), `with the probate clerk at the ${a.county ? `${a.county} County` : "county"} superior court, in person, by mail, or by e-filing where offered. The filing fee is usually $435; if you can’t afford it, ask for a fee waiver (`, f("FW-001"), "). The clerk sets a hearing date, often 4 to 8 weeks away."),
    hasWill(a) ? el("li", {}, el("strong", {}, "Give the court the original will "), "if it hasn’t been filed yet.") : null,
    el("li", {}, el("strong", {}, "Give notice. "), "Fill out the Notice of Petition to Administer Estate (", f("DE-121"), ") with the hearing date. At least 15 days before the hearing, an adult who isn’t part of the case mails it to everyone in item 8. The newspaper publishes it three times, the first at least 15 days before the hearing, and files a proof of publication."),
    el("li", {}, el("strong", {}, "Check the court’s probate notes "), "about a week or two before the hearing. They list anything the court wants fixed."),
    el("li", {}, el("strong", {}, "Prepare the appointment papers: "), "Order for Probate (", f("DE-140"), "), Letters (", f("DE-150"), "), Duties and Liabilities of Personal Representative (", f("DE-147"), ") and its confidential supplement DE-147S. Some courts want them with the petition, others after the hearing."),
    el("li", {}, el("strong", {}, "After the court appoints you, "), "notify creditors (", f("DE-157"), ") and file an Inventory and Appraisal (", f("DE-160"), ") within four months."),
    el("li", {}, el("strong", {}, "Check for local forms. "), "Many counties require their own extra forms. Look at your court’s probate page or ask its ", el("a", { href: LINKS.selfHelpCenters, target: "_blank", rel: "noopener" }, "self-help center"), "."));
}

async function makePdf(a) {
  if (!window.PDFLib) throw new Error("The PDF library didn’t load. Check your connection and reload the page.");
  const template = await (await fetch("de111-fillable.pdf")).arrayBuffer();
  return buildPdf(window.PDFLib, template, a);
}

function fileName(a) {
  const name = (a.d_name || "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `DE-111${name ? `-Estate-of-${name}` : ""}.pdf`;
}

async function exampleSheet() {
  try { download((await makePdf(EXAMPLE)).bytes, "DE-111-example-fictional.pdf", "application/pdf"); }
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
  put(main,
    el("h2", { tabindex: "-1" }, "Check and download"),
    result.warnings.length ? el("div", { class: "note note-warn" }, el("strong", {}, "Look at these first"),
      el("ul", {}, ...result.warnings.map((w) => el("li", {}, w)))) : el("div", { class: "note note-ok" }, "No problems found in your answers."),
    result.notes.length ? el("div", { class: "note note-info" }, el("ul", {}, ...result.notes.map((n) => el("li", {}, n)))) : null,
    el("h3", {}, "Your petition asks the court to"),
    el("ul", {}, ...summary(answers).map((s) => el("li", {}, s))),
    result.attachments.length ? el("h3", {}, "Attach these behind page 4") : null,
    result.attachments.length ? el("ul", { class: "attach" }, ...result.attachments.map((x) => el("li", {}, x.text))) : null,
    shortcuts(answers).length ? el("div", { class: "note note-info" }, el("strong", {}, "Before you file: "),
      "your numbers suggest a simpler process may be possible. ", el("a", { href: LINKS.simpleTransfer, target: "_blank", rel: "noopener" }, "Read about it")) : null,
    el("div", { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => build(false) }, "Download the filled-in DE-111 (PDF)"),
      el("button", { type: "button", class: "secondary", onclick: () => build(true) }, "Open it in a new tab")),
    out,
    el("p", { class: "hint" }, "The PDF stays editable, so you can fix small things in a PDF reader. Print it single-sided on plain letter paper."),
    el("h3", {}, "What happens next"),
    nextSteps(answers),
    el("h3", {}, "Keep your answers"),
    el("div", { class: "actions" },
      el("button", { type: "button", class: "secondary", onclick: () => download(JSON.stringify(answers, null, 2), "de111-answers.json", "application/json") }, "Save answers to a file"),
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

function loadExample() {
  if (hasAnswers() && !confirm("Replace your answers with the made-up example?")) return;
  answers = { ...structuredClone(BLANK), ...structuredClone(EXAMPLE) };
  save();
  go(0);
}

go(-1);

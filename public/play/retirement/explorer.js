const FUNDS = {
  VTI: "US total stock market", VBR: "US small-cap value stocks", SPMO: "US momentum stocks", XLP: "US consumer staples", XLU: "US utilities",
  XLV: "US health care", REIT: "Real estate trusts", NTSX: "Stocks + Treasuries, 1.5x", RSSB: "Global stocks + bonds, return-stacked",
  TQQQ: "Nasdaq-100, 3x daily leverage", GDE: "Stocks + gold, return-stacked", GLD: "Gold", UGL: "Gold, 2x daily leverage",
  DBMF: "Managed futures (trend)", KMLM: "Managed futures (trend)", BND: "US bonds", TLT: "Long US Treasuries",
  ZROZ: "Long zero-coupon Treasuries", TYD: "7–10 year Treasuries, 3x daily leverage", TMF: "Long Treasuries, 3x daily leverage",
  UUP: "US dollar index",
};
const LEVERAGED = new Set(["TQQQ", "UGL", "TYD", "TMF"]);
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (x, digits = 0) => (x * 100).toFixed(digits) + "%";
const state = { amount: 250000, scenario: "base", sort: "print_typical", group: "All", selected: null };
let DATA;

function monthly(rate) { return (rate * state.amount) / 12; }

function render() {
  const rows = DATA.strategies
    .filter((s) => state.group === "All" || s.group === state.group)
    .filter((s) => s.scenarios[state.scenario])
    .sort((a, b) => {
      const x = a.scenarios[state.scenario][state.sort], y = b.scenarios[state.scenario][state.sort];
      return state.sort.startsWith("print") ? y - x : x - y;
    });
  const top = Math.max(...rows.map((s) => s.scenarios[state.scenario].print_typical));
  $("rows").replaceChildren(...rows.map((s) => {
    const m = s.scenarios[state.scenario];
    const tr = document.createElement("tr");
    tr.tabIndex = 0;
    tr.className = (s.reference ? "reference " : "") + (state.selected === s.id ? "selected" : "");
    tr.setAttribute("aria-selected", String(state.selected === s.id));
    const cells = [
      [s.name, "name", s.group],
      [money(monthly(m.print_typical)), "num strong"],
      [money(monthly(m.print_bad)), "num"],
      [null, "bar-col"],
      [pct(m.lose_value), "num " + risk(m.lose_value, 0.1, 0.25)],
      [pct(m.deep_dip), "num " + risk(m.deep_dip, 0.15, 0.35)],
      [pct(m.run_dry, 1), "num " + risk(m.run_dry, 0.01, 0.05)],
    ];
    for (const [text, cls, sub] of cells) {
      const td = document.createElement(cls === "name" ? "th" : "td");
      if (cls === "name") td.scope = "row";
      td.className = cls;
      if (text !== null) td.append(text);
      if (sub) { const span = document.createElement("span"); span.textContent = sub; td.append(span); }
      if (cls === "bar-col") {
        const track = document.createElement("div"); track.className = "track";
        const bad = document.createElement("div"); bad.className = "bad"; bad.style.width = (m.print_bad / top) * 100 + "%";
        const typ = document.createElement("div"); typ.className = "typ"; typ.style.width = (m.print_typical / top) * 100 + "%";
        track.append(typ, bad); td.append(track);
      }
      tr.append(td);
    }
    const choose = () => { state.selected = s.id; render(); $("detail").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }); };
    tr.addEventListener("click", choose);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } });
    return tr;
  }));
  detail();
}

function risk(x, ok, bad) { return x <= ok ? "low" : x >= bad ? "high" : "mid"; }

function detail() {
  const s = DATA.strategies.find((x) => x.id === state.selected) || DATA.strategies[0];
  const m = s.scenarios[state.scenario], r = s.rules, h = s.history;
  const box = $("detail");
  box.replaceChildren();
  const h2 = document.createElement("h2"); h2.textContent = s.name; box.append(h2);
  const lead = document.createElement("p"); lead.className = "detail-lead";
  lead.textContent = `On ${money(state.amount)}, typical histories paid ${money(monthly(m.print_typical))} a month; the worst 1 in 10 histories paid ${money(monthly(m.print_bad))}. ` +
    `In a lean month (1 in 10) the payout was ${money(monthly(m.print_lean_month))}. Typical money left after 40 years: ${pct(m.left_typical)} of the start, after inflation.`;
  box.append(lead);

  const grid = document.createElement("div"); grid.className = "detail-grid";
  const funds = document.createElement("div");
  const fh = document.createElement("h3"); fh.textContent = "Funds"; funds.append(fh);
  const stack = document.createElement("div"); stack.className = "stack"; stack.setAttribute("aria-hidden", "true");
  const list = document.createElement("ul"); list.className = "fund-list";
  Object.entries(s.alloc).forEach(([ticker, weight], i) => {
    const seg = document.createElement("span"); seg.style.width = weight + "%"; seg.className = "c" + (i % 8); stack.append(seg);
    const li = document.createElement("li");
    const sw = document.createElement("span"); sw.className = "swatch c" + (i % 8);
    const name = document.createElement("strong"); name.textContent = `${ticker} ${weight}%`;
    li.append(sw, name, " " + (FUNDS[ticker] || ""));
    if (LEVERAGED.has(ticker)) { const tag = document.createElement("em"); tag.textContent = "leveraged"; li.append(" ", tag); }
    list.append(li);
  });
  funds.append(stack, list);

  const rules = document.createElement("div");
  const rh = document.createElement("h3"); rh.textContent = "Rules"; rules.append(rh);
  const rl = document.createElement("ul"); rl.className = "plain";
  for (const text of [
    `Base pay ${r.base}% of the starting value a year, raised with inflation.`,
    `Bonus: gains above ${pct(1 + r.skim)} of the inflation-adjusted start move to cash, paid out over ${r.bucket_months} months.`,
    `Guardrail: below ${pct(r.cut_below)} of the start, base pay drops to ${pct(r.cut_to)} of normal until it recovers.`,
    `Base pay never cut in ${pct(m.base_never_cut)} of histories; ${pct(m.steady)} of years stayed within 25% of the year before.`,
  ]) { const li = document.createElement("li"); li.textContent = text; rl.append(li); }
  rules.append(rl);

  const decades = document.createElement("div");
  const dh = document.createElement("h3"); dh.textContent = "Typical monthly income by period"; decades.append(dh);
  const dl = document.createElement("dl"); dl.className = "decades";
  for (const [label, key] of [["Years 1–10", "print_y1_10_typ"], ["Years 11–20", "print_y11_20_typ"], ["Years 21–40", "print_y21_40_typ"]]) {
    const d = document.createElement("div"); const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = money(monthly(m[key])); d.append(dt, dd); dl.append(d);
  }
  decades.append(dl);
  if (h.cagr !== undefined) {
    const p = document.createElement("p"); p.className = "small";
    p.textContent = `Backtest without withdrawals from ${h.start.slice(0, 4)} (testfol.io): ${h.cagr.toFixed(1)}% a year, worst drop ${Math.abs(h.mdd).toFixed(0)}%.`;
    decades.append(p);
  }
  grid.append(funds, rules, decades);
  box.append(grid);
}

async function main() {
  DATA = await (await fetch("data.json")).json();
  for (const [key, label] of Object.entries(DATA.scenarios)) $("scenario").append(new Option(label, key));
  for (const group of ["All", ...new Set(DATA.strategies.map((s) => s.group))]) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = group;
    b.setAttribute("aria-pressed", String(group === state.group));
    b.addEventListener("click", () => {
      state.group = group;
      document.querySelectorAll("#filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    $("filters").append(b);
  }
  state.selected = DATA.strategies[0].id;
  const setAmount = (v) => {
    state.amount = Math.min(5000000, Math.max(10000, Number(v) || 10000));
    $("amount").value = state.amount; $("amount-range").value = Math.min(state.amount, 2000000); render();
  };
  $("amount").addEventListener("change", (e) => setAmount(e.target.value));
  $("amount-range").addEventListener("input", (e) => setAmount(e.target.value));
  $("scenario").addEventListener("change", (e) => { state.scenario = e.target.value; render(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  render();
}

main().catch((error) => { $("rows").textContent = "Could not load the research data: " + error; });

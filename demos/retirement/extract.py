"""Turn the retirement-research validation results into the small data file the explorer reads."""
import json
import sys
from pathlib import Path

SCENARIOS = {
    "base": "Base case",
    "trend -2%/yr": "Trend funds earn 2% less a year",
    "trend -4%/yr": "Trend funds earn 4% less a year",
    "gold -3%/yr": "Gold earns 3% less a year",
    "gold -5%/yr": "Gold earns 5% less a year",
    "recent era 2000-2026 only": "Only 2000–2026 market history",
    "3-month blocks": "Harsher reshuffle (3-month blocks)",
    "middle tax": "Middle tax bracket",
}
GROUPS = {"retiree": "Retiree-tuned", "balanced": "Balanced", "max_print": "Most income", "fortress": "Fortress"}
REFERENCES = {"60/40 Printer": "60/40 stocks and bonds", "VTI Printer": "100% US stocks", "CH-12 Printer (current)": "Crisis-Hedged 12"}
METRICS = ["print_typical", "print_bad", "print_lean_month", "lose_value", "deep_dip", "run_dry", "base_never_cut", "steady",
           "left_typical", "print_y1_10_typ", "print_y1_10_bad", "print_y11_20_typ", "print_y21_40_typ"]


def main(repo, out):
    results = json.loads((Path(repo) / "results" / "printer_validate.json").read_text())
    strategies = []
    for key, value in results.items():
        group, _, rank = key.partition(" #")
        if key in REFERENCES:
            name, group_label, reference = REFERENCES[key], "Reference", True
        elif group in GROUPS:
            name, group_label, reference = f"{GROUPS[group]} #{rank}", GROUPS[group], False
        else:
            continue
        settings = value["printer"]
        strategies.append({
            "id": key, "name": name, "group": group_label, "reference": reference,
            "alloc": {ticker.removesuffix("SIM"): weight for ticker, weight in sorted(settings["alloc"].items(), key=lambda kv: -kv[1])},
            "rules": {k: round(settings[k], 4) for k in ("base", "skim", "bucket_months", "cut_below", "cut_to")},
            "history": {k: v if isinstance(v, str) else round(v, 2) for k, v in value.get("testfol", {}).items() if k in ("start", "cagr", "mdd", "sharpe")},
            "scenarios": {s: {m: round(value[s][m], 5) for m in METRICS} for s in SCENARIOS if s in value},
        })
    Path(out).write_text(json.dumps({"scenarios": SCENARIOS, "strategies": strategies}, separators=(",", ":")))
    print(f"{len(strategies)} strategies -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

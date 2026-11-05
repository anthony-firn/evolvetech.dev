"""Build scoped Bunny response-header rules; Jobs is the default consumer."""
import copy

DESCRIPTION = "Evolve Jobs browser and WASM policy"


def jobs_policy(headers):
    block = headers.split("/play/evolve-jobs/*\n", 1)[1].split("\n\n", 1)[0]
    return next(line.split(":", 1)[1].strip() for line in block.splitlines()
                if line.strip().startswith("Content-Security-Policy:"))


def make_rule(zone, policy, slug="evolve-jobs", description=DESCRIPTION, header="Content-Security-Policy"):
    rules = zone.get("EdgeRules", [])
    existing = next((rule for rule in rules if rule.get("Description") == description), None)
    template = existing or next((rule for rule in rules
        if rule.get("ActionParameter1", "").lower() == "content-security-policy"
        and any("fairground" in pattern for trigger in rule.get("Triggers", [])
                for pattern in trigger.get("PatternMatches", []))), None)
    if not template:
        raise RuntimeError("Cannot find the existing Fairground CSP edge-rule template")
    keys = ("ActionType", "ActionParameter1", "ActionParameter2", "ActionParameter3", "TriggerMatchingType", "Triggers")
    rule = {key: copy.deepcopy(template[key]) for key in keys if key in template}
    if not existing:
        for trigger in rule["Triggers"]:
            trigger["PatternMatches"] = [pattern.replace("fairground", slug)
                                         for pattern in trigger.get("PatternMatches", [])]
    if not any(slug in pattern for trigger in rule["Triggers"] for pattern in trigger.get("PatternMatches", [])):
        raise RuntimeError(f"{slug} edge rule must have its own URL trigger")
    rule.update(Description=description, Enabled=True,
                OrderIndex=existing.get("OrderIndex", 0) if existing else max((x.get("OrderIndex", 0) for x in rules), default=0) + 1,
                ActionParameter1=header, ActionParameter2=policy,
                ExtraActions=[])
    if existing:
        rule["Guid"] = existing["Guid"]
    return rule

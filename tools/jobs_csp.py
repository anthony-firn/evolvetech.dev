"""Keep Evolve Jobs' Bunny response policy aligned with its Netlify policy."""
import copy

DESCRIPTION = "Evolve Jobs browser and WASM policy"


def jobs_policy(headers):
    block = headers.split("/play/evolve-jobs/*\n", 1)[1].split("\n\n", 1)[0]
    return next(line.split(":", 1)[1].strip() for line in block.splitlines()
                if line.strip().startswith("Content-Security-Policy:"))


def make_rule(zone, policy):
    rules = zone.get("EdgeRules", [])
    existing = next((rule for rule in rules if rule.get("Description") == DESCRIPTION), None)
    template = existing or next((rule for rule in rules
        if rule.get("ActionParameter1", "").lower() == "content-security-policy"
        and any("fairground" in pattern for trigger in rule.get("Triggers", [])
                for pattern in trigger.get("PatternMatches", []))), None)
    if not template:
        raise RuntimeError("Cannot find the existing Fairground CSP edge rule to derive Jobs' URL trigger")
    keys = ("ActionType", "ActionParameter1", "ActionParameter2", "ActionParameter3", "TriggerMatchingType", "Triggers")
    rule = {key: copy.deepcopy(template[key]) for key in keys if key in template}
    if not existing:
        for trigger in rule["Triggers"]:
            trigger["PatternMatches"] = [pattern.replace("fairground", "evolve-jobs")
                                         for pattern in trigger.get("PatternMatches", [])]
    if not any("evolve-jobs" in pattern for trigger in rule["Triggers"] for pattern in trigger.get("PatternMatches", [])):
        raise RuntimeError("Evolve Jobs edge rule must have its own URL trigger")
    rule.update(Description=DESCRIPTION, Enabled=True,
                OrderIndex=existing.get("OrderIndex", 0) if existing else max((x.get("OrderIndex", 0) for x in rules), default=0) + 1,
                ActionParameter1="Content-Security-Policy", ActionParameter2=policy,
                ExtraActions=[])
    if existing:
        rule["Guid"] = existing["Guid"]
    return rule

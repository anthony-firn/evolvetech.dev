import json


def select_jobs(now, capacity, running, pending):
    """One-machine conservative EASY backfill; input dictionaries are never mutated."""
    resources = ("cpu", "ram")
    active = [r for r in running if r["end"] > now]
    rejected = sorted(j["id"] for j in pending
                      if any(j[k] > capacity[k] for k in resources))
    queue = sorted((j for j in pending if j["id"] not in rejected and j["submitted"] <= now),
                   key=lambda j: (-(j["priority"] + (now - j["submitted"]) // 10),
                                  j["submitted"], j["id"]))
    start, reserved = [], None

    def fits(job, at):
        return all(job[k] + sum(r[k] for r in active if r["end"] > at) <= capacity[k]
                   for k in resources)

    for job in queue:
        if fits(job, now) and (reserved is None or now + job["duration"] <= reserved["at"]):
            start.append(job["id"])
            active.append({"cpu": job["cpu"], "ram": job["ram"], "end": now + job["duration"]})
        elif reserved is None:
            # Only the first blocked job gets a reservation. Later jobs cannot move it.
            at = next(t for t in sorted({r["end"] for r in active}) if fits(job, t))
            reserved = {"id": job["id"], "at": at}
    return {"start": start, "reserved": reserved, "rejected": rejected}


def visualize(now, capacity, running, pending):
    """Export the actual decision together with the inputs that explain it."""
    return json.dumps({"now": now, "capacity": capacity, "running": running,
                       "pending": pending, "plan": select_jobs(now, capacity, running, pending)}, sort_keys=True)

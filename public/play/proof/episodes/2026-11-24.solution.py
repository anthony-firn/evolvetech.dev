import random

def agent_merge(intervals):
    """Merge overlapping closed intervals, e.g. [(1, 3), (2, 6), (8, 10)] -> [(1, 6), (8, 10)]."""
    intervals = sorted(intervals)
    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        if start < merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [tuple(pair) for pair in merged]


def violations(intervals, merged):
    problems = []
    pairs = [tuple(p) for p in merged]
    for pair in pairs:
        if len(pair) != 2 or pair[0] > pair[1]:
            problems.append(f"{pair} is not a (start, end) pair with start <= end")
    if pairs != sorted(pairs):
        problems.append("pairs are not sorted")
    for a, b in zip(pairs, pairs[1:]):
        if b[0] <= a[1]:
            problems.append(f"{a} and {b} overlap or touch")

    def covered(xs, point):
        return any(len(p) == 2 and p[0] <= point <= p[1] for p in xs)

    ends = [v for p in list(intervals) + pairs for v in p]
    if ends:
        lo, hi = min(ends), max(ends)
        # Integer endpoints, so checking every half step finds any difference in coverage.
        for i in range(int(hi - lo) * 2 + 3):
            point = lo - 0.5 + i / 2
            if covered(intervals, point) != covered(pairs, point):
                problems.append(f"coverage differs at {point}")
                break
    return problems


def find_counterexample(fn, trials=500, seed=0):
    rng = random.Random(seed)
    for _ in range(trials):
        xs = []
        for _ in range(rng.randint(0, 6)):
            start = rng.randint(0, 12)
            xs.append((start, start + rng.randint(0, 4)))
        try:
            out = fn(list(xs))
        except Exception:
            return xs
        if violations(xs, out):
            return xs
    return None


def merge(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return [tuple(pair) for pair in out]

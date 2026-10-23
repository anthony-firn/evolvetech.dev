"""Browser entry point: analyse one small graph with Symmetry Forge's exhaustive internal backend."""
import json
import time

from symforge.automorphism import canonical_label
from symforge.colored_graph import ColoredGraph


def cycles(perm):
    """Cycle notation without fixed points, e.g. (0 1 2)(3 4)."""
    seen, parts = set(), []
    for start in range(len(perm)):
        if start in seen or perm[start] == start:
            continue
        cycle, node = [], start
        while node not in seen:
            seen.add(node)
            cycle.append(node)
            node = perm[node]
        parts.append("(" + " ".join(map(str, cycle)) + ")")
    return "".join(parts)


def analyze(n, edges):
    started = time.perf_counter()
    graph = ColoredGraph.empty(n, [0] * n)
    for u, v in edges:
        graph.add_edge(u, v)
    # The internal backend enumerates every automorphism, so the group order is the list length.
    result = canonical_label(graph, max_nodes=16, backend="internal")
    group = [tuple(p) for p in result.automorphisms]
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for perm in group:
        for i, j in enumerate(perm):
            parent[find(i)] = find(j)
    orbits = {}
    for v in range(n):
        orbits.setdefault(find(v), []).append(v)
    examples = sorted((p for p in group if list(p) != list(range(n))), key=lambda p: (len(cycles(p)), p))
    return {
        "order": len(group),
        "orbits": sorted(orbits.values(), key=lambda o: (-len(o), o[0])),
        "examples": [cycles(p) for p in examples[:6]],
        "exact": result.exact,
        "ms": round((time.perf_counter() - started) * 1000, 1),
    }


def analyze_json(text):
    data = json.loads(text)
    return json.dumps(analyze(int(data["n"]), [tuple(edge) for edge in data["edges"]]))

// Runs Symmetry Forge in Pyodide off the main thread, so a long search never freezes the page.
import { loadPyodide } from "./pyodide/pyodide.mjs";

const ready = (async () => {
  const py = await loadPyodide({ indexURL: new URL("./pyodide/", import.meta.url).href });
  const [archive, source] = await Promise.all([
    fetch(new URL("symforge.zip", import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL("analyze.py", import.meta.url)).then((r) => r.text()),
  ]);
  py.unpackArchive(archive, "zip", { extractDir: "/symforge" });
  py.runPython(`import sys; sys.path.insert(0, "/symforge")`);
  py.runPython(source);
  return py.globals.get("analyze_json");
})();

ready.then(
  () => postMessage({ type: "ready" }),
  (error) => postMessage({ type: "error", message: String(error) }),
);

onmessage = async ({ data }) => {
  const analyze = await ready;
  try {
    postMessage({ type: "result", id: data.id, result: JSON.parse(analyze(JSON.stringify(data.graph))) });
  } catch (error) {
    postMessage({ type: "error", id: data.id, message: String(error) });
  }
};

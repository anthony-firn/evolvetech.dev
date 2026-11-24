// Runs exercise code in Python compiled to WebAssembly (Pyodide), off the main thread.
// Reuses the Pyodide copy the Symmetry Forge demo already serves from this site.
import {loadPyodide} from '../symmetry-forge/pyodide/pyodide.mjs';

const ready = (async () => {
  const py = await loadPyodide({indexURL: new URL('../symmetry-forge/pyodide/', import.meta.url).href});
  py.runPython(await (await fetch(new URL('./harness.py', import.meta.url))).text());
  return py;
})();

ready.then(() => postMessage({type: 'ready'}), error => postMessage({type: 'error', message: `Python could not load: ${error}`}));

onmessage = async ({data}) => {
  if (data?.type !== 'run') return;
  try {
    const py = await ready;
    const out = py.globals.get('run')(String(data.code), JSON.stringify(data.tests));
    postMessage({type: 'result', id: data.id, ...JSON.parse(out)});
  } catch (error) {
    postMessage({type: 'result', id: data.id, error: String(error), results: []});
  }
};

// Main-thread side of the Python runner. A run that takes too long (an infinite loop, say) is stopped by
// terminating the worker; the next run starts a fresh one.
let worker = null;
let ready = null;
let seq = 0;

function start(onStatus) {
  worker = new Worker(new URL('./py-worker.js', import.meta.url), {type: 'module'});
  ready = new Promise((resolve, reject) => {
    worker.addEventListener('message', ({data}) => {
      if (data.type === 'ready') resolve();
      if (data.type === 'error') reject(new Error(data.message));
    });
    worker.addEventListener('error', event => reject(new Error(event.message || 'Python worker failed')));
  });
  onStatus?.('Loading Python (about 10 MB, once per visit)…');
  return ready;
}

export async function runPython(code, tests, {timeoutMs = 10000, onStatus} = {}) {
  if (!worker) await start(onStatus); else await ready;
  onStatus?.('Running tests…');
  const id = ++seq;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      worker.terminate(); worker = null;
      resolve({error: `Stopped after ${timeoutMs / 1000} seconds. Look for a loop that never ends.`, results: []});
    }, timeoutMs);
    const onMessage = ({data}) => {
      if (data.type !== 'result' || data.id !== id) return;
      clearTimeout(timer); worker.removeEventListener('message', onMessage); resolve(data);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({type: 'run', id, code, tests});
  });
}

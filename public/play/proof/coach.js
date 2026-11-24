// Optional coach: a small model running on this device through the Evolve LLM SDK. It reviews what you already
// wrote, the way a direct senior engineer would in code review, and asks the next question. It never writes the
// design or the note for you. Models download once from Hugging Face inside Evolve LLM's own worker and are shared
// with /play/evolve-llm/.

export const MODELS = [
  {id: 'qwen2.5-coder-1.5b', label: 'Qwen2.5 Coder 1.5B (about 1 GB, better feedback)'},
  {id: 'qwen2.5-0.5b', label: 'Qwen2.5 0.5B (about 0.5 GB, faster, weaker)'},
];

const ROLE = {
  design: 'a staff engineer reviewing a short system design before anyone writes code',
  ship: 'a senior engineer reading a pull request description who has thirty seconds',
};

const system = (task, focus) => `You are ${ROLE[task]}. Be direct. No praise padding and no rewriting their work.
In at most 110 words:
1. The biggest problem, stated plainly. If it would break in production, say how.
2. One thing that's right and should stay.
3. One question they must answer before this ships.${focus ? `\nCheck especially: ${focus}` : ''}`;

let engine = null;
let loadedId = null;

export async function coach({task, model, prompt, focus, answer, onStatus, onToken, signal}) {
  if (!ROLE[task]) throw new Error(`Unknown coach task ${task}`);
  if (!('gpu' in navigator)) throw new Error('The coach needs WebGPU (recent Chrome or Edge). Your answer is saved either way.');
  const {createEngine} = await import('../evolve-llm/sdk.mjs');
  if (!engine) {
    engine = createEngine();
    onStatus('Checking the GPU…');
    await engine.initialize({signal});
  }
  if (loadedId !== model) {
    onStatus('Loading the model (downloads once, then stays in this browser)…');
    await engine.load(model, {contextSize: 2048, signal, onProgress: event => {
      const done = event.loaded ?? event.received ?? event.bytes;
      const total = event.total ?? event.size;
      onStatus(done && total ? `Downloading the model: ${Math.round(100 * done / total)}%` : 'Preparing the model…');
    }});
    loadedId = model;
  }
  onStatus('Reading it…');
  const messages = [
    {role: 'system', content: system(task, focus)},
    {role: 'user', content: `Task: ${prompt}\n\nWhat I wrote:\n${answer}`},
  ];
  try {
    for await (const event of engine.generate(messages, {maxTokens: 220, temperature: 0.3, signal})) {
      if (event.type === 'token') onToken(event.text);
    }
  } catch (error) {
    loadedId = null; // the SDK unloads the model after a cancelled or failed generation
    throw error;
  }
  onStatus('');
}

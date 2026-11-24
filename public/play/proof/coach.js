// Optional coach: a small model running on this device through the Evolve LLM SDK. It reads your answer
// after you've written it and asks the next question; it does not write the answer for you.
// Models download once from Hugging Face inside Evolve LLM's own worker and are shared with /play/evolve-llm/.

export const MODELS = [
  {id: 'qwen2.5-coder-1.5b', label: 'Qwen2.5 Coder 1.5B (about 1 GB, better feedback)'},
  {id: 'qwen2.5-0.5b', label: 'Qwen2.5 0.5B (about 0.5 GB, faster, weaker)'},
];

const SYSTEM = `You are a demanding but kind technical interviewer. The candidate wrote the answer below in their own words.
Do not rewrite it or give a model answer. In at most 120 words:
1. Name the strongest specific point.
2. Name the most important thing that is missing, vague or wrong.
3. Ask one follow-up question an interviewer would ask next.`;

let engine = null;
let loadedId = null;

export async function coach({model, prompt, focus, answer, onStatus, onToken, signal}) {
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
  onStatus('Reading your answer…');
  const messages = [
    {role: 'system', content: SYSTEM + (focus ? `\nPay particular attention to: ${focus}` : '')},
    {role: 'user', content: `Question: ${prompt}\n\nMy answer: ${answer}`},
  ];
  try {
    for await (const event of engine.generate(messages, {maxTokens: 220, temperature: 0.4, signal})) {
      if (event.type === 'token') onToken(event.text);
    }
  } catch (error) {
    loadedId = null; // the SDK unloads the model after a cancelled or failed generation
    throw error;
  }
  onStatus('');
}

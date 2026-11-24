// The daily "video": animated scenes narrated by the browser's own speech voice, with captions always on.
// Without speech (muted, or no voice installed) each scene advances on a reading-speed timer instead.
import {el, inline} from './text.js';

const WORDS_PER_SECOND = 2.6;

function visual(v = {}) {
  switch (v.type) {
    case 'title':
      return el('div', {class: 'v-title'}, v.kicker && el('p', {class: 'kicker'}, v.kicker), el('h3', {}, v.text));
    case 'statement':
      return el('div', {class: 'v-statement'}, el('p', {class: 'big'}, inline(v.text)), v.sub && el('p', {class: 'sub'}, inline(v.sub)));
    case 'bullets':
      return el('ul', {class: 'v-bullets'}, v.items.map((item, i) => el('li', {style: `--i:${i}`}, inline(item))));
    case 'code':
      return el('pre', {class: 'v-code'}, el('code', {}, String(v.code).split('\n').map((line, i) =>
        el('span', {class: (v.highlight || []).includes(i + 1) ? 'line hot' : 'line'}, line || ' '))));
    case 'compare':
      return el('div', {class: 'v-compare'}, [v.left, v.right].map(side => el('div', {},
        el('h4', {}, side.title), el('ul', {}, side.items.map((item, i) => el('li', {style: `--i:${i}`}, inline(item)))))));
    case 'flow':
      return el('ol', {class: 'v-flow'}, v.steps.map((step, i) => el('li', {style: `--i:${i}`}, inline(step))));
    default:
      return el('div', {class: 'v-statement'}, el('p', {class: 'big'}, v.text || ''));
  }
}

export function createPlayer(scenes, {onFinish} = {}) {
  let index = 0, playing = false, timer = null, rate = 1, sound = 'speechSynthesis' in window;
  const stage = el('div', {class: 'stage', 'aria-live': 'polite'});
  const caption = el('p', {class: 'caption'});
  const bar = el('div', {class: 'bar'}, scenes.map(() => el('span')));
  const playBtn = el('button', {type: 'button', class: 'primary', onclick: () => (playing ? pause() : play())}, 'Play');
  const soundBtn = el('button', {type: 'button', 'aria-pressed': String(sound), onclick: toggleSound}, sound ? 'Sound on' : 'Sound off');
  const speed = el('select', {'aria-label': 'Narration speed', onchange: e => {rate = Number(e.target.value); if (playing) speak();}},
    ['0.9', '1', '1.15', '1.3', '1.5'].map(r => el('option', {value: r, selected: r === '1'}, `${r}×`)));
  const controls = el('div', {class: 'controls'},
    el('button', {type: 'button', 'aria-label': 'Previous scene', onclick: () => go(index - 1)}, '◀'),
    playBtn,
    el('button', {type: 'button', 'aria-label': 'Next scene', onclick: () => go(index + 1)}, '▶'),
    soundBtn, speed);
  const root = el('div', {class: 'player'}, stage, bar, caption, controls);
  if (!('speechSynthesis' in window)) soundBtn.disabled = true;

  function render() {
    const s = scenes[index];
    stage.replaceChildren(el('p', {class: 'scene-n'}, `${index + 1} / ${scenes.length} · ${s.title}`), el('div', {class: 'scene'}, visual(s.visual)));
    caption.replaceChildren(...inline(s.narration));
    [...bar.children].forEach((b, i) => b.className = i < index ? 'done' : i === index ? 'now' : '');
  }
  function stopAudio() {
    clearTimeout(timer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function advance() {
    if (!playing) return;
    if (index < scenes.length - 1) { index++; render(); speak(); }
    else { pause(); onFinish?.(); }
  }
  function speak() {
    stopAudio();
    const text = scenes[index].narration.replace(/[`*]/g, '');
    if (sound) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate; u.lang = 'en-US';
      const voice = speechSynthesis.getVoices().find(v => /en(-|_)US/i.test(v.lang) && /natural|google|samantha|aria|jenny/i.test(v.name))
        || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
      if (voice) u.voice = voice;
      u.onend = () => { timer = setTimeout(advance, 600); };
      u.onerror = () => { timer = setTimeout(advance, readingTime(text)); };
      speechSynthesis.speak(u);
    } else {
      timer = setTimeout(advance, readingTime(text));
    }
  }
  const readingTime = text => 1500 + 1000 * text.split(/\s+/).length / (WORDS_PER_SECOND * rate);
  function play() { playing = true; playBtn.textContent = 'Pause'; root.classList.add('playing'); speak(); }
  function pause() { playing = false; playBtn.textContent = 'Play'; root.classList.remove('playing'); stopAudio(); }
  function go(i) {
    index = Math.max(0, Math.min(scenes.length - 1, i)); render();
    if (playing) speak();
    if (i >= scenes.length) onFinish?.();
  }
  function toggleSound() {
    sound = !sound; soundBtn.textContent = sound ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', String(sound));
    if (playing) speak();
  }
  render();
  return {root, pause};
}

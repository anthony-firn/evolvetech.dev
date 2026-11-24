// Shared visual renderer for browser briefings and exported videos.
import {el, inline} from './text.js';

export function visual(v = {}) {
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


import {el} from './text.js';
import {visual} from './scene.js';
window.renderProofFrame = async ({scene, caption, date, number, total}) => {
  document.querySelector('#video-date').textContent = `${date} · ${number} / ${total}`;
  document.querySelector('#video-scene').replaceChildren(el('div', {class: 'scene'}, visual(scene.visual)));
  document.querySelector('#video-caption').textContent = caption;
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  const overflow = [...document.querySelectorAll('.scene, #video-caption')].some(n => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1);
  if (overflow) throw new Error('Video content exceeds its safe area; shorten the scene or caption.');
};

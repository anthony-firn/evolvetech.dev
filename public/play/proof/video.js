import {el} from './text.js';
import {visual} from './scene.js';
window.renderProofFrame = async ({scene, caption, date, number, total}) => {
  document.querySelector('#video-date').textContent = `${date} · ${number} / ${total}`;
  document.querySelector('#video-scene').replaceChildren(el('div', {class: 'scene'}, visual(scene.visual)));
  document.querySelector('#video-caption').textContent = caption;
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  const stage = document.querySelector('#video-scene').getBoundingClientRect();
  const content = document.querySelector('.scene');
  const box = content.getBoundingClientRect();
  const captionNode = document.querySelector('#video-caption');
  const overflow = box.top < stage.top + 40 || box.top + content.scrollHeight > stage.bottom - 40
    || content.scrollWidth > content.clientWidth + 1
    || captionNode.scrollHeight > captionNode.clientHeight + 1;
  if (overflow) throw new Error('Video content exceeds its safe area; shorten the scene or caption.');
};

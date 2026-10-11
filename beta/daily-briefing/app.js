'use strict';
const state = { editions: [], current: null, topic: 'all' };
const topics = { markets: '企業與市場', hk: '香港要聞', ai: '人工智能', space: '物理與太空', maker: '創客科技' };
const topicOrder = Object.keys(topics);
const el = id => document.getElementById(id);
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function render() {
  const issue = state.current;
  el('issueDate').textContent = new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'full', timeZone: 'Europe/London' }).format(new Date(issue.date + 'T12:00:00Z'));
  el('issueNumber').textContent = '第 ' + String(state.editions.length - state.editions.indexOf(issue)).padStart(3, '0') + ' 期';
  el('note').textContent = issue.note;
  const grid = el('stories'); grid.replaceChildren();
  grid.classList.toggle('filtered', state.topic !== 'all');
  const stories = issue.stories
    .filter(story => state.topic === 'all' || story.topic === state.topic)
    .sort((a, b) => topicOrder.indexOf(a.topic) - topicOrder.indexOf(b.topic));
  el('status').textContent = stories.length ? '' : '本期沒有此分類的新聞，請選擇其他版面。';
  stories.forEach(story => {
    const article = node('article', undefined, 'story');
    const category = node('div', topics[story.topic] || '科技', 'category');
    const date = node('time', story.published); date.dateTime = story.published; category.append(date);
    article.append(category, node('h2', story.headline));
    const imageUrl = safeUrl(story.image.url);
    if (imageUrl) {
      const figure = node('figure'); const image = node('img');
      image.src = imageUrl; image.alt = story.image.alt; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => { image.hidden = true; caption.textContent = '圖片暫時無法載入 · ' + story.image.credit; });
      const caption = node('figcaption', story.image.caption + ' · ' + story.image.credit);
      figure.append(image, caption); article.append(figure);
    }
    article.append(node('p', story.summary, 'summary'));
    const takeaway = node('div', undefined, 'takeaway');
    takeaway.append(node('strong', '為何值得留意'), node('p', story.takeaway)); article.append(takeaway);
    const sourceUrl = safeUrl(story.source.url);
    if (sourceUrl) { const link = node('a', '閱讀原文 ↗ ' + story.source.name, 'source'); link.href = sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; article.append(link); }
    grid.append(article);
  });
}
document.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => {
  state.topic = button.dataset.topic;
  document.querySelectorAll('[data-topic]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (state.current) render();
}));
el('edition').addEventListener('change', event => { state.current = state.editions.find(issue => issue.date === event.target.value); render(); });
el('print').addEventListener('click', () => window.print());
async function init() {
  try {
    const response = await fetch('briefing.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data.editions) || !data.editions.length) throw new Error('No editions');
    state.editions = data.editions.sort((a, b) => b.date.localeCompare(a.date));
    state.editions.forEach(issue => { const option = node('option', issue.date); option.value = issue.date; el('edition').append(option); });
    state.current = state.editions[0]; render();
  } catch { el('issueDate').textContent = '報章暫時無法載入'; el('status').textContent = '請稍後重新整理頁面。'; }
}
init();

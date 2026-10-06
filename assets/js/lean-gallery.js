'use strict';
const $ = selector => document.querySelector(selector);
let records = [], source = 'all', limit = 48;
const failed = new Set();
function safeURL(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
function text(tag, value, cls) { const el = document.createElement(tag); el.textContent = value; if (cls) el.className = cls; return el; }
function render() {
  const query = $('#search').value.toLowerCase().trim();
  const matching = records.filter(r => (source === 'all' || source === r.source) && [r.title,r.description || '',r.source,r.url].join(' ').toLowerCase().includes(query));
  const available = matching.filter(r => r.thumbnail && !failed.has(r.thumbnail));
  const selected = $('#missing').checked ? matching : available;
  $('#count').textContent = selected.length + ' REFERENCES';
  $('#notice').textContent = matching.length > available.length ? (matching.length - available.length) + ' references have no preview. Use “Include links without previews” to see them.' : '';
  $('#grid').replaceChildren();
  for (const r of selected.slice(0, limit)) {
    const card = text('article', '', 'card');
    const link = document.createElement('a'); link.href = safeURL(r.url); link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (r.thumbnail && !failed.has(r.thumbnail)) {
      const img = document.createElement('img'); img.alt = r.title; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = safeURL(r.thumbnail);
      img.onerror = () => { failed.add(r.thumbnail); if ($('#missing').checked) img.replaceWith(text('div', 'Preview could not be loaded · Open original ↗', 'no-preview')); else card.remove(); $('#notice').textContent = 'Some references have no preview or could not load. Include links without previews to access every item.'; };
      link.append(img);
    } else link.append(text('div', 'Open original reference ↗', 'no-preview'));
    const meta = text('div', '', 'meta'); meta.append(text('h3', r.title), text('div', r.source + ' / ' + r.interaction, 'eyebrow'));
    if (r.description && r.description !== r.title) meta.append(text('p', r.description));
    meta.append(text('span', r.source, 'tag')); link.append(meta); card.append(link); $('#grid').append(card);
  }
  $('#empty').hidden = selected.length !== 0; $('#more').hidden = selected.length <= limit;
}
$('#sources').onclick = event => { const b = event.target.closest('button'); if (!b) return; source = b.dataset.source; document.querySelectorAll('#sources button').forEach(el => el.setAttribute('aria-pressed', String(el === b))); limit = 48; render(); };
$('#search').oninput = () => { limit = 48; render(); };
$('#missing').onchange = () => { limit = 48; render(); };
$('#more').onclick = () => { limit += 48; render(); };
$('#shuffle').onclick = () => { for (let i = records.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [records[i], records[j]] = [records[j], records[i]]; } render(); };
async function readArchive(url) {
  const response = await fetch(url, {cache:'no-store'});
  if (!response.ok) throw Error('Archive unavailable');
  return response.json();
}
readArchive(document.body.dataset.archive || 'data/lean_preview_records.json').then(async data => {
  if (data.chunks) {
    let next = 1;
    records = (await readArchive(data.chunks[0])).records;
    const progress = () => { $('#total').textContent = data.total.toLocaleString() + ' references · ' + records.length.toLocaleString() + ' loaded'; };
    progress(); render();
    async function loadChunks() {
      while (next < data.chunks.length) {
        const url = data.chunks[next++];
        const chunk = await readArchive(url);
        records.push(...chunk.records); progress();
      }
    }
    await Promise.all(Array.from({length:4}, loadChunks));
    $('#total').textContent = records.length.toLocaleString() + ' references in your archive';
    render(); return;
  }
  const groups = ['pinterest','instagram','youtube'].map(s => data.records.filter(r => r.source === s));
  for (let i = 0; i < Math.max(...groups.map(g => g.length)); i++) for (const g of groups) if (g[i]) records.push(g[i]);
  $('#total').textContent = records.length + ' references in your archive'; render();
}).catch(() => { $('#total').textContent = records.length ? records.length.toLocaleString() + ' references loaded · import incomplete' : 'Archive could not load'; $('#notice').textContent = 'Some archive data is unavailable. Please reload or sign in again.'; });

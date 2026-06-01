const K_METRICS = 'mtk_v2_metrics';
const K_COUNTS  = 'mtk_v2_counts';
let offset = 0;

const SVG_CHEV_L = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const SVG_CHEV_R = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const SVG_TRASH  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

document.getElementById('prevDay').innerHTML = SVG_CHEV_L;
document.getElementById('nextDay').innerHTML = SVG_CHEV_R;

function dateKey(off) {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}

function labelFor(off) {
  if (off === 0) return 'Today';
  if (off === -1) return 'Yesterday';
  const d = new Date(); d.setDate(d.getDate() + off);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fullDateFor(off) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function loadMetrics() { try { return JSON.parse(localStorage.getItem(K_METRICS)) || []; } catch { return []; } }
function saveMetrics(m) { localStorage.setItem(K_METRICS, JSON.stringify(m)); }
function loadCounts(dk) { try { const a = JSON.parse(localStorage.getItem(K_COUNTS)) || {}; return a[dk] || {}; } catch { return {}; } }
function saveCounts(dk, c) { let a = {}; try { a = JSON.parse(localStorage.getItem(K_COUNTS)) || {}; } catch {} a[dk] = c; localStorage.setItem(K_COUNTS, JSON.stringify(a)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function updateTotal() {
  const metrics = loadMetrics();
  const counts  = loadCounts(dateKey(offset));
  document.getElementById('totalCount').textContent = metrics.reduce((s, m) => s + (counts[m.id] || 0), 0);
}

function render() {
  const dk      = dateKey(offset);
  const metrics = loadMetrics();
  const counts  = loadCounts(dk);

  document.getElementById('dayLabel').textContent  = labelFor(offset);
  document.getElementById('fullDate').textContent  = fullDateFor(offset);
  document.getElementById('nextDay').disabled      = offset >= 0;

  const list = document.getElementById('metricsList');

  if (metrics.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><p>No metrics yet.<br>Add one below to start tracking.</p></div>`;
    document.getElementById('totalCount').textContent = '0';
    return;
  }

  list.innerHTML = '';
  metrics.forEach(m => {
    const val  = counts[m.id] || 0;
    const card = document.createElement('div');
    card.className = 'metric-card' + (val > 0 ? ' is-active' : '');
    card.dataset.id = m.id;
    card.innerHTML = `
      <div style="flex:1;min-width:0">
        <div class="metric-name">${escHtml(m.name)}</div>
      </div>
      <div class="controls">
        <button class="ctrl-btn dec" data-action="dec" data-id="${m.id}" aria-label="Decrease ${escHtml(m.name)}">−</button>
        <div class="${val === 0 ? 'count zero' : val >= 10 ? 'count high' : 'count'}" id="cv-${m.id}">${val}</div>
        <button class="ctrl-btn inc" data-action="inc" data-id="${m.id}" aria-label="Increase ${escHtml(m.name)}">+</button>
      </div>
      <button class="del-btn" data-del="${m.id}" aria-label="Remove ${escHtml(m.name)}">${SVG_TRASH}</button>
    `;
    list.appendChild(card);
  });

  updateTotal();
}

document.getElementById('metricsList').addEventListener('click', e => {
  const dk     = dateKey(offset);
  const counts = loadCounts(dk);

  const btn = e.target.closest('[data-action]');
  if (btn) {
    const id  = btn.dataset.id;
    const cur = counts[id] || 0;
    counts[id] = btn.dataset.action === 'inc' ? cur + 1 : Math.max(0, cur - 1);
    saveCounts(dk, counts);

    const el = document.getElementById('cv-' + id);
    if (el) {
      el.textContent = counts[id];
      el.className   = counts[id] === 0 ? 'count zero' : counts[id] >= 10 ? 'count high' : 'count';
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 200);
    }
    const card = e.target.closest('.metric-card');
    if (card) card.className = 'metric-card' + (counts[id] > 0 ? ' is-active' : '');
    updateTotal();
    return;
  }

  const del = e.target.closest('[data-del]');
  if (del) {
    const id      = del.dataset.del;
    const metrics = loadMetrics();
    const m       = metrics.find(x => x.id === id);
    if (m && confirm(`Remove "${m.name}"?\n\nHistorical counts are kept.`)) {
      saveMetrics(metrics.filter(x => x.id !== id));
      render();
    }
  }
});

function addMetric() {
  const inp  = document.getElementById('newMetricInput');
  const name = inp.value.trim();
  if (!name) return;
  const metrics = loadMetrics();
  if (metrics.some(m => m.name.toLowerCase() === name.toLowerCase())) { showToast('Already exists'); return; }
  metrics.push({ id: 'M' + Date.now(), name });
  saveMetrics(metrics);
  inp.value = '';
  render();
  showToast('Added: ' + name);
}

document.getElementById('addMetricBtn').addEventListener('click', addMetric);
document.getElementById('newMetricInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addMetric(); } });
document.getElementById('prevDay').addEventListener('click', () => { offset--; render(); });
document.getElementById('nextDay').addEventListener('click', () => { if (offset < 0) { offset++; render(); } });

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm(`Reset all counts for ${labelFor(offset)}?`)) {
    saveCounts(dateKey(offset), {});
    render();
    showToast('Counts reset');
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const metrics = loadMetrics();
  if (!metrics.length) { showToast('No metrics to export'); return; }
  let all = {};
  try { all = JSON.parse(localStorage.getItem(K_COUNTS)) || {}; } catch {}
  const days = Object.keys(all).sort();
  if (!days.length) { showToast('No data to export'); return; }

  let csv = 'Date,' + metrics.map(m => `"${m.name.replace(/"/g, '""')}"`).join(',') + '\n';
  days.forEach(dk => {
    const c = all[dk] || {};
    csv += dk + ',' + metrics.map(m => c[m.id] || 0).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'metrics-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported!');
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();

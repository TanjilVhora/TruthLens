// public/js/stats.js
// ✅ IDs: stat-total, stat-fake, stat-real, stat-uncertain (match index.html)
// ✅ Reads: totalAnalyses, fakeCount, realCount, uncertainCount

function animateNum(el, target, dur=1200) {
  if (!el || typeof target !== 'number') return;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now-t0)/dur, 1);
    const e = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(target*e).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function loadStats() {
  try {
    const r = await fetch('/api/stats');
    if (!r.ok) throw new Error(r.status);
    const s = await r.json();
    animateNum(document.getElementById('stat-total'),     s.totalAnalyses  || 0);
    animateNum(document.getElementById('stat-fake'),      s.fakeCount      || 0);
    animateNum(document.getElementById('stat-real'),      s.realCount      || 0);
    animateNum(document.getElementById('stat-uncertain'), s.uncertainCount || 0);
  } catch(e) {
    console.error('[TruthLens] Stats:', e);
  }
}

document.addEventListener('DOMContentLoaded', loadStats);

// public/js/stats.js
// Fetches global stats from /api/stats and animates number display

function animateNumber(el, target, duration = 1200) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current.toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const stats = await response.json();

    const { totalAnalyses, fakeCount, realCount, uncertainCount } = stats;

    const totalEl = document.getElementById('stat-total');
    const fakeEl = document.getElementById('stat-fake');
    const realEl = document.getElementById('stat-real');
    const uncertainEl = document.getElementById('stat-uncertain');

    if (totalEl) animateNumber(totalEl, totalAnalyses || 0);
    if (fakeEl) animateNumber(fakeEl, fakeCount || 0);
    if (realEl) animateNumber(realEl, realCount || 0);
    if (uncertainEl) animateNumber(uncertainEl, uncertainCount || 0);

  } catch (err) {
    console.error('[TruthLens] Stats fetch error:', err);
    // Show dashes on error — already the default state
    ['stat-total', 'stat-fake', 'stat-real', 'stat-uncertain'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent === '—') el.textContent = '—';
    });
  }
}

document.addEventListener('DOMContentLoaded', loadStats);

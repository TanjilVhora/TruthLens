// public/js/stats.js
// Fetches global stats from GET /api/stats and animates
// number counters with an ease-out-cubic animation.

/**
 * Animate a number from 0 to `target` over `duration` ms.
 * Uses ease-out-cubic easing for a natural deceleration.
 */
function animateNumber(el, target, duration = 1300) {
  if (!el || typeof target !== 'number') {
    if (el) el.textContent = target !== undefined ? target.toLocaleString('en-IN') : '—';
    return;
  }

  const startTime = performance.now();

  function tick(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(target * eased);

    el.textContent = current.toLocaleString('en-IN');

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const stats = await response.json();
    const { totalAnalyses, fakeCount, realCount, uncertainCount } = stats;

    animateNumber(document.getElementById('stat-total'),     totalAnalyses  || 0);
    animateNumber(document.getElementById('stat-fake'),      fakeCount      || 0);
    animateNumber(document.getElementById('stat-real'),      realCount      || 0);
    animateNumber(document.getElementById('stat-uncertain'), uncertainCount || 0);

  } catch (err) {
    console.error('[TruthLens] Stats error:', err);
    // Leave dashes — already the default DOM state
  }
}

document.addEventListener('DOMContentLoaded', loadStats);

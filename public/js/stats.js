// stats.js — Fetches global stats and updates counters

(function () {
  function animateCount(el, target, duration = 1200) {
    if (!el || isNaN(target)) return;
    const start = 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Stats unavailable');
      const data = await res.json();

      const { totalAnalyses = 0, fakeCount = 0, realCount = 0, uncertainCount = 0 } = data;

      animateCount(document.getElementById('stat-total'), totalAnalyses);
      animateCount(document.getElementById('stat-real'), realCount);
      animateCount(document.getElementById('stat-fake'), fakeCount);
      animateCount(document.getElementById('stat-uncertain'), uncertainCount);

      window.dispatchEvent(new CustomEvent('statsLoaded', { detail: data }));
    } catch (err) {
      // Silently set fallback values
      ['stat-total', 'stat-real', 'stat-fake', 'stat-uncertain'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      window.dispatchEvent(new CustomEvent('statsLoaded', { detail: {} }));
    }
  }

  loadStats();
})();

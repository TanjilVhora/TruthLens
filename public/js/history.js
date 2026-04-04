// history.js — Fetches and displays analysis history

(function () {
  let allHistory = [];
  let currentFilter = 'all';

  const USER_ID_KEY = 'tl_user_id';

  // ── USER ID ──
  // Must stay identical to getUserId() in analyze.js so IDs always match
  function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getVerdictDotClass(verdict) {
    if (verdict === 'Real') return 'dot-real';
    if (verdict === 'Fake') return 'dot-fake';
    return 'dot-uncertain';
  }

  function getVerdictColor(verdict) {
    if (verdict === 'Real') return 'var(--teal)';
    if (verdict === 'Fake') return 'var(--coral)';
    return 'var(--amber)';
  }

  function getVerdictIcon(verdict) {
    if (verdict === 'Real') return '✅';
    if (verdict === 'Fake') return '🚨';
    return '⚠️';
  }

  function renderHistory(items) {
    const container = document.getElementById('history-list');

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.3rem; color:var(--text-dark); margin-bottom:10px;">
            ${currentFilter === 'all' ? 'No Analyses Yet' : `No ${currentFilter} Articles`}
          </h3>
          <p style="color:var(--text-soft); margin-bottom:28px;">
            ${currentFilter === 'all'
              ? 'Your analysis history will appear here once you start checking articles.'
              : `You have no articles flagged as "${currentFilter}" yet.`}
          </p>
          <a href="analyze.html" class="btn btn-primary">Start Analyzing →</a>
        </div>`;
      return;
    }

    container.innerHTML = items.map((item, idx) => {
      const snippet = (item.article_text || '').substring(0, 100).trim();
      const dot = getVerdictDotClass(item.verdict);
      const color = getVerdictColor(item.verdict);
      const icon = getVerdictIcon(item.verdict);
      const date = formatDate(item.created_at);

      return `
        <div class="history-card-wrap">
          <div class="history-card card">
            <div class="hc-left">
              <span class="hc-num">#${idx + 1}</span>
              <div class="history-verdict-dot ${dot}"></div>
              <span class="history-snippet" title="${(item.article_text || '').substring(0, 300)}">
                ${snippet ? snippet + '…' : '(No text preview)'}
              </span>
            </div>
            <div class="history-meta">
              <span class="history-score" style="color:${color};">
                ${icon} ${item.verdict}
              </span>
              <span class="history-score" style="color:var(--text-soft); font-size:0.82rem;">
                ${item.confidence_score != null ? item.confidence_score + '%' : ''}
              </span>
              <span class="history-date">${date}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function updateMiniStats(items) {
    const total = items.length;
    const fake = items.filter(i => i.verdict === 'Fake').length;
    const real = items.filter(i => i.verdict === 'Real').length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('fake-count').textContent = fake;
    document.getElementById('real-count').textContent = real;
  }

  function applyFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const filtered = filter === 'all'
      ? allHistory
      : allHistory.filter(i => i.verdict === filter);
    renderHistory(filtered);
  }

  async function loadHistory() {
    try {
      const userId = getUserId();
      const res = await fetch(`/api/history?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      allHistory = Array.isArray(data) ? data : [];
      updateMiniStats(allHistory);
      renderHistory(allHistory);
    } catch (err) {
      document.getElementById('history-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.2rem; color:var(--text-dark); margin-bottom:10px;">
            Could Not Load History
          </h3>
          <p style="color:var(--text-soft); margin-bottom:24px;">${err.message}</p>
          <button onclick="location.reload()" class="btn btn-secondary">Try Again</button>
        </div>`;
    }
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  loadHistory();
})();

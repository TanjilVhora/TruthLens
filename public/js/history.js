// public/js/history.js
// Fetches analysis history from /api/history and renders history cards

const USER_ID_KEY = 'tl_user_id';

// Generate or retrieve a simple userId for this browser session
function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getVerdictBadgeHtml(verdict) {
  const v = (verdict || '').toLowerCase();
  const label = verdict || 'Unknown';
  const icons = { real: '✅', fake: '❌', uncertain: '⚠️' };
  const icon = icons[v] || '❓';
  return `<span class="verdict-badge ${v}">${icon} ${label}</span>`;
}

function getScoreColor(verdict) {
  const v = (verdict || '').toLowerCase();
  if (v === 'real') return 'var(--real)';
  if (v === 'fake') return 'var(--fake)';
  return 'var(--uncertain)';
}

function renderHistoryCard(item, index) {
  const snippet = (item.article_text || '').slice(0, 180).trim();
  const displaySnippet = snippet.length === 180 ? snippet + '…' : snippet;
  const score = item.confidence_score ?? '—';
  const date = item.created_at ? formatDate(item.created_at) : '—';
  const verdictClass = (item.verdict || 'uncertain').toLowerCase();
  const scoreColor = getScoreColor(item.verdict);

  return `
    <div class="history-card glass-card fade-up" style="animation-delay:${index * 0.08}s;">
      <div>
        <div class="history-snippet">${displaySnippet || 'No text available'}</div>
        <div class="history-meta">
          ${getVerdictBadgeHtml(item.verdict)}
          <span class="history-date">🕐 ${date}</span>
        </div>
      </div>
      <div class="history-score">
        <div class="score-big" style="color:${scoreColor};">${score}%</div>
        <div class="score-label">Confidence</div>
      </div>
    </div>
  `;
}

async function loadHistory() {
  const listEl = document.getElementById('history-list');
  const loadingEl = document.getElementById('history-loading');
  const emptyEl = document.getElementById('history-empty');
  const errorEl = document.getElementById('history-error');

  // Reset states
  listEl.style.display = 'none';
  emptyEl.style.display = 'none';
  errorEl.style.display = 'none';
  loadingEl.style.display = 'flex';

  const userId = getUserId();

  try {
    const response = await fetch(`/api/history?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const history = await response.json();

    loadingEl.style.display = 'none';

    if (!Array.isArray(history) || history.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    // Sort newest first
    const sorted = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    listEl.innerHTML = sorted.map((item, i) => renderHistoryCard(item, i)).join('');
    listEl.style.display = 'flex';

  } catch (err) {
    console.error('[TruthLens] History fetch error:', err);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

// Auto-load when DOM is ready
document.addEventListener('DOMContentLoaded', loadHistory);

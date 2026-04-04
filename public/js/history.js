// public/js/history.js
// Fetches analysis history from GET /api/history?userId=...
// and renders a card for each entry, newest first.

const USER_ID_KEY = 'tl_user_id';

/**
 * Generate or reuse the same userId as analyze.js.
 * Must stay identical to the getUserId() in analyze.js.
 */
function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    // User hasn't run an analysis yet — generate one for future use
    userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/* ── Formatting helpers ── */

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function verdictClass(verdict) {
  return (verdict || 'uncertain').toLowerCase();
}

function verdictIcon(verdict) {
  const icons = { real: '✅', fake: '❌', uncertain: '⚠️' };
  return icons[verdictClass(verdict)] || '❓';
}

function scoreColor(verdict) {
  const v = verdictClass(verdict);
  if (v === 'real')      return 'var(--real)';
  if (v === 'fake')      return 'var(--fake)';
  return 'var(--uncertain)';
}

/* ── Card HTML builder ── */
function buildCard(item, index) {
  const vc      = verdictClass(item.verdict);
  const snippet = (item.article_text || '').slice(0, 200).trim();
  const display = snippet.length === 200 ? snippet + '…' : (snippet || 'No text available');
  const score   = item.confidence_score ?? '—';
  const date    = formatDate(item.created_at);
  const color   = scoreColor(item.verdict);

  return `
    <div class="history-card glass-card fade-up" style="animation-delay:${index * 0.07}s;">
      <div style="min-width:0;">
        <div class="history-snippet">${display}</div>
        <div class="history-meta">
          <span class="verdict-badge ${vc}">${verdictIcon(item.verdict)} ${item.verdict || 'Unknown'}</span>
          <span class="history-date">🕐 ${date}</span>
        </div>
      </div>
      <div class="history-score">
        <div class="score-big" style="color:${color};">${score}${typeof score === 'number' ? '%' : ''}</div>
        <div class="score-label">Confidence</div>
      </div>
    </div>
  `;
}

/* ── Main loader ── */
async function loadHistory() {
  const listEl    = document.getElementById('history-list');
  const loadingEl = document.getElementById('history-loading');
  const emptyEl   = document.getElementById('history-empty');
  const errorEl   = document.getElementById('history-error');

  // Reset all states
  listEl.style.display    = 'none';
  emptyEl.style.display   = 'none';
  errorEl.style.display   = 'none';
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
    const sorted = [...history].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    listEl.innerHTML    = sorted.map(buildCard).join('');
    listEl.style.display = 'flex';

  } catch (err) {
    console.error('[TruthLens] History error:', err);
    loadingEl.style.display = 'none';
    errorEl.style.display   = 'block';
  }
}

/* ── Auto-load on page ready ── */
document.addEventListener('DOMContentLoaded', loadHistory);

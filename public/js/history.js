// public/js/history.js
// ✅ getUserId() defined here — same key as analyze.js (tl_user_id)
// ✅ userId sent: /api/history?userId=...
// ✅ Mini-stat IDs: total-count, fake-count, real-count (match history.html)
// ✅ History list ID: history-list (matches history.html)

const USER_ID_KEY = 'tl_user_id';

function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
    + ' · ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

function verdictClass(v) { return (v||'uncertain').toLowerCase(); }
function verdictIcon(v)  { return {real:'✅',fake:'❌',uncertain:'⚠️'}[verdictClass(v)]||'❓'; }
function scoreColor(v) {
  const vc=verdictClass(v);
  return vc==='real'?'var(--real)':vc==='fake'?'var(--fake)':'var(--uncertain)';
}

function buildCard(item, index) {
  const vc    = verdictClass(item.verdict);
const snip = (item.articleText || item.article_text || '').slice(0, 200).trim();
  const disp  = snip.length===200?snip+'…':(snip||'No text available');
 const score = item.confidenceScore ?? item.confidence_score ?? '—';
  const date  = formatDate(item.created_at);
  const color = scoreColor(item.verdict);
  return `
    <div class="history-item ${vc} fade-up" style="animation-delay:${index*.06}s;">
      <div style="min-width:0;">
        <div class="h-snippet">${disp}</div>
        <div class="h-meta">
          <span class="verdict-pill ${vc}">${verdictIcon(item.verdict)} ${item.verdict||'Unknown'}</span>
          <span class="h-date">🕐 ${date}</span>
        </div>
      </div>
      <div class="h-score">
        <div class="h-score-num" style="color:${color};">${score}${typeof score==='number'?'%':''}</div>
        <div class="h-score-lbl">Confidence</div>
      </div>
    </div>`;
}

function animateNum(el, target, dur=1000) {
  if (!el||typeof target!=='number') return;
  const t0=performance.now();
  function tick(now) {
    const p=Math.min((now-t0)/dur,1), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*e).toLocaleString('en-IN');
    if(p<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function loadHistory() {
  const listEl    = document.getElementById('history-list');
  const loadingEl = document.getElementById('history-loading');
  const emptyEl   = document.getElementById('history-empty');
  const errorEl   = document.getElementById('history-error');

  listEl.style.display='none'; emptyEl.style.display='none';
  errorEl.style.display='none'; loadingEl.style.display='flex';

  try {
    // ✅ userId in query param
    const res = await fetch(`/api/history?userId=${encodeURIComponent(getUserId())}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    loadingEl.style.display='none';

    if (!Array.isArray(data)||!data.length) { emptyEl.style.display='block'; return; }

    const sorted=[...data].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

    // ✅ Mini stats IDs match history.html
    animateNum(document.getElementById('total-count'), sorted.length);
    animateNum(document.getElementById('fake-count'),  sorted.filter(i=>verdictClass(i.verdict)==='fake').length);
    animateNum(document.getElementById('real-count'),  sorted.filter(i=>verdictClass(i.verdict)==='real').length);

    listEl.innerHTML = sorted.map(buildCard).join('');
    listEl.style.display='flex';

  } catch(err) {
    console.error('[TruthLens] History:', err);
    loadingEl.style.display='none'; errorEl.style.display='block';
  }
}

document.addEventListener('DOMContentLoaded', loadHistory);

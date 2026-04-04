// public/js/analyze.js
// Handles article submission, 3-second cooldown, loading overlay,
// API call to /api/analyze, localStorage save, and redirect to result.html.
//
// ✅ FIX: userId is now sent with every analyze request so the backend
//         can save it to Supabase and history.js can retrieve it later.

/* ── Constants ── */
const COOLDOWN_MS = 3000;
const USER_ID_KEY = 'tl_user_id';

/* ── State ── */
let isCoolingDown = false;

/* ── Helpers ── */

/**
 * Generate or reuse a simple persistent browser userId.
 * Same function used in history.js so IDs always match.
 */
function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Show the inline error box with a message.
 */
function showError(msg) {
  const box  = document.getElementById('error-box');
  const text = document.getElementById('error-text');
  text.textContent = msg;
  box.classList.add('visible');
}

/**
 * Hide the inline error box.
 */
function hideError() {
  document.getElementById('error-box').classList.remove('visible');
}

/* ── Main submit handler ── */
async function handleSubmit() {
  const textarea  = document.getElementById('article-input');
  const btn       = document.getElementById('submit-btn');
  const btnText   = document.getElementById('btn-text');
  const coolBar   = document.getElementById('cooldown-bar');
  const overlay   = document.getElementById('loading-overlay');
  const loadText  = document.getElementById('loading-text');

  // Block if already in cooldown
  if (isCoolingDown) return;

  hideError();

  // ── Validate input ──
  const articleText = textarea.value.trim();

  if (!articleText) {
    showError('Please paste some article text before analyzing.');
    textarea.focus();
    return;
  }

  if (articleText.length < 30) {
    showError('Please enter at least 30 characters for a meaningful analysis.');
    textarea.focus();
    return;
  }

  // ── Start 3-second cooldown ──
  isCoolingDown = true;
  btn.disabled  = true;
  btnText.innerHTML = '<span>⏳</span> Please wait…';

  // Animate cooldown bar draining left to right then disappearing
  coolBar.style.transition = 'none';
  coolBar.style.width      = '100%';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      coolBar.style.transition = `width ${COOLDOWN_MS}ms linear`;
      coolBar.style.width      = '0%';
    });
  });

  // Schedule re-enable after cooldown regardless of request outcome
  const cooldownTimeout = setTimeout(() => {
    isCoolingDown = false;
    btn.disabled  = false;
    btnText.innerHTML = '<span>⚡</span> Analyze for Truth';
    coolBar.style.transition = 'none';
    coolBar.style.width      = '0%';
  }, COOLDOWN_MS);

  // ── Show loading overlay ──
  overlay.classList.add('active');

  // Rotate loading messages every 1.3 s
  const loadingMessages = [
    'Reading article…',
    'Detecting patterns…',
    'Cross-referencing claims…',
    'Computing verdict…',
    'Almost there…',
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx++;
    if (loadText) loadText.textContent = loadingMessages[msgIdx % loadingMessages.length];
  }, 1300);

  try {
    // ── POST to backend ──
    const response = await fetch('/api/analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        articleText,
        userId: getUserId(), // ✅ send userId so backend saves to Supabase
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${response.status}). Please try again.`);
    }

    const result = await response.json();

    // ── Validate response shape ──
    const validVerdicts = ['Real', 'Fake', 'Uncertain'];
    if (!result.verdict || !validVerdicts.includes(result.verdict)) {
      throw new Error('Unexpected response from AI. Please try again.');
    }
    if (typeof result.confidenceScore !== 'number') {
      throw new Error('Invalid confidence score in response. Please try again.');
    }

    // ── Save to localStorage and redirect ──
    localStorage.setItem('tl_result', JSON.stringify(result));
    window.location.href = 'result.html';

  } catch (err) {
    // Hide overlay on error, show message
    overlay.classList.remove('active');
    clearInterval(msgInterval);
    showError(err.message || 'Something went wrong. Please try again.');
    console.error('[TruthLens] Analyze error:', err);
  } finally {
    // Always stop message rotation
    clearInterval(msgInterval);
    // Overlay hides on redirect or error above — nothing more needed here
  }
}

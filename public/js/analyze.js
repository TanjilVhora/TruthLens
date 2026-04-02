// public/js/analyze.js
// Handles article submission, 3-second cooldown, loading state, API call, and redirect to result.html

const COOLDOWN_MS = 3000;
let isCoolingDown = false;
let cooldownTimer = null;

async function handleSubmit() {
  const textarea = document.getElementById('article-input');
  const btn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const errorMsg = document.getElementById('error-msg');
  const errorText = document.getElementById('error-text');
  const cooldownBar = document.getElementById('cooldown-bar');

  // Hide previous errors
  errorMsg.style.display = 'none';

  // Validate input
  const articleText = textarea.value.trim();
  if (!articleText) {
    errorMsg.style.display = 'flex';
    errorText.textContent = 'Please enter some article text to analyze.';
    textarea.focus();
    return;
  }

  if (articleText.length < 30) {
    errorMsg.style.display = 'flex';
    errorText.textContent = 'Please enter at least 30 characters for a meaningful analysis.';
    textarea.focus();
    return;
  }

  // Block if cooling down
  if (isCoolingDown) return;

  // Start cooldown
  isCoolingDown = true;
  btn.disabled = true;
  btnText.textContent = '⏳ Please wait...';

  // Animate cooldown bar from 100% to 0%
  cooldownBar.style.transition = 'none';
  cooldownBar.style.width = '100%';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cooldownBar.style.transition = `width ${COOLDOWN_MS}ms linear`;
      cooldownBar.style.width = '0%';
    });
  });

  // Show loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');
  loadingOverlay.classList.add('active');

  // Rotate loading messages
  const loadingMessages = [
    'Reading article...',
    'Detecting patterns...',
    'Cross-referencing...',
    'Computing verdict...',
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx++;
    const el = document.getElementById('loading-text');
    if (el) el.textContent = loadingMessages[msgIdx % loadingMessages.length];
  }, 1200);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleText }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();

    // Validate response shape
    const validVerdicts = ['Real', 'Fake', 'Uncertain'];
    if (!result.verdict || !validVerdicts.includes(result.verdict)) {
      throw new Error('Invalid response from server. Please try again.');
    }

    // Save result to localStorage
    localStorage.setItem('tl_result', JSON.stringify(result));

    // Redirect to result page
    window.location.href = 'result.html';

  } catch (err) {
    // Hide loading overlay
    loadingOverlay.classList.remove('active');

    // Show error
    errorMsg.style.display = 'flex';
    errorText.textContent = err.message || 'Something went wrong. Please try again.';

    console.error('[TruthLens] Analyze error:', err);
  } finally {
    clearInterval(msgInterval);

    // Keep button disabled for remaining cooldown
    setTimeout(() => {
      isCoolingDown = false;
      btn.disabled = false;
      btnText.textContent = '⚡ Analyze for Truth';
      cooldownBar.style.transition = 'none';
      cooldownBar.style.width = '0%';
    }, COOLDOWN_MS);
  }
}

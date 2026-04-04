// public/js/analyze.js
// ✅ Saves to truthlens_result + truthlens_article (matches result.html)
// ✅ getUserId() defined here — sends userId with every request
// ✅ Image upload: sends imageBase64 + inputType to backend
// ✅ 3-second cooldown with drain bar
// ✅ Loading overlay with rotating messages

const COOLDOWN_MS = 3000;
const USER_ID_KEY = 'tl_user_id';
const RESULT_KEY  = 'truthlens_result';
const ARTICLE_KEY = 'truthlens_article';

let isCoolingDown = false;

function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function showError(msg) {
  const box = document.getElementById('error-box');
  const txt = document.getElementById('error-text');
  if (!box || !txt) return;
  txt.textContent = msg;
  box.classList.add('visible');
}
function hideError() {
  const box = document.getElementById('error-box');
  if (box) box.classList.remove('visible');
}

async function handleSubmit() {
  if (isCoolingDown) return;
  hideError();

  const isImageTab = document.getElementById('tab-image')?.classList.contains('active');
  let articleText = '';
  let imageBase64 = '';
  let inputType   = 'text';

  if (isImageTab) {
    const file = document.getElementById('image-input')?.files?.[0];
    if (!file) { showError('Please upload an image before analyzing.'); return; }
    try { imageBase64 = await fileToBase64(file); inputType = 'image'; }
    catch(e) { showError('Failed to read image. Please try again.'); return; }
  } else {
    articleText = document.getElementById('article-input')?.value.trim() || '';
    if (!articleText)          { showError('Please paste some article text before analyzing.'); return; }
    if (articleText.length < 30) { showError('Please enter at least 30 characters for a meaningful analysis.'); return; }
    inputType = 'text';
  }

  // ── Start cooldown ──
  isCoolingDown = true;
  const btn     = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const coolBar = document.getElementById('cooldown-bar');

  btn.disabled = true;
  btnText.innerHTML = '<span>⏳</span> Please wait…';

  coolBar.style.transition = 'none';
  coolBar.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    coolBar.style.transition = `width ${COOLDOWN_MS}ms linear`;
    coolBar.style.width = '0%';
  }));

  setTimeout(() => {
    isCoolingDown = false;
    btn.disabled  = false;
    btnText.innerHTML = '<span>⚡</span> Analyze for Truth';
    coolBar.style.transition = 'none';
    coolBar.style.width = '0%';
  }, COOLDOWN_MS);

  // ── Loading overlay ──
  const overlay  = document.getElementById('loading-overlay');
  const loadText = document.getElementById('loading-text');
  overlay.classList.add('active');

  const msgs = ['Reading article...','Detecting patterns...','Cross-referencing claims...','Computing verdict...','Almost there...'];
  let mi = 0;
  const msgInterval = setInterval(() => { mi++; if (loadText) loadText.textContent = msgs[mi % msgs.length]; }, 1300);

  try {
    // ✅ Build body — text or image, always include userId
    const body = { inputType, userId: getUserId() };
    if (inputType === 'text')  body.articleText  = articleText;
    if (inputType === 'image') body.imageBase64  = imageBase64;

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${response.status}). Please try again.`);
    }

    const result = await response.json();

    if (!['Real','Fake','Uncertain'].includes(result.verdict))
      throw new Error('Unexpected response from AI. Please try again.');
    if (typeof result.confidenceScore !== 'number')
      throw new Error('Invalid confidence score. Please try again.');

    // ✅ Save with keys that result.html reads
    localStorage.setItem(RESULT_KEY,  JSON.stringify(result));
    localStorage.setItem(ARTICLE_KEY, articleText || '[Image upload]');

    window.location.href = 'result.html';

  } catch(err) {
    overlay.classList.remove('active');
    showError(err.message || 'Something went wrong. Please try again.');
    console.error('[TruthLens] Analyze error:', err);
  } finally {
    clearInterval(msgInterval);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

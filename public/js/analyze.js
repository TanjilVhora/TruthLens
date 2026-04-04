// analyze.js — Handles article submission, cooldown, loading states, image upload

(function () {
  const textarea = document.getElementById('article-textarea');
  const analyzeBtn = document.getElementById('analyze-btn');
  const charCount = document.getElementById('char-count');
  const charHint = document.getElementById('char-hint');
  const cooldownWrap = document.getElementById('cooldown-wrap');
  const cooldownText = document.getElementById('cooldown-text');
  const cooldownFill = document.getElementById('cooldown-fill');
  const errorMsg = document.getElementById('error-msg');
  const loadingOverlay = document.getElementById('loading-overlay');

  const MIN_CHARS = 80;
  const COOLDOWN_MS = 3000;
  const USER_ID_KEY = 'tl_user_id';
  let isCoolingDown = false;
  let isLoading = false;

  // ── USER ID ──
  // Generates or reuses a persistent browser userId.
  // Same key used in history.js so IDs always match.
  function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  }

  // ── CHAR COUNT ──
  textarea.addEventListener('input', () => {
    const len = textarea.value.trim().length;
    charCount.textContent = `${len} characters`;
    if (len >= MIN_CHARS) {
      charHint.textContent = '✓ Ready to analyze';
      charHint.style.color = 'var(--teal)';
    } else {
      charHint.textContent = `${MIN_CHARS - len} more characters needed`;
      charHint.style.color = 'var(--text-soft)';
    }
  });

  // ── LOADING STEPS ANIMATION ──
  function animateLoadingSteps() {
    const steps = ['ls-1', 'ls-2', 'ls-3', 'ls-4'];
    let current = 0;

    steps.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active', 'done'); }
    });

    const el0 = document.getElementById(steps[0]);
    if (el0) el0.classList.add('active');

    const interval = setInterval(() => {
      const prev = document.getElementById(steps[current]);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
      current++;
      if (current >= steps.length) { clearInterval(interval); return; }
      const next = document.getElementById(steps[current]);
      if (next) next.classList.add('active');
    }, 900);
  }

  // ── COOLDOWN ──
  function startCooldown() {
    isCoolingDown = true;
    cooldownWrap.style.display = 'block';
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('btn-disabled');

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, COOLDOWN_MS - elapsed);
      const pct = (remaining / COOLDOWN_MS) * 100;

      cooldownFill.style.width = `${pct}%`;
      cooldownText.textContent = `Please wait ${Math.ceil(remaining / 1000)}s…`;

      if (remaining <= 0) {
        clearInterval(tick);
        isCoolingDown = false;
        cooldownWrap.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('btn-disabled');
        document.getElementById('btn-icon').textContent = '⚡';
        document.getElementById('btn-text').textContent = 'Analyze Now';
      }
    }, 80);
  }

  // ── SHOW ERROR ──
  function showError(msg) {
    errorMsg.innerHTML = `
      <div style="
        padding: 12px 16px;
        background: rgba(255,77,109,0.08);
        border: 1px solid rgba(255,77,109,0.2);
        border-radius: var(--radius-xs);
        font-size: 0.85rem;
        color: var(--coral);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        ⚠️ ${msg}
      </div>`;
  }

  function clearError() {
    errorMsg.innerHTML = '';
  }

  // ── GET IMAGE BASE64 ──
  // Reads the image preview src if user uploaded an image
  function getImageData() {
    const imgPreview = document.getElementById('img-preview');
    if (imgPreview && imgPreview.style.display !== 'none' && imgPreview.src && imgPreview.src.startsWith('data:image')) {
      return imgPreview.src;
    }
    return null;
  }

  // ── SUBMIT ──
  analyzeBtn.addEventListener('click', async () => {
    if (isCoolingDown || isLoading) return;

    clearError();

    const articleText = textarea.value.trim();
    const imageBase64 = getImageData();

    // Validate — need either text or image
    if (!imageBase64 && articleText.length < MIN_CHARS) {
      showError(`Please enter at least ${MIN_CHARS} characters or upload an image.`);
      textarea.focus();
      return;
    }

    // Determine input type
    const inputType = imageBase64 ? 'image' : 'text';

    // Start loading
    isLoading = true;
    loadingOverlay.classList.add('active');
    animateLoadingSteps();
    document.getElementById('btn-icon').textContent = '⏳';
    document.getElementById('btn-text').textContent = 'Analyzing…';

    try {
      // Build request body
      const requestBody = {
        userId: getUserId(),
        inputType
      };

      if (inputType === 'image') {
        requestBody.imageBase64 = imageBase64;
      } else {
        requestBody.articleText = articleText;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      // Save to localStorage — keys match result.html exactly
      localStorage.setItem('truthlens_result', JSON.stringify(result));
      localStorage.setItem('truthlens_article', articleText || '[Image upload]');

      // Small delay so loading animation feels complete
      await new Promise(r => setTimeout(r, 600));

      // Redirect to result page
      window.location.href = 'result.html';

    } catch (err) {
      loadingOverlay.classList.remove('active');
      isLoading = false;
      showError(err.message || 'Analysis failed. Please try again.');
      document.getElementById('btn-icon').textContent = '⚡';
      document.getElementById('btn-text').textContent = 'Analyze Now';
      startCooldown();
    }
  });

  // ── ALLOW SUBMIT WITH Ctrl+Enter ──
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      analyzeBtn.click();
    }
  });

})();

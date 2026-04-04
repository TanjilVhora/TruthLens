// public/js/analyze.js
// Handles article submission, image upload, 3-second cooldown, loading state, API call, and redirect to result.html

const COOLDOWN_MS = 3000;
let isCoolingDown = false;
let selectedImageBase64 = null;
let selectedInputType = 'text';

// ─── IMAGE UPLOAD HANDLER ─────────────────────────────────────────────────────
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be less than 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    // Strip the data:image/jpeg;base64, prefix — only send raw base64
    const base64String = e.target.result.split(',')[1];
    selectedImageBase64 = base64String;
    selectedInputType = 'image';

    // Show image preview if element exists
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const imageLabel = document.getElementById('image-label');

    if (preview && previewImg) {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    }

    if (imageLabel) {
      imageLabel.textContent = `✅ ${file.name}`;
    }

    // Clear textarea when image is selected
    const textarea = document.getElementById('article-input');
    if (textarea) textarea.value = '';
  };

  reader.readAsDataURL(file);
}

// ─── CLEAR IMAGE ──────────────────────────────────────────────────────────────
function clearImage() {
  selectedImageBase64 = null;
  selectedInputType = 'text';

  const fileInput = document.getElementById('image-input');
  if (fileInput) fileInput.value = '';

  const preview = document.getElementById('image-preview');
  if (preview) preview.style.display = 'none';

  const imageLabel = document.getElementById('image-label');
  if (imageLabel) imageLabel.textContent = '📷 Upload Image';
}

// ─── MAIN SUBMIT HANDLER ──────────────────────────────────────────────────────
async function handleSubmit() {
  const textarea = document.getElementById('article-input');
  const btn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const errorMsg = document.getElementById('error-msg');
  const errorText = document.getElementById('error-text');
  const cooldownBar = document.getElementById('cooldown-bar');

  // Hide previous errors
  errorMsg.style.display = 'none';

  const articleText = textarea ? textarea.value.trim() : '';

  // Validate — must have either text or image
  if (selectedInputType === 'image') {
    if (!selectedImageBase64) {
      errorMsg.style.display = 'flex';
      errorText.textContent = 'Please select an image to analyze.';
      return;
    }
  } else {
    if (!articleText) {
      errorMsg.style.display = 'flex';
      errorText.textContent = 'Please enter some article text to analyze.';
      if (textarea) textarea.focus();
      return;
    }
    if (articleText.length < 30) {
      errorMsg.style.display = 'flex';
      errorText.textContent = 'Please enter at least 30 characters for a meaningful analysis.';
      if (textarea) textarea.focus();
      return;
    }
  }

  // Block if cooling down
  if (isCoolingDown) return;

  // Start cooldown
  isCoolingDown = true;
  btn.disabled = true;
  btnText.textContent = '⏳ Please wait...';

  // Animate cooldown bar
  if (cooldownBar) {
    cooldownBar.style.transition = 'none';
    cooldownBar.style.width = '100%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cooldownBar.style.transition = `width ${COOLDOWN_MS}ms linear`;
        cooldownBar.style.width = '0%';
      });
    });
  }

  // Show loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.add('active');

  // Rotate loading messages
  const loadingMessages = selectedInputType === 'image'
    ? ['Reading image...', 'Extracting text...', 'Cross-referencing...', 'Computing verdict...']
    : ['Reading article...', 'Detecting patterns...', 'Cross-referencing...', 'Computing verdict...'];

  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx++;
    const el = document.getElementById('loading-text');
    if (el) el.textContent = loadingMessages[msgIdx % loadingMessages.length];
  }, 1200);

  try {
    // Build request body based on input type
    const requestBody = selectedInputType === 'image'
      ? { imageBase64: selectedImageBase64, inputType: 'image' }
      : { articleText, inputType: 'text' };

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
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
    if (loadingOverlay) loadingOverlay.classList.remove('active');

    errorMsg.style.display = 'flex';
    errorText.textContent = err.message || 'Something went wrong. Please try again.';

    console.error('[TruthLens] Analyze error:', err);
  } finally {
    clearInterval(msgInterval);

    setTimeout(() => {
      isCoolingDown = false;
      btn.disabled = false;
      btnText.textContent = '⚡ Analyze for Truth';
      if (cooldownBar) {
        cooldownBar.style.transition = 'none';
        cooldownBar.style.width = '0%';
      }
    }, COOLDOWN_MS);
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('image-input');
  if (imageInput) imageInput.addEventListener('change', handleImageUpload);

  const clearBtn = document.getElementById('clear-image-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearImage);
});

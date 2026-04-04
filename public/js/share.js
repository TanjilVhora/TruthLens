// public/js/share.js
// Uses html2canvas (loaded via CDN <script> tag — no npm install needed)
// to capture the result card and trigger a PNG download.

async function shareResult() {
  const btn        = document.getElementById('share-btn');
  const resultCard = document.getElementById('result-card');

  if (!resultCard) {
    showToast('Nothing to share yet.', 'error');
    return;
  }

  if (typeof html2canvas === 'undefined') {
    showToast('Share library not loaded. Please refresh the page.', 'error');
    return;
  }

  const original = btn.innerHTML;
  btn.innerHTML  = '⏳ Preparing…';
  btn.disabled   = true;

  try {
    const canvas = await html2canvas(resultCard, {
      backgroundColor: '#1C160E',   // matches --bg-deep
      scale:           2,            // retina-quality
      useCORS:         true,
      logging:         false,
      removeContainer: true,
      // Skip share buttons so the exported image is cleaner
      ignoreElements: (el) => el.classList && el.classList.contains('share-section'),
    });

    canvas.toBlob((blob) => {
      if (!blob) { showToast('Could not generate image. Try again.', 'error'); return; }

      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `truthlens-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✅ Image downloaded — share anywhere!', 'success');
    }, 'image/png', 1.0);

  } catch (err) {
    console.error('[TruthLens] Share error:', err);
    showToast('Failed to capture image. Please try again.', 'error');
  } finally {
    btn.innerHTML = original;
    btn.disabled  = false;
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent  = msg;
  t.className    = `toast ${type} show`;
  setTimeout(() => { t.className = `toast ${type}`; }, 3500);
}

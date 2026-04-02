// public/js/share.js
// Uses html2canvas (loaded via CDN) to capture and download the result card as an image

async function shareResult() {
  const btn = document.getElementById('share-btn');
  const resultCard = document.getElementById('result-card');

  if (!resultCard) {
    showToast('Nothing to share yet.', 'error');
    return;
  }

  if (typeof html2canvas === 'undefined') {
    showToast('Share library not loaded. Please refresh.', 'error');
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Preparing image...';
  btn.disabled = true;

  // Small delay to ensure all elements are fully rendered before capture
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const canvas = await html2canvas(resultCard, {
      backgroundColor: '#ffffff',  // FIX: was '#020408' (pure black) — use white or your actual card bg color
      scale: 2,                    // High-DPI for crisp image
      useCORS: true,
      allowTaint: false,           // FIX: added — prevents tainted canvas from cross-origin elements
      logging: false,
      removeContainer: true,
      ignoreElements: (el) => {
        // Don't capture the share buttons section to keep it clean
        return el.classList && el.classList.contains('share-section');
      },
    });

    // Convert to blob and trigger download
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Could not generate image. Please try again.', 'error');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truthlens-result-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✅ Image downloaded! Share it anywhere.', 'success');
    }, 'image/png', 1.0);

  } catch (err) {
    console.error('[TruthLens] Share error:', err);
    showToast('Failed to capture image. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = `toast ${type}`; }, 3500);
}

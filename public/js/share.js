// public/js/share.js
async function shareResult() {
  const btn = document.getElementById('share-btn');
  const resultCard = document.getElementById('result-card');

  if (!resultCard) {
    showToast('Nothing to share yet.', 'error');
    return;
  }

  if (typeof domtoimage === 'undefined') {
    showToast('Share library not loaded. Please refresh.', 'error');
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Preparing image...';
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const blob = await domtoimage.toBlob(resultCard, {
      bgcolor: '#020408',
      scale: 2
    });

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
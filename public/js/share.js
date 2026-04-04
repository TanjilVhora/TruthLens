// share.js — Converts result card to downloadable image using html2canvas

async function shareResult() {
  const card = document.getElementById('result-card');
  if (!card) {
    alert('Nothing to share.');
    return;
  }

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: '#fdf8f3',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });

    // Show preview
    const preview = document.getElementById('share-preview');
    if (preview) {
      preview.src = canvas.toDataURL('image/png');
      preview.style.display = 'block';
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = `truthlens-result-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Show toast
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '✅ Image saved to your downloads!';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  } catch (err) {
    console.error('html2canvas error:', err);
    throw err;
  }
}

async function shareResult() {
  const btn = document.getElementById('share-btn');
  const resultCard = document.getElementById('result-card'); // [cite: 21]

  if (!resultCard) {
    showToast('Nothing to share yet.', 'error');
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Processing...';
  btn.disabled = true;

  // Filter: Hide buttons and links from the screenshot
  const filter = (node) => {
    const skip = ['share-section', 'btn-share', 'nav-links'];
    if (node.classList && skip.some(cls => node.classList.contains(cls))) {
      return false;
    }
    return true;
  };

  try {
    // toPng is more tenable for complex CSS like yours 
    const dataUrl = await domtoimage.toPng(resultCard, {
      bgcolor: '#020408', // Matches your body bg 
      filter: filter,
      style: {
        'padding': '20px',
        'border-radius': '20px'
      }
    });

    const link = document.createElement('a');
    link.download = `TruthLens-Report-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    showToast('✅ Report saved successfully!', 'success');
  } catch (err) {
    console.error('Download failed:', err);
    showToast('Snapshot failed. Try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
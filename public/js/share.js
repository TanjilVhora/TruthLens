// public/js/share.js
// ✅ Uses result-card ID (matches result.html)
// ✅ html2canvas loaded via CDN script tag

async function shareResult() {
  const btn  = document.getElementById('share-btn');
  const card = document.getElementById('result-card');
  if (!card) { showToast('Nothing to share.','error'); return; }
  if (typeof html2canvas==='undefined') { showToast('Share library not loaded. Please refresh.','error'); return; }

  const orig = btn.innerHTML;
  btn.innerHTML='⏳ Preparing…'; btn.disabled=true;

  try {
    const canvas = await html2canvas(card, {
      backgroundColor:'#FFFFFF',
      scale:2, useCORS:true, logging:false, removeContainer:true,
      ignoreElements: el => el.classList&&el.classList.contains('action-row'),
    });
    canvas.toBlob(blob => {
      if (!blob) { showToast('Could not generate image.','error'); return; }
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=`truthlens-${Date.now()}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('✅ Downloaded — share anywhere!','success');
    },'image/png',1.0);
  } catch(e) {
    console.error('[TruthLens] Share:', e);
    showToast('Failed to capture image. Try again.','error');
  } finally {
    btn.innerHTML=orig; btn.disabled=false;
  }
}

function showToast(msg, type='success') {
  const t=document.getElementById('toast');
  if (!t) return;
  t.textContent=msg; t.className=`toast ${type} show`;
  setTimeout(()=>t.className=`toast ${type}`,3500);
}

// ═══════════════════════════════════════════════════════════
//  result-popup.js — Result overlay with tier-styled card
// ═══════════════════════════════════════════════════════════

const ResultPopup = (() => {
  let popupEl = null;
  let dismissTimer = null;
  let onDismissedCallback = null;

  function show(value, tier, tierText, fullText) {
    if (popupEl) dismiss(true);

    popupEl = document.createElement('div');
    popupEl.id = 'result-popup';
    popupEl.setAttribute('data-tier', tier);

    popupEl.innerHTML = `
      <div class="popup-card">
        <button class="popup-dismiss">&times;</button>
        <div class="popup-result-number" data-tier="${tier}">${value}</div>
        <div class="popup-tier-label" data-tier="${tier}">${tierText}</div>
        <div class="popup-divider"></div>
        <div class="popup-full-text">${escapeHTML(fullText)}</div>
      </div>
    `;

    document.body.appendChild(popupEl);

    popupEl.querySelector('.popup-dismiss').addEventListener('click', () => dismiss());
    popupEl.addEventListener('click', (e) => {
      if (e.target === popupEl) dismiss();
    });

    dismissTimer = setTimeout(() => dismiss(), 8000);
  }

  function dismiss(silent) {
    if (!popupEl) return;
    clearTimeout(dismissTimer);

    popupEl.classList.add('popup-exit');
    const el = popupEl;
    popupEl = null;

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (!silent && onDismissedCallback) onDismissedCallback();
    }, 300);
  }

  function onDismissed(cb) { onDismissedCallback = cb; }
  function isShowing() { return popupEl !== null; }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { show, dismiss, onDismissed, isShowing };
})();

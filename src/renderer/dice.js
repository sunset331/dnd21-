// ═══════════════════════════════════════════════════════════
//  dice.js — State machine: IDLE → EVENT_READY → ROLLING → RESULT → IDLE
// ═══════════════════════════════════════════════════════════

const Dice = (() => {
  // state: 'idle' | 'event_ready' | 'rolling' | 'result'
  let state = 'idle';
  let wrapperEl = null;
  let numberEl = null;
  let cycleHandle = null;

  // Callbacks
  let onRollCompleteCallback = null;

  const SPIN_DURATION = 1400;    // ms — slightly longer for drama
  const CYCLE_INTERVAL = 60;     // ms — faster cycling during spin

  // ─── Init ───
  function init(wrapper, number, onComplete) {
    wrapperEl = wrapper;
    numberEl = number;
    onRollCompleteCallback = onComplete;
    setState('idle');
    numberEl.textContent = '?';
  }

  // ─── State transitions ───
  function setState(newState) {
    state = newState;
    wrapperEl.classList.remove(
      'dice-wrapper--idle',
      'dice-wrapper--event-ready',
      'dice-wrapper--rolling',
      'dice-wrapper--result'
    );
    switch (newState) {
      case 'idle':
        wrapperEl.classList.add('dice-wrapper--idle');
        numberEl.textContent = '?';
        break;
      case 'event_ready':
        wrapperEl.classList.add('dice-wrapper--event-ready');
        numberEl.textContent = '?';
        break;
      case 'rolling':
        wrapperEl.classList.add('dice-wrapper--rolling');
        break;
      case 'result':
        wrapperEl.classList.add('dice-wrapper--result');
        break;
    }
  }

  // ─── Roll (Stage 2: throws the dice) ───
  function roll() {
    if (state !== 'event_ready') return;
    setState('rolling');
    Audio.playRollSound();
    startNumberCycle();
    setTimeout(() => finishRoll(), SPIN_DURATION);
  }

  // ─── Cycle displayed numbers during spin ───
  function startNumberCycle() {
    cycleHandle = setInterval(() => {
      numberEl.textContent = Math.floor(Math.random() * 21) + 1;
    }, CYCLE_INTERVAL);
  }

  // ─── Land on final result ───
  function finishRoll() {
    clearInterval(cycleHandle);
    cycleHandle = null;

    const value = Math.floor(Math.random() * 21) + 1;
    numberEl.textContent = value;
    setState('result');

    const tier = classifyTier(value);
    Audio.playResultSound(tier);

    setTimeout(() => {
      if (onRollCompleteCallback) onRollCompleteCallback(value, tier);
    }, 500);
  }

  // ─── Called by app when popup is dismissed ───
  function returnToIdle() {
    setState('idle');
  }

  // ─── Called by app when Stage 1 event is generated ───
  function setEventReady() {
    setState('event_ready');
  }

  function getState() {
    return state;
  }

  function getRect() {
    return wrapperEl ? wrapperEl.getBoundingClientRect() : null;
  }

  return { init, roll, returnToIdle, setEventReady, getState, getRect };
})();

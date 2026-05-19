// ═══════════════════════════════════════════════════════════
//  audio.js — Procedural sound via Web Audio API (zero files)
// ═══════════════════════════════════════════════════════════

const Audio = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ─── Dice roll: filtered white noise rattle ───
  function playRollSound() {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const duration = 0.18;
    const sampleRate = ac.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ac.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    // 6 staggered noise bursts for rattle effect
    for (let i = 0; i < 6; i++) {
      const source = ac.createBufferSource();
      source.buffer = buffer;

      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500 + Math.random() * 900;
      filter.Q.value = 1.2 + Math.random();

      const gain = ac.createGain();
      const t = now + i * 0.10;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      source.start(t);
      source.stop(t + 0.18);
    }
  }

  // ─── Single oscillator helper ───
  function playTone(type, startFreq, endFreq, duration, vol) {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  // ─── Chord (critical success) ───
  function playChord(freqs, duration, vol) {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;

    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ac.createGain();
      const delay = i * 0.06;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  }

  // ─── Public: play result sound by tier ───
  function playResultSound(tier) {
    if (muted) return;
    switch (tier) {
      case 'CRIT_FAIL':
        playTone('sawtooth', 150, 55, 0.7, 0.15);
        break;
      case 'FAIL':
        playTone('triangle', 220, 190, 0.3, 0.1);
        break;
      case 'SUCCESS':
        playTone('square', 440, 660, 0.4, 0.1);
        break;
      case 'CRIT_SUCCESS':
        playChord([523, 659, 784], 0.9, 0.12);
        break;
    }
  }

  function setMuted(val) {
    muted = val;
  }

  function isMuted() {
    return muted;
  }

  // Pre-init AudioContext on first user gesture
  function init() {
    getCtx();
  }

  return { init, playRollSound, playResultSound, setMuted, isMuted };
})();

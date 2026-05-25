// audio.js — Web Audio API 音效系统

let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function muted() {
  return localStorage.getItem('dnd-pet-sound') === 'off';
}

export const Audio = {
  // 骰子滚动声
  playDiceRoll() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 200 + Math.random() * 400;
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.06);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.06);
    }
  },

  // 成功（金币获得）
  playGoldGain() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.12);
    });
  },

  // 传奇成功（大铃铛）
  playCritSuccess() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.25);
    });
  },

  // 失败（低沉）
  playFail() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  },

  // 大失败（刺耳）
  playDisaster() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    [400, 300, 200, 100].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    });
  },

  // 物品掉落
  playItemDrop() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  },

  // 成就解锁
  playAchievement() {
    if (muted()) return;
    const c = ctx();
    const now = c.currentTime;
    [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }
};

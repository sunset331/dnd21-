// ui.js — DOM 渲染、动画、弹窗

import { DICE } from './core/dice.js';

export class UI {
  constructor() {
    this.canvasEl = document.getElementById('pet-canvas');
    this.nameEl = document.getElementById('char-name');
    this.raceEl = document.getElementById('char-race');
    this.goldEl = document.getElementById('gold-display');
    this.statsEl = document.getElementById('stats-display');
    this.progressFill = document.getElementById('progress-fill');
    this.progressText = document.getElementById('progress-text');
    this.popupOverlay = document.getElementById('adventure-popup');
    this.popupCard = document.getElementById('popup-card');
    this.popupLine1 = document.getElementById('popup-line1');
    this.popupLine2 = document.getElementById('popup-line2');
    this.popupDismiss = document.getElementById('popup-dismiss');
    this.petArea = document.getElementById('pet-area');
    this._sceneSrc = null;
  }

  setScene(src) {
    this._sceneSrc = src;
  }

  renderIdle() {}

  animateOutcome(outcome) {
    if (outcome === 'legendary') {
      this.spawnParticles('✨', 8);
    } else if (outcome === 'disaster') {
      this.spawnParticles('💨', 5);
    } else if (outcome === 'great') {
      this.spawnParticles('✨', 3);
    }
  }

  spawnParticles(emoji, count) {
    if (!this.canvasEl) return;
    const petRect = this.canvasEl.getBoundingClientRect();
    const cx = petRect.left + petRect.width / 2;
    const cy = petRect.top + petRect.height / 3;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'gold-particle';
      p.textContent = emoji;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--drift', (Math.random() - 0.5) * 80 + 'px');
      p.style.animationDelay = Math.random() * 0.3 + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1800);
    }
  }

  updateCharacterDisplay(character) {
    const moodEmoji = character.getMoodEmoji();
    this.nameEl.textContent = moodEmoji ? `${moodEmoji} ${character.name}` : character.name;
    const raceData = character.getRaceData();
    this.raceEl.textContent = raceData.name;
    this.goldEl.textContent = `💰 ${character.gold}`;
    const chr = character.getCharisma();
    const luck = character.getLuck();
    this.statsEl.textContent = `✨魅力${chr}  🍀幸运${luck}`;
  }

  updateProgress(current, max) {
    const pct = Math.round((current / max) * 100);
    this.progressFill.style.width = pct + '%';
    this.progressText.textContent = `${current}/${max}`;
  }

  flashProgress() {
    this.progressFill.style.transition = 'none';
    this.progressFill.style.background = '#ffd700';
    setTimeout(() => {
      this.progressFill.style.transition = 'width 0.3s ease';
      this.progressFill.style.background = '';
    }, 150);
  }

  // ===== 冒险动画 =====
  async playAdventureStart() {
    if (!this.canvasEl) return;
    this.canvasEl.style.transition = 'transform 0.3s ease';
    this.canvasEl.style.transform = 'scale(0.8) rotate(-10deg)';
    await this._sleep(300);
    this.canvasEl.style.transform = 'scale(1.1) rotate(5deg)';
    await this._sleep(200);
    this.canvasEl.style.transform = 'scale(1) rotate(0deg)';
    await this._sleep(100);
  }

  // ===== 冒险结果弹窗 =====
  async showAdventureResult(result) {
    const { narrative, outcome, goldChange } = result;
    const icon = DICE.icon(outcome);

    this.animateOutcome(outcome);

    this.popupLine1.innerHTML = `${icon} ${narrative.line1}`;
    this.popupLine2.innerHTML = narrative.line2;
    this.popupOverlay.classList.remove('hidden');
    this.popupCard.classList.remove('pop-in');
    void this.popupCard.offsetWidth;
    this.popupCard.classList.add('pop-in');

    // 金币动画
    this.goldEl.style.transform = 'scale(1.3)';
    this.goldEl.style.color = goldChange >= 0 ? '#ffd700' : '#ff4466';
    await this._sleep(300);
    this.goldEl.style.transform = 'scale(1)';
    this.goldEl.style.color = '';

    // 如果是正收益，撒金币粒子
    if (goldChange > 0) {
      this.spawnParticles('💰', Math.min(6, Math.ceil(goldChange / 50)));
    }

    return new Promise(resolve => {
      const handler = () => {
        this.popupOverlay.classList.add('hidden');
        this.popupDismiss.removeEventListener('click', handler);
        resolve();
      };
      this.popupDismiss.addEventListener('click', handler);
      setTimeout(() => {
        if (!this.popupOverlay.classList.contains('hidden')) handler();
      }, 8000);
    });
  }

  showNotification(text) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

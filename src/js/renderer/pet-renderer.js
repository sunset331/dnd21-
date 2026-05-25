// pet-renderer.js — CSS骰子 + Canvas Paper Doll
import { setupCanvas } from './dpi.js';
import { LayerManager } from './layer-manager.js';
import { AnimationController, AnimPresets } from './animation.js';
import { PaperDoll } from './paper-doll.js';

export class PetRenderer {
  constructor(canvasId, anchorsData, equipmentData) {
    this.canvas = document.getElementById(canvasId);
    this.canvasCssW = 280; this.canvasCssH = 220;
    this.diceEl = document.getElementById('dice-d21');
    this.lm = new LayerManager(anchorsData, equipmentData);
    this.anim = new AnimationController();
    this.doll = new PaperDoll(this.lm, this.anim);
    this._rafId = null; this._needsRedraw = true;

    this.anim.onChange(() => {
      this._needsRedraw = true;
      this._syncDiceCSS();
    });
  }

  async init(character) {
    const race = character?.race || 'human';
    await this.lm.setBase(race);
    await this.lm.loadRaceSprites(race);
    if (character) await this.syncEquipment(character);
    this._needsRedraw = true;
  }

  async syncEquipment(character) {
    const equips = character.equipment || {};
    for (const [slot, item] of Object.entries(equips)) {
      if (item) await this.lm.setLayer(slot, item.id);
      else this.lm.removeLayer(slot);
    }
    this._needsRedraw = true;
  }

  async switchRace(race) { await this.lm.setBase(race); this._needsRedraw = true; }

  render() {
    const { ctx, cssW, cssH } = setupCanvas(this.canvas, this.canvasCssW, this.canvasCssH);
    ctx.clearRect(0, 0, cssW, cssH);
    // 仅渲染 Paper Doll（骰子由 CSS 处理）
    this.doll.render(ctx, cssW, cssH, this.anim);
  }

  // 将动画状态同步到 CSS 骰子
  _syncDiceCSS() {
    if (!this.diceEl) return;
    const a = this.anim;
    this.diceEl.style.transform = `rotate(${a.diceRotate}deg) scale(${a.diceScale})`;
    if (a.diceGlow > 0.1) {
      this.diceEl.classList.add('glowing');
    } else {
      this.diceEl.classList.remove('glowing');
    }
  }

  start() {
    const loop = () => {
      if (this._needsRedraw) { this.render(); this._needsRedraw = false; }
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.anim.stop();
  }

  playAnimation(preset) {
    if (typeof preset === 'function') this.anim.play(preset());
    else this.anim.play(preset);
    // CSS 骰子加速旋转
    if (this.diceEl) {
      this.diceEl.style.animation = 'none';
      void this.diceEl.offsetWidth;
      this.diceEl.classList.add('rolling');
      setTimeout(() => {
        this.diceEl.classList.remove('rolling');
        this.diceEl.style.animation = '';
      }, 800);
    }
  }
}

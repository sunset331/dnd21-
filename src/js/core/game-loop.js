// game-loop.js — 核心循环：Idle ↔ Adventure

import { Audio } from '../audio.js';
import { OPS_BASE_REQUIREMENT, AUTO_ADVENTURE_INTERVAL_MS, BONUS_OPS_PER_CLICK } from '../config.js';

const STATE = {
  IDLE: 'idle',
  ADVENTURING: 'adventuring',
  RESULT: 'result'
};

export class GameLoop {
  constructor(inputTracker, adventureEngine, character, ui, saveManager) {
    this.inputTracker = inputTracker;
    this.adventureEngine = adventureEngine;
    this.character = character;
    this.ui = ui;
    this.saveManager = saveManager;
    this.state = STATE.IDLE;
    this._pendingOps = 0;
    this.onAdventureComplete = null;
    this.autoMode = false;
    this.autoInterval = null;
  }

  start() {
    this.state = STATE.IDLE;
    this.inputTracker.onAdventureTrigger = () => this.triggerAdventure();
    const effects = this.character.getStatusEffects();
    const baseOps = OPS_BASE_REQUIREMENT - effects.opsDiscount;
    this.inputTracker.setOpsRequirement(baseOps);
    this.ui.renderIdle();
  }

  // 自动冒险模式：每60秒触发一次
  enableAutoMode() {
    if (this.autoInterval) return;
    this.autoMode = true;
    this.autoInterval = setInterval(() => {
      if (this.state === STATE.IDLE) this.triggerAdventure();
    }, AUTO_ADVENTURE_INTERVAL_MS);
    // 立即触发第一次
    if (this.state === STATE.IDLE) this.triggerAdventure();
  }

  disableAutoMode() {
    this.autoMode = false;
    if (this.autoInterval) { clearInterval(this.autoInterval); this.autoInterval = null; }
  }

  isAutoMode() { return this.autoMode; }

  async triggerAdventure() {
    if (this.state !== STATE.IDLE) return;
    this.state = STATE.ADVENTURING;

    // 动画：宠物出发冒险
    Audio.playDiceRoll();
    await this.ui.playAdventureStart();

    // 执行冒险
    const result = this.adventureEngine.run(this.character);

    // 触发外部回调（先于显示，让场景/动画先设置好）
    if (this.onAdventureComplete) {
      await this.onAdventureComplete(result);
    }

    // 音效
    if (result.outcome === 'legendary') {
      Audio.playCritSuccess();
    } else if (result.outcome === 'disaster') {
      Audio.playDisaster();
    } else if (result.outcome === 'fail') {
      Audio.playFail();
    } else {
      Audio.playGoldGain();
    }
    if (result.droppedItem) Audio.playItemDrop();

    // 显示结果
    this.state = STATE.RESULT;
    await this.ui.showAdventureResult(result);

    // 自动存档
    await this.saveManager.save(this.character);

    // 回到空闲
    const effects = this.character.getStatusEffects();
    const baseOps = OPS_BASE_REQUIREMENT - effects.opsDiscount;
    this.inputTracker.setOpsRequirement(baseOps);

    this.state = STATE.IDLE;
    this.ui.renderIdle();
  }

  // 点击宠物获得额外操作
  onPetClick() {
    if (this.state !== STATE.IDLE) return;
    this.inputTracker.addBonusOps(BONUS_OPS_PER_CLICK);
    this.ui.flashProgress();
  }

  isIdle() {
    return this.state === STATE.IDLE;
  }
}

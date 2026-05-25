// input-tracker.js — 操作计数管理
// 从 main process 接收 activity-tick，累积到本地计数

export class InputTracker {
  constructor(onAdventureTrigger) {
    this.opsPerAdventure = 300;
    this.currentOps = 0;
    this.totalOps = 0;
    this.onAdventureTrigger = onAdventureTrigger;
    this._tickHandler = null;
  }

  // 由 main process 的 activity-tick IPC 触发
  addOps(count) {
    this.currentOps += count;
    this.totalOps += count;
    if (this.currentOps >= this.opsPerAdventure) {
      this.currentOps -= this.opsPerAdventure;
      if (this.onAdventureTrigger) this.onAdventureTrigger();
    }
  }

  // 点击宠物获得的额外操作
  addBonusOps(count = 5) {
    this.addOps(count);
  }

  getProgress() {
    return { current: this.currentOps, max: this.opsPerAdventure };
  }

  getTotalOps() {
    return this.totalOps;
  }

  reset() {
    this.currentOps = 0;
  }

  // 状态修正：减少所需操作数（冒险狂热等）
  setOpsRequirement(ops) {
    this.opsPerAdventure = ops;
  }

  getState() {
    return { currentOps: this.currentOps, totalOps: this.totalOps };
  }

  loadState(state) {
    this.currentOps = state.currentOps || 0;
    this.totalOps = state.totalOps || 0;
  }
}

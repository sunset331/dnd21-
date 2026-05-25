// activity-tracker.js — 全局键盘鼠标活动追踪
const { powerMonitor } = require('electron');

let activityInterval = null;
let petWindowRef = null;
let config = { activityCheckMs: 3000, opsPerMinute: 30 };

function init(getPetWindowFn, cfg = {}) {
  petWindowRef = getPetWindowFn;
  if (cfg.activityCheckMs) config.activityCheckMs = cfg.activityCheckMs;
  if (cfg.opsPerMinute) config.opsPerMinute = cfg.opsPerMinute;
}

function start() {
  const checkMs = config.activityCheckMs;
  const opsPerTick = Math.round(config.opsPerMinute / (60000 / checkMs));

  activityInterval = setInterval(() => {
    const pw = petWindowRef();
    if (!pw || pw.isDestroyed()) return;

    // 全局空闲检测：idleSec 表示距离上次键鼠操作过去了多少秒
    // idleSec < checkMs/1000 说明在本次检测间隔内用户有操作
    const idleSec = powerMonitor.getSystemIdleTime();
    if (idleSec < checkMs / 1000) {
      pw.webContents.send('activity-tick', opsPerTick);
    }
  }, checkMs);
}

function stop() {
  if (activityInterval) { clearInterval(activityInterval); activityInterval = null; }
}

function updateRate(opsPerMinute) {
  config.opsPerMinute = opsPerMinute;
  stop();
  start();
}

module.exports = { init, start, stop, updateRate };

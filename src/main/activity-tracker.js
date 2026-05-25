// activity-tracker.js — 键盘鼠标活动追踪
const { powerMonitor } = require('electron');

let activityInterval = null;
let petWindowRef = null;
let config = { activityCheckMs: 5000, idleThresholdMs: 10000, opsPerMinute: 24 };

function init(getPetWindowFn, cfg = {}) {
  petWindowRef = getPetWindowFn;
  if (cfg.activityCheckMs) config.activityCheckMs = cfg.activityCheckMs;
  if (cfg.idleThresholdMs) config.idleThresholdMs = cfg.idleThresholdMs;
  if (cfg.opsPerMinute) config.opsPerMinute = cfg.opsPerMinute;
}

function start() {
  const checkMs = config.activityCheckMs;
  const opsPerTick = Math.round(config.opsPerMinute / (60000 / checkMs));

  activityInterval = setInterval(() => {
    const pw = petWindowRef();
    if (!pw || pw.isDestroyed()) return;
    const idleSec = powerMonitor.getSystemIdleTime();
    if (idleSec * 1000 < config.idleThresholdMs && idleSec < (checkMs / 1000) * 2) {
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

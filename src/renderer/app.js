// ═══════════════════════════════════════════════════════════
//  app.js — Coordinator: 3-stage flow, wires all modules
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── DOM refs ───
  const wrapper = document.getElementById('dice-wrapper');
  const numberEl = document.getElementById('dice-number');
  const actionBtn = document.getElementById('action-btn');
  const btnLabel = document.getElementById('btn-label');
  const btnHint = document.getElementById('btn-hint');
  const eventDisplay = document.getElementById('event-display');
  const eventText = document.getElementById('event-text');
  const stageEls = document.querySelectorAll('.stage-dot');

  // ═══════════════════════════════════════════════════════════
  //  GAME STATE
  // ═══════════════════════════════════════════════════════════
  const gameState = {
    currentEvent: null,
    currentValue: null,
    currentTier: null,
    statusEffects: [],
    eventHistory: [],
    mood: 'neutral',
    consecutiveFails: 0,
    consecutiveCrits: 0,
    lastInteractionTime: Date.now(),
    rerollUsed: false,
    worldState: {             // event consequence system
      inventory: [],
      reputation: {},
      flags: {},
      activeThreads: [],
    },
  };

  let stage = 0;

  // ═══════════════════════════════════════════════════════════
  //  STAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  function setStage(s) {
    stage = s;
    stageEls.forEach(el => el.classList.remove('active', 'done'));
    if (s >= 1) stageEls[0].classList.add('done');
    if (s >= 2) stageEls[1].classList.add('done');
    stageEls[Math.min(s, 2)].classList.add(s === 2 ? 'done' : 'active');

    switch (s) {
      case 0:
        btnLabel.textContent = '遭遇事件';
        btnHint.textContent = '右键骰子打开菜单';
        actionBtn.className = 'action-btn action-btn--event';
        eventDisplay.classList.add('hidden');
        Dice.returnToIdle();
        break;
      case 1:
        btnLabel.textContent = '投掷命运骰';
        btnHint.textContent = '命运由21面骰决定';
        actionBtn.className = 'action-btn action-btn--roll';
        eventText.textContent = gameState.currentEvent.text;
        eventDisplay.classList.remove('hidden');
        Dice.setEventReady();
        break;
      case 2:
        btnLabel.textContent = '重新冒险';
        btnHint.textContent = '点击开始新的旅程';
        actionBtn.className = 'action-btn action-btn--event';
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════

  function handleStage1() {
    if (stage === 2) { setStage(0); return; }
    if (stage !== 0) return;

    Status.tick();

    const lastEvent = gameState.eventHistory[gameState.eventHistory.length - 1];
    const event = (lastEvent && Math.random() < 0.30)
      ? generateChainEvent(lastEvent.event)
      : generateEvent(Status.getAll(), gameState.worldState);

    gameState.currentEvent = event;
    gameState.currentValue = null;
    gameState.currentTier = null;
    gameState.rerollUsed = false;
    setStage(1);
  }

  function handleStage2() {
    if (stage !== 1) return;
    Dice.roll();
  }

  function handleRollComplete(value, tier) {
    // Holy Shield reroll
    if (!gameState.rerollUsed && Status.has('holy_shield') &&
        (tier === 'CRIT_FAIL' || tier === 'FAIL')) {
      gameState.rerollUsed = true;
      Status.remove('holy_shield');
      setTimeout(() => Dice.roll(), 800);
      return;
    }

    gameState.currentValue = value;
    gameState.currentTier = tier;

    const storyId = gameState.currentEvent.storyId || null;
    const outcomeResult = generateOutcome(gameState.currentEvent.components, tier, storyId);

    // Apply world effects
    if (outcomeResult.effects) {
      applyEffects(outcomeResult.effects);
    }

    // Mood
    if (tier === 'CRIT_FAIL')      { gameState.consecutiveFails++; gameState.consecutiveCrits = 0; }
    else if (tier === 'CRIT_SUCCESS') { gameState.consecutiveCrits++; gameState.consecutiveFails = 0; }
    else                            { gameState.consecutiveFails = 0; gameState.consecutiveCrits = 0; }
    Mood.update();

    // Status
    Status.maybeApply(tier);

    // History
    const histEntry = {
      event: gameState.currentEvent.text, value, tier,
      outcome: outcomeResult.outcome,
      statuses: Status.getIds(), time: Date.now(),
    };
    gameState.eventHistory.push(histEntry);
    if (gameState.eventHistory.length > 20) gameState.eventHistory.shift();
    AdventureLog.addEntry(histEntry.event, histEntry.value, histEntry.tier, histEntry.outcome, histEntry.statuses);

    // Particles
    const rect = Dice.getRect();
    if (rect) Animation.spawnParticles(tier, rect);

    // Popup
    const statusLine = Status.getAll().length > 0
      ? '\n当前状态：' + Status.getAll().map(s => s.icon + s.name).join(' ')
      : '';
    const fullText = [
      gameState.currentEvent.text,
      `判定：${value}点 —— ${outcomeResult.tierText}`,
      outcomeResult.outcome,
      statusLine,
    ].filter(Boolean).join('\n\n');

    ResultPopup.show(value, tier, outcomeResult.tierText, fullText);
    setStage(2);

    // Achievements
    Achievements.check(
      gameState, tier, gameState.currentEvent,
      Status.getIds(), gameState.rerollUsed || false,
      gameState.currentEvent && gameState.currentEvent.isChain || false
    );
  }

  function handlePopupDismissed() {
    gameState.lastInteractionTime = Date.now();
  }

  // ═══════════════════════════════════════════════════════════
  //  WORLD STATE EFFECTS
  // ═══════════════════════════════════════════════════════════

  function applyEffects(effects) {
    if (!effects) return;
    const ws = gameState.worldState;

    // Add status
    if (effects.addStatus && STATUS_POOL[effects.addStatus]) {
      Status.add({ ...STATUS_POOL[effects.addStatus] });
    }

    // Add inventory
    if (effects.inventory) {
      for (const item of effects.inventory) {
        if (!ws.inventory.includes(item)) ws.inventory.push(item);
      }
    }

    // Set flags
    if (effects.flags) {
      Object.assign(ws.flags, effects.flags);
    }

    // Update reputation
    if (effects.reputation) {
      for (const [faction, delta] of Object.entries(effects.reputation)) {
        ws.reputation[faction] = (ws.reputation[faction] || 0) + delta;
      }
    }

    // Unlock chain events (max 3 layers deep to prevent infinite recursion)
    if (effects.unlockEvents) {
      for (const eventId of effects.unlockEvents) {
        if (!ws.activeThreads.includes(eventId)) {
          ws.activeThreads.push(eventId);
        }
      }
      // Limit thread depth
      if (ws.activeThreads.length > 6) {
        ws.activeThreads = ws.activeThreads.slice(-6);
      }
    }

    saveWorldState();
  }

  function saveWorldState() {
    try {
      if (window.electronAPI && window.electronAPI.mergeSettings) {
        window.electronAPI.mergeSettings({ worldState: gameState.worldState });
      }
    } catch (e) { /* */ }
  }

  // ═══════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  Status.init(
    document.getElementById('status-bar'),
    document.getElementById('status-list'),
    gameState
  );
  Mood.init(wrapper, document.getElementById('mood-quote'), gameState);
  Dice.init(wrapper, numberEl, handleRollComplete);
  ResultPopup.onDismissed(handlePopupDismissed);

  // Dice click
  wrapper.addEventListener('click', (e) => {
    if (ResultPopup.isShowing()) return;
    Audio.init();
    gameState.lastInteractionTime = Date.now();
    Ghost.poke();
    const s = Dice.getState();
    if (s === 'idle') handleStage1();
    else if (s === 'event_ready') handleStage2();
    e.stopPropagation();
  });

  // Button click
  actionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Audio.init();
    gameState.lastInteractionTime = Date.now();
    Ghost.poke();
    const s = Dice.getState();
    if (s === 'idle' || stage === 2) handleStage1();
    else if (s === 'event_ready') handleStage2();
  });

  setStage(0);
  Status.render();
  Mood.update();

  UIManager.init();
  Achievements.init();
  AdventureLog.init();
  ContextMenu.init();
  Settings.init().then(() => {
    const s = Settings.getSettings();
    // Load saved worldState
    if (s.worldState) {
      gameState.worldState = { ...gameState.worldState, ...s.worldState };
    }
    Ghost.configure(s);
    Ghost.start();
    s.behavior.idleSpeech ? Mood.startIdleTimer() : Mood.stopIdleTimer();
    checkNightMute(s);
  });

  window.__gameState = gameState;

  // Tray actions
  if (window.electronAPI && window.electronAPI.onTrayAction) {
    window.electronAPI.onTrayAction((action) => {
      Audio.init();
      gameState.lastInteractionTime = Date.now();
      switch (action) {
        case 'stage1': handleStage1(); break;
        case 'stage2': handleStage2(); break;
        case 'mute': Audio.setMuted(!Audio.isMuted()); break;
        case 'settings': Settings.toggle(); break;
      }
    });
  }

  // Night mute check — every 60s
  function checkNightMute(s) {
    const cfg = s || Settings.getSettings();
    if (cfg.behavior.nightMute) {
      const hour = new Date().getHours();
      Audio.setMuted(hour >= 22 || hour < 7);
    }
  }
  setInterval(() => { if (Settings.getSettings().behavior.nightMute) checkNightMute(); }, 60000);
})();

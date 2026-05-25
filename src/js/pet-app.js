// pet-app.js — DND桌宠入口 (Paper Doll 渲染架构)
import { InputTracker } from './core/input-tracker.js';
import { GameLoop } from './core/game-loop.js';
import { AdventureEngine } from './core/adventure-engine.js';
import { Character } from './systems/character.js';
import { AchievementSystem } from './systems/achievements.js';
import { PetRenderer } from './renderer/pet-renderer.js';
import { AnimPresets } from './renderer/animation.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { SaveManager } from './storage/save-manager.js';

import { loadJSON } from './storage/loader.js';

async function boot() {
  const [racesData, eventsData, equipmentData, statusesData,
         achievementsData, setsData, cosmeticsData, presetsData,
         anchorsData] = await Promise.all([
    loadJSON('data/races.json'), loadJSON('data/events.json'),
    loadJSON('data/equipment.json'), loadJSON('data/statuses.json'),
    loadJSON('data/achievements.json'), loadJSON('data/sets.json'),
    loadJSON('data/cosmetics.json'), loadJSON('data/presets.json'),
    loadJSON('data/anchors.json')
  ]);

  const character = new Character(racesData, equipmentData, statusesData, setsData, cosmeticsData);
  const achievements = new AchievementSystem(achievementsData);
  const saveManager = new SaveManager();
  const ui = new UI();
  const renderer = new PetRenderer('pet-canvas', anchorsData, equipmentData);
  const adventureEngine = new AdventureEngine(eventsData, equipmentData, statusesData);
  const inputTracker = new InputTracker();
  const gameLoop = new GameLoop(inputTracker, adventureEngine, character, ui, saveManager);

  const hasSave = await saveManager.hasSave();

  if (!hasSave) {
    // 首次启动：显示创建角色
    showCharacterCreate(racesData, presetsData, equipmentData, character, async () => {
      await saveManager.save(character);
      await startGame();
    });
    return;
  }

  const saveData = await saveManager.load(character);
  ui.showNotification(saveData.fromBackup ? '从备份恢复' : '欢迎回来！');
  await startGame();

  async function startGame() {
    applyTheme(character.activeTheme, cosmeticsData);
    // 初始场景背景（酒馆）
    const pw = document.getElementById('pet-window');
    pw.style.backgroundImage = 'url(assets/scenes/tavern.png)';
    pw.style.backgroundSize = 'cover';
    pw.style.backgroundPosition = 'center';
    await renderer.init(character);
    renderer.start();
    updateUI();

    if (localStorage.getItem('dnd-pet-auto-mode') === 'on') {
      gameLoop.enableAutoMode(); updateOpsDisplay();
    }
    gameLoop.start();

    // 场景映射
    const sceneMap = {
      tavern: 'tavern', town: 'town_square', social: 'tavern',
      dungeon: 'cave', cave: 'cave',
      mystery: 'temple', temple: 'temple',
      wilderness: 'forest', forest: 'forest', cliff: 'cliff',
      swamp: 'swamp', dragon: 'dragon_lair', wizard: 'wizard_tower'
    };

    gameLoop.onAdventureComplete = async (result) => {
      const sceneName = sceneMap[result.eventCategory] || 'cave';
      // 常态场景背景：窗口背景跟随事件切换并保持
      const pw = document.getElementById('pet-window');
      pw.style.backgroundImage = `url(assets/scenes/${sceneName}.png)`;
      pw.style.backgroundSize = 'cover';
      pw.style.backgroundPosition = 'center';
      if (result.outcome === 'legendary') renderer.playAnimation(AnimPresets.critSuccess);
      else if (result.goldChange > 0) renderer.playAnimation(AnimPresets.goldRush);
      else renderer.playAnimation(AnimPresets.adventure);
      updateUI();
      // 成就
      const newAch = achievements.checkAll(character);
      for (const ach of newAch) {
        character.achievements.unlocked.push(ach.id);
        ui.showNotification(`🏆 ${ach.name}!`); Audio.playAchievement();
      }
      if (newAch.length > 0) await saveManager.save(character);
    };

    // 操作追踪
    window.electronAPI.onActivityTick((ops) => {
      if (gameLoop.isAutoMode()) return;
      inputTracker.addOps(ops);
      updateProgress();
      updateOpsDisplay();
    });

    // 弹窗拦截：阻止点击穿透到canvas
    const popup = document.getElementById('adventure-popup');
    popup.addEventListener('click', (e) => { e.stopPropagation(); });

    // 点击Canvas加速
    document.getElementById('pet-canvas').addEventListener('click', () => {
      if (gameLoop.isAutoMode()) return;
      if (!popup.classList.contains('hidden')) return; // 弹窗打开时不响应
      gameLoop.onPetClick();
      updateProgress(); updateOpsDisplay();
    });

    document.getElementById('btn-panel').addEventListener('click', () => {
      window.electronAPI.openPanel();
    });

    setupContextMenu(gameLoop, character, saveManager, renderer, racesData, presetsData, equipmentData, updateOpsDisplay);

    window.electronAPI.onConsumableEffect((effect) => {
      if (effect.action === 'guarantee_legendary') {
        character._guaranteedLegendary = true;
        ui.showNotification('🎲 下次必定传奇！');
      }
    });

    // 托盘自动冒险切换
    window.electronAPI.onTrayAutoToggle?.((checked) => {
      if (checked) { gameLoop.enableAutoMode(); localStorage.setItem('dnd-pet-auto-mode', 'on'); }
      else { gameLoop.disableAutoMode(); localStorage.setItem('dnd-pet-auto-mode', 'off'); }
      updateOpsDisplay();
    });
  }

  function updateUI() {
    ui.updateCharacterDisplay(character);
    updateProgress();
    updateOpsDisplay();
  }
  function updateProgress() {
    ui.updateProgress(inputTracker.currentOps, inputTracker.opsPerAdventure);
  }
  function updateOpsDisplay() {
    const el = document.getElementById('ops-count');
    if (gameLoop.isAutoMode()) {
      el.textContent = '⏱️ 自动模式 · 每60秒';
    } else {
      el.textContent = `🖱️ ${inputTracker.totalOps}次 · ${inputTracker.currentOps}/${inputTracker.opsPerAdventure}`;
    }
  }
}

// ===== 右键菜单 =====
function setupContextMenu(gameLoop, character, saveManager, renderer, racesData, presetsData, equipmentData, onUpdate) {
  const menu = document.getElementById('context-menu');
  const autoIcon = document.getElementById('ctx-auto-icon');
  const autoLabel = document.getElementById('ctx-auto-label');

  // 右键菜单 — 延迟注册关闭监听（避免右键click竞态）
  let menuCloser = null;
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = document.getElementById('pet-window').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isAuto = gameLoop.isAutoMode();
    autoIcon.textContent = isAuto ? '⏸️' : '⏱️';
    autoLabel.textContent = isAuto ? '关闭自动' : '自动冒险';

    menu.classList.remove('hidden');
    const menuH = menu.offsetHeight;
    const menuW = menu.offsetWidth;
    const left = Math.min(x, rect.width - menuW - 5);
    const top = (y + menuH > rect.height - 10) ? Math.max(5, y - menuH) : y;
    menu.style.left = Math.max(5, left) + 'px';
    menu.style.top = top + 'px';

    // 延迟注册关闭（避免本次右键的click事件立即关闭菜单）
    if (menuCloser) document.removeEventListener('click', menuCloser);
    menuCloser = (ev) => {
      if (!menu.contains(ev.target)) { menu.classList.add('hidden'); }
    };
    setTimeout(() => document.addEventListener('click', menuCloser), 0);
  });

  // ESC 关闭菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });

  menu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      menu.classList.add('hidden');
      if (action === 'auto-toggle') {
        if (gameLoop.isAutoMode()) {
          gameLoop.disableAutoMode(); localStorage.setItem('dnd-pet-auto-mode', 'off');
        } else {
          gameLoop.enableAutoMode(); localStorage.setItem('dnd-pet-auto-mode', 'on');
        }
        onUpdate();
      } else if (action === 'open-panel') {
        window.electronAPI.openPanel();
      } else if (action === 'edit-name') {
        const n = prompt('新名字：', character.name);
        if (n && n.trim()) { character.name = n.trim(); await saveManager.save(character); document.getElementById('char-name').textContent = character.name; }
      } else if (action === 'new-character') {
        // 新建角色到新槽位
        gameLoop.disableAutoMode(); localStorage.setItem('dnd-pet-auto-mode', 'off');
        showCharacterCreate(racesData, presetsData, equipmentData, character, async () => {
          // 找空槽位
          const slots = await saveManager.getSlots();
          const emptySlot = slots?.slots?.find(s => !s.exists)?.id || 1;
          await saveManager.save(character, {}, emptySlot);
          location.reload();
        });
      } else if (action === 'switch-character') {
        const slots = await saveManager.getSlots();
        if (!slots?.slots) return;
        const validSlots = slots.slots.filter(s => s.exists);
        if (validSlots.length <= 1) { alert('只有一个角色，无法切换。'); return; }

        // 构建槽位选择界面
        const overlay = document.createElement('div');
        overlay.className = 'slot-switch-overlay';
        overlay.innerHTML = '<div class="slot-switch-card"><h3>选择冒险者</h3><div id="slot-list"></div></div>';
        document.body.appendChild(overlay);

        const slotList = document.getElementById('slot-list');
        validSlots.forEach(s => {
          const btn = document.createElement('button');
          btn.className = 'slot-switch-btn';
          btn.innerHTML = `<span>${s.id}. ${s.name || '无名'}</span>${s.active ? '<small>(当前)</small>' : ''}`;
          btn.addEventListener('click', async () => {
            overlay.remove();
            if (s.id !== saveManager.activeSlot) {
              gameLoop.disableAutoMode();
              localStorage.setItem('dnd-pet-auto-mode', 'off');
              saveManager.setSlot(s.id);
              location.reload();
            }
          });
          slotList.appendChild(btn);
        });

        const cancel = document.createElement('button');
        cancel.className = 'slot-switch-cancel';
        cancel.textContent = '取消';
        cancel.addEventListener('click', () => overlay.remove());
        slotList.appendChild(cancel);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      } else if (action === 'delete-character') {
        if (confirm(`删除「${character.name}」？此角色将被永久删除！`)) {
          gameLoop.disableAutoMode(); localStorage.clear();
          await saveManager.deleteSlot(saveManager.activeSlot);
          location.reload();
        }
      } else if (action === 'save-pos') {
        await window.electronAPI.saveWindowPosition();
      }
    });
  });
}

// ===== 角色创建 =====
function showCharacterCreate(racesData, presetsData, equipmentData, character, onComplete) {
  const overlay = document.getElementById('create-overlay');
  const nameInput = document.getElementById('create-name');
  const genderSelect = document.getElementById('create-gender');
  const raceButtons = document.querySelectorAll('.race-option');
  const confirmBtn = document.getElementById('create-confirm');
  const presetList = document.getElementById('preset-list');
  overlay.classList.remove('hidden');
  let selectedRace = 'human', selectedPreset = null;

  document.getElementById('race-desc').textContent = racesData.human.desc;
  presetList.innerHTML = '';
  Object.entries(presetsData).forEach(([id, preset]) => {
    const r = racesData[preset.race];
    const btn = document.createElement('button');
    btn.className = 'preset-option';
    btn.innerHTML = `<span class="preset-emoji">${r.emoji}</span>${preset.name}`;
    btn.addEventListener('click', () => {
      presetList.querySelectorAll('.preset-option').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected'); selectedPreset = id;
      nameInput.value = preset.name; genderSelect.value = preset.gender; selectedRace = preset.race;
      raceButtons.forEach(b=>b.classList.toggle('selected', b.dataset.race===preset.race));
      document.getElementById('race-preview').textContent = r.emoji;
      document.getElementById('race-desc').textContent = preset.backstory;
    });
    presetList.appendChild(btn);
  });

  raceButtons.forEach(btn => btn.addEventListener('click', () => {
    raceButtons.forEach(b=>b.classList.remove('selected')); btn.classList.add('selected');
    selectedRace = btn.dataset.race;
    const r = racesData[selectedRace];
    document.getElementById('race-preview').textContent = r.emoji;
    document.getElementById('race-desc').textContent = r.desc;
    selectedPreset = null; nameInput.value = '';
    presetList.querySelectorAll('.preset-option').forEach(b=>b.classList.remove('selected'));
  }));

  confirmBtn.addEventListener('click', () => {
    character.name = nameInput.value.trim() || '无名冒险者';
    character.gender = genderSelect.value; character.race = selectedRace;
    character.gold = selectedPreset ? (presetsData[selectedPreset].gold||100) : 100;
    character.createdAt = new Date().toISOString();
    if (selectedPreset && presetsData[selectedPreset].equipment) {
      Object.entries(presetsData[selectedPreset].equipment).forEach(([slot,itemId]) => {
        if (character.equipmentData[itemId]) character.equipment[slot] = character.equipmentData[itemId];
      });
    }
    overlay.classList.add('hidden'); onComplete();
  });
}

function applyTheme(themeId, cosmeticsData) {
  const root = document.documentElement;
  if (!themeId || !cosmeticsData?.items?.[themeId]?.css) return;
  const css = cosmeticsData.items[themeId].css;
  if (css.bg) root.style.setProperty('--bg', css.bg);
  if (css.surface) root.style.setProperty('--surface', css.surface);
  if (css.border) root.style.setProperty('--border', css.border);
}

boot().catch(err => {
  console.error('[DND-PET] Boot failed:', err.message, err.stack);
  document.body.innerHTML = `<div style="color:#c0392b;padding:20px;font-size:12px;">启动失败: ${err.message}<br><pre style="font-size:9px;">${err.stack||''}</pre></div>`;
});

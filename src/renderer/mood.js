// ═══════════════════════════════════════════════════════════
//  mood.js — Dice personality: mood states + idle quotes
// ═══════════════════════════════════════════════════════════

const Mood = (() => {
  let wrapperEl = null;
  let quoteEl = null;
  let gameState = null;
  let idleTimer = null;

  const QUOTES = {
    excited: ['今天手感火热！','骰子之神在微笑...','我感觉我能roll一天！'],
    mocking: ['你今天被命运针对了。','要不...换骰子试试？','连哥布林都在笑你。'],
    angry:   ['建议你回村种田。','你是不是得罪了哪个神？','我见过倒霉的，没见过你这么倒霉的。'],
    bored:   ['地下城已经长蘑菇了...','喂？还在吗？冒险者？','你再不回来我就自己roll了。'],
    neutral: ['我是一颗有职业素养的骰子。','21个面，21种可能。','幸运女神说她今天请假。'],
    smug:    ['你是不是偷偷改点数了？','这运气...不太正常。','建议去买张彩票。'],
    sleepy:  ['夜深了...地下城在呼唤你...','这个点还不睡？那你一定是个法师。','凌晨三点是魔法事故高发期。'],
  };

  function init(wrapper, quote, gs) {
    wrapperEl = wrapper;
    quoteEl = quote;
    gameState = gs;
  }

  function computeMood() {
    const idle = Date.now() - gameState.lastInteractionTime;
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 4) return 'sleepy';
    if (idle > 180000) return 'bored';
    if (gameState.consecutiveCrits >= 2) return 'excited';
    if (gameState.consecutiveCrits >= 1) return 'smug';
    if (gameState.consecutiveFails >= 4) return 'angry';
    if (gameState.consecutiveFails >= 2) return 'mocking';
    if (idle > 60000) return 'bored';
    return 'neutral';
  }

  function update() {
    const newMood = computeMood();
    if (newMood === gameState.mood) return;
    gameState.mood = newMood;
    wrapperEl.classList.forEach(c => { if (c.startsWith('dice-mood--')) wrapperEl.classList.remove(c); });
    wrapperEl.classList.add(`dice-mood--${newMood}`);
  }

  function showQuote(quote) {
    if (!quoteEl) return;
    quoteEl.textContent = quote;
    quoteEl.classList.remove('mood-quote--show');
    void quoteEl.offsetWidth;
    quoteEl.classList.add('mood-quote--show');
    setTimeout(() => { if (quoteEl.textContent === quote) quoteEl.classList.remove('mood-quote--show'); }, 4000);
  }

  function startIdleTimer() {
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(() => {
      const idle = Date.now() - gameState.lastInteractionTime;
      if (idle > 30000) {
        update();
        const quotes = QUOTES[gameState.mood] || QUOTES.neutral;
        showQuote(pick(quotes));
      }
    }, 35000);
  }

  function stopIdleTimer() {
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  }

  return { init, update, showQuote, startIdleTimer, stopIdleTimer };
})();

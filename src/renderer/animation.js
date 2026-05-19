// ═══════════════════════════════════════════════════════════
//  animation.js — Particle spawn system (CSS-driven, GPU composited)
// ═══════════════════════════════════════════════════════════

const Animation = (() => {
  // ─── Tier config ───
  const PARTICLE_CONFIG = {
    CRIT_FAIL: {
      count: 20,
      speed: 0.6,
      colors: ['#8b0000', '#4a1a1a', '#6b2060', '#2d1f3d', '#4a4a4a'],
      spark: false,
    },
    FAIL: {
      count: 15,
      speed: 0.7,
      colors: ['#6b7280', '#4b5563', '#3b4a6b', '#5c5c6e'],
      spark: false,
    },
    SUCCESS: {
      count: 22,
      speed: 1.0,
      colors: ['#d4a017', '#b8860b', '#daa520', '#c9a84c', '#a08030'],
      spark: false,
    },
    CRIT_SUCCESS: {
      count: 40,
      speed: 1.3,
      colors: ['#ffd700', '#ffec8b', '#ffffff', '#40e0d0', '#ffb347', '#c9a84c'],
      spark: true,
    },
  };

  // ─── Spawn particles ───
  function spawnParticles(tier, originRect) {
    const config = PARTICLE_CONFIG[tier] || PARTICLE_CONFIG.FAIL;
    const container = document.createElement('div');
    container.className = 'particle-container';
    document.body.appendChild(container);

    const cx = originRect.left + originRect.width / 2;
    const cy = originRect.top + originRect.height / 2;

    for (let i = 0; i < config.count; i++) {
      const el = document.createElement('div');
      el.className = config.spark && Math.random() > 0.6 ? 'particle particle--spark' : 'particle';

      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.6;
      const dist = 40 + Math.random() * 100 * config.speed;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 30 + Math.random() * 20;

      const size = 2 + Math.random() * (config.spark ? 6 : 5);
      const lifespan = 0.7 + Math.random() * 1.3;

      el.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${config.colors[Math.floor(Math.random() * config.colors.length)]};
        --tx: ${tx}px;
        --ty: ${ty}px;
        --lifespan: ${lifespan}s;
      `;

      container.appendChild(el);
    }

    // Auto-cleanup
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 2200);
  }

  return { spawnParticles };
})();

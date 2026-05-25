// animation.js — 动画引擎（缓动、预备、跟随、次级运动）

// ── 缓动函数 ──
const Ease = {
  outQuad: t => 1 - (1-t)*(1-t),
  outBounce: t => { const n=7.5625,d=2.75; if(t<1/d)return n*t*t; if(t<2/d)return n*(t-=1.5/d)*t+.75; if(t<2.5/d)return n*(t-=2.25/d)*t+.9375; return n*(t-=2.625/d)*t+.984375; },
  outElastic: t => t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI)/3)+1,
  inOutSin: t => -(Math.cos(Math.PI*t)-1)/2,
  outBack: t => { const s=1.70158; return (t-=1)*t*((s+1)*t+s)+1; },
};

// ── 动画阶段 ──
class AnimPhase {
  constructor(name, duration, props, easing = 'outQuad') {
    this.name = name; this.duration = duration; this.props = props;
    this.easing = easing; this.elapsed = 0;
  }
}

// ── 动画序列 ──
class AnimSequence {
  constructor(name) {
    this.name = name;
    this.phases = [];
    this.currentIdx = -1;
    this.currentPhase = null;
    this.playing = false;
    this._onComplete = null;
  }
  addPhase(name, duration, props, easing) {
    this.phases.push(new AnimPhase(name, duration, props, easing));
    return this;
  }
  onComplete(fn) { this._onComplete = fn; return this; }
}

// ── 属性插值 ──
function lerp(a, b, t) { return a + (b - a) * t; }

// ── 主控制器 ──
export class AnimationController {
  constructor() {
    this.offsetX = 0; this.offsetY = 0; this.rotation = 0; this.scale = 1;
    // 次级运动（装备独立摇摆）
    this.hatTilt = 0; this.cloakSway = 0; this.weaponBob = 0;
    // 骰子
    this.diceScale = 1; this.diceRotate = 0; this.diceGlow = 0;
    // 粒子请求
    this.particleBurst = 0;
    // 状态
    this._sequence = null; this._rafId = null;
    this._idleTime = 0; this._nextMicro = 0;
    this._callbacks = [];
  }

  // ── 播放动画序列 ──
  play(sequence) {
    this._sequence = sequence;
    this._sequence.currentIdx = -1;
    this._sequence.playing = true;
    this._advancePhase();
    if (!this._rafId) this._tick();
  }

  _advancePhase() {
    const seq = this._sequence;
    seq.currentIdx++;
    if (seq.currentIdx >= seq.phases.length) {
      seq.playing = false;
      this._resetProps();
      if (seq._onComplete) seq._onComplete();
      return;
    }
    seq.currentPhase = seq.phases[seq.currentIdx];
    seq.currentPhase.elapsed = 0;
  }

  _tick() {
    const seq = this._sequence;
    if (seq && seq.playing) {
      const phase = seq.currentPhase;
      if (phase) {
        phase.elapsed += 16; // ~60fps
        const raw = Math.min(1, phase.elapsed / phase.duration);
        const t = (Ease[phase.easing] || Ease.outQuad)(raw);
        this._applyProps(phase.props, t);

        if (raw >= 1) {
          this._advancePhase();
        }
      }
    }
    // 空闲微动
    this._idleTime += 16;
    this._doIdle();
    this._notify();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _applyProps(props, t) {
    if (props.ox !== undefined) this.offsetX = lerp(0, props.ox, t);
    if (props.oy !== undefined) this.offsetY = lerp(0, props.oy, t);
    if (props.rot !== undefined) this.rotation = lerp(0, props.rot, t);
    if (props.sc !== undefined) this.scale = lerp(1, props.sc, t);
    if (props.diceS !== undefined) this.diceScale = lerp(1, props.diceS, t);
    if (props.diceR !== undefined) this.diceRotate = lerp(0, props.diceR, t);
    if (props.glow !== undefined) this.diceGlow = props.glow * t;
    if (props.hat !== undefined) this.hatTilt = Math.sin(t * Math.PI) * props.hat;
    if (props.cloak !== undefined) this.cloakSway = Math.sin(t * Math.PI * 2) * props.cloak;
    if (props.wpn !== undefined) this.weaponBob = Math.sin(t * Math.PI * 2) * props.wpn;
    if (props.particles !== undefined) this.particleBurst = props.particles;
  }

  _resetProps() {
    this.offsetX = 0; this.offsetY = 0; this.rotation = 0; this.scale = 1;
    this.hatTilt = 0; this.cloakSway = 0; this.weaponBob = 0;
    this.diceScale = 1; this.diceRotate = 0; this.diceGlow = 0;
  }

  // ── 空闲微动画 ──
  _doIdle() {
    if (this._sequence && this._sequence.playing) return; // 序列中不干扰
    const t = this._idleTime / 1000;
    // 呼吸
    this.offsetY = Math.sin(t * 1.8) * 2.5;
    this.scale = 1 + Math.sin(t * 2.1) * 0.012;
    // 披风慢摇
    this.cloakSway = Math.sin(t * 0.7) * 1.5;
    // 帽子微倾
    this.hatTilt = Math.sin(t * 0.9 + 1) * 0.8;

    // 随机微动作 (8-15秒)
    if (t > this._nextMicro) {
      this._nextMicro = t + 8 + Math.random() * 7;
      // 随机：歪头/伸懒腰/看骰子
      const micros = ['headTilt', 'stretch', 'lookDice'];
      const pick = micros[Math.floor(Math.random() * micros.length)];
      const micro = new AnimSequence('micro_' + pick);
      if (pick === 'headTilt') {
        micro.addPhase('tilt', 400, { rot: 6, oy: -1 }, 'inOutSin')
             .addPhase('hold', 600, { rot: 6, oy: -1 }, 'outQuad')
             .addPhase('return', 500, { rot: 0, oy: 0 }, 'outElastic');
      } else if (pick === 'stretch') {
        micro.addPhase('up', 500, { oy: -10, sc: 1.06 }, 'outQuad')
             .addPhase('hold', 400, { oy: -10, sc: 1.06 }, 'outQuad')
             .addPhase('down', 600, { oy: 0, sc: 1 }, 'outBounce');
      } else {
        micro.addPhase('look', 500, { rot: -8, ox: -3 }, 'inOutSin')
             .addPhase('return', 600, { rot: 0, ox: 0 }, 'outElastic');
      }
      this.play(micro);
    }
  }

  // ── 回调 ──
  onChange(fn) { this._callbacks.push(fn); }
  _notify() { this._callbacks.forEach(fn => fn(this)); }
  stop() { if(this._rafId){cancelAnimationFrame(this._rafId);this._rafId=null;} }
}

// ── 预置动画序列 ──
export const AnimPresets = {
  // 冒险出发：预备→冲刺→骰子→返回
  adventure: () => new AnimSequence('adventure')
    .addPhase('anticipate', 250, { oy: 4, sc: 0.94, rot: -3 }, 'outQuad')
    .addPhase('dash', 400, { ox: -30, oy: -8, sc: 1.08, rot: 5, cloak: 8 }, 'outQuad')
    .addPhase('diceShake', 500, { ox: -30, oy: -8, diceS: 1.2, diceR: 25, glow: 1, particles: 6 }, 'outElastic')
    .addPhase('return', 350, { ox: 0, oy: 0, sc: 1, rot: 0, diceS: 1, diceR: 0 }, 'outBack'),

  // 投骰：高举→投掷→骰子旋转
  rollDice: () => new AnimSequence('rollDice')
    .addPhase('raise', 200, { oy: -12, sc: 1.04, wpn: 10 }, 'outQuad')
    .addPhase('throw', 300, { ox: 15, oy: -6, rot: -10, diceS: 1.3, diceR: 60, glow: 1.5 }, 'outQuad')
    .addPhase('spin', 400, { diceS: 1.15, diceR: -15, glow: 0.8 }, 'outElastic')
    .addPhase('settle', 300, { ox: 0, oy: 0, rot: 0, diceS: 1, diceR: 0, glow: 0, particles: 3 }, 'outBounce'),

  // 获得金币：惊喜→跳起→金币雨→落地
  goldRush: () => new AnimSequence('goldRush')
    .addPhase('surprise', 150, { sc: 1.05, oy: -3 }, 'outQuad')
    .addPhase('jump', 300, { oy: -18, sc: 1.12, rot: 5, hat: -6 }, 'outQuad')
    .addPhase('peak', 250, { oy: -18, sc: 1.12, rot: -3, particles: 8 }, 'inOutSin')
    .addPhase('land', 400, { oy: 0, sc: 1, rot: 0, diceGlow: 0.6 }, 'outBounce'),

  // 大成功：旋转跳跃
  critSuccess: () => new AnimSequence('critSuccess')
    .addPhase('anticipate', 200, { sc: 0.9, oy: 5 }, 'outQuad')
    .addPhase('spinJump', 500, { oy: -22, sc: 1.15, rot: 360, diceS: 1.25, glow: 2 }, 'outQuad')
    .addPhase('sparkle', 400, { oy: -22, glow: 1.5, particles: 12 }, 'inOutSin')
    .addPhase('land', 400, { oy: 0, sc: 1, rot: 0, diceS: 1, glow: 0 }, 'outBounce'),
};

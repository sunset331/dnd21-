// paper-doll.js — Paper Doll 11层合成引擎
export class PaperDoll {
  constructor(layerManager, animController) {
    this.lm = layerManager;
    this.anim = animController;
  }

  render(ctx, cssW, cssH) {
    const layers = this.lm.getRenderOrder();
    const { offsetX, offsetY, scale, rotation, hatTilt, cloakSway, weaponBob } = this.anim;

    const dollW = cssH * 0.68;
    const dollH = cssH * 0.92;
    const dollX = cssW - dollW - 16;
    const dollY = (cssH - dollH) / 2;

    ctx.save();
    const cx = dollX + dollW / 2 + offsetX;
    const cy = dollY + dollH / 2 + offsetY;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    if (rotation) ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-dollW / 2, -dollH / 2);

    if (!this.lm.baseLoaded) {
      ctx.font = `${dollW * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🧝', dollW / 2, dollH / 2 + dollW * 0.15);
      ctx.restore();
      return;
    }

    // 按 z-order 渲染所有层
    for (const layer of layers) {
      let extraSway = 0;
      if (layer.key === 'cloak') extraSway = cloakSway;
      if (layer.key === 'hat') extraSway = hatTilt;
      if (layer.key === 'weapon') extraSway = weaponBob;
      this._drawLayer(ctx, layer, dollW, dollH, extraSway);
    }

    ctx.restore();
  }

  _drawLayer(ctx, layer, dollW, dollH, extraSway = 0) {
    if (!layer.image) return;
    const a = layer.anchor;
    const x = (a.x * dollW) - (a.w * dollW / 2);
    const y = (a.y * dollH) - (a.h * dollH / 2);
    const w = a.w * dollW;
    const h = a.h * dollH;

    ctx.save();

    // 稀有度光效
    if (layer.rarity && layer.rarity !== 'common') {
      const glowColors = {
        uncommon: 'rgba(68,221,136,0.3)',
        rare: 'rgba(68,136,255,0.35)',
        epic: 'rgba(204,68,255,0.4)',
        legendary: 'rgba(255,140,0,0.5)'
      };
      const color = glowColors[layer.rarity];
      if (color) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + (layer.rarity === 'legendary' ? 8 : layer.rarity === 'epic' ? 4 : 2);
      }
    }

    if (extraSway) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(extraSway * Math.PI / 180);
      ctx.translate(-w / 2, -h / 2);
      ctx.globalAlpha = 0.88;
      ctx.drawImage(layer.image, 0, 0, w, h);
    } else {
      ctx.globalAlpha = 0.88;
      ctx.drawImage(layer.image, x, y, w, h);
    }
    ctx.restore();
  }
}

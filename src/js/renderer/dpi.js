// dpi.js — DPI 适配工具
export function getDPI() { return window.devicePixelRatio || 1; }

export function setupCanvas(canvas, cssW, cssH) {
  const dpr = getDPI();
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr, cssW, cssH };
}

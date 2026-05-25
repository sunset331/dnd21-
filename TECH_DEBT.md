# TECH_DEBT.md — DND 桌宠技术债务

> 最后更新: 2026-05-25
> 优先级: 🔴高 → 🟡中 → 🟢低

---

## 🔴 高优先级

### 1. character.js 过于臃肿 (462行)
- **问题**: 单个文件承担属性计算、状态、装备、套装、外观、情绪、消耗品、成就、序列化等 10 项职责
- **影响**: `src/js/systems/character.js` — 任何子系统修改需通读 462 行
- **方案**: 拆为 facade + 委托模块 (CharacterStats, CharacterEquipment, CharacterStatus, CharacterMood, CharacterCosmetics)
- **风险**: 高 — 需要大量回归测试

### 2. Panel 每30秒全量读档
- **问题**: panel-app.js 用 `setInterval` 读存档 + 全量 DOM 重建
- **影响**: `src/js/panel-app.js:512` — CPU/磁盘空转
- **方案**: 改用 IPC 事件通知 (pet window 存档后通知 panel 刷新)
- **风险**: 中 — 需要新增 IPC channel

### 3. 全局事件监听器无清理
- **问题**: pet-app.js 中 `document.addEventListener('contextmenu')`, `click`, `keydown` 永不 remove
- **影响**: `src/js/pet-app.js:147-157` — 窗口关闭/重载时未释放
- **方案**: 在 `beforeunload` 或 `stop()` 时移除
- **风险**: 低 — SPA 场景暂不触发

### 4. 装备资源文件过大
- **问题**: `src/assets/equipment/` 中 layer.webp 来自 Pollinations，质量参差；icon.webp 部分仍为 0 字节占位
- **影响**: 35 个装备目录，部分资源未填充
- **方案**: 批量用 ComfyUI SDXL 重新生成所有 icon + layer + preview
- **风险**: 中 — 需要 API 调用时间

---

## 🟡 中优先级

### 5. AudioContext 生命周期管理缺失
- **问题**: AudioContext 创建后永不关闭，静音模式下空占内存
- **影响**: `src/js/audio.js:3` — 约 2-5MB 内存
- **方案**: 静音时 `ctx.close()`，需要时重建
- **风险**: 低

### 6. 动画双定时器
- **问题**: `requestAnimationFrame` (animation.js) + `setInterval` (game-loop.js auto-mode) 无统一调度
- **影响**: `src/js/renderer/animation.js` + `src/js/core/game-loop.js` — 自动模式下 CPU 浪费
- **方案**: 合并到单一 rAF 循环，循环内检查所有定时条件
- **风险**: 中 — 需要重构动画调度

### 7. character.fromJSON 可能覆盖构造器注入
- **问题**: `Object.assign(this, data)` 会覆盖 `racesData`, `setsData` 等引用
- **影响**: `src/js/systems/character.js:fromJSON` — JSON 含同名字段时引用丢失
- **方案**: fromJSON 只赋值业务字段，不碰构造器依赖
- **风险**: 中 — 已有 save 数据包含随机字段时触发

### 8. events.json 体积增大
- **问题**: 18 个事件 × 6 结果 × 2-3 模板 = 45KB
- **影响**: 首次加载需 parse 45KB JSON
- **方案**: 当前可接受，超 50 个事件后考虑分页
- **风险**: 低

### 9. CSS 残留样式
- **问题**: pet.css 中可能有未使用的旧选择器
- **影响**: 运行时无影响，仅增加维护成本
- **方案**: 用 PurgeCSS 或手动清理
- **风险**: 低

---

## 🟢 低优先级

### 10. 旧 equipment.json 与 35 个 data.json 冗余
- **问题**: 两份数据源。equipment.json 仍被 Character 构造使用，35 个 data.json 在 EquipCache 已改用内存索引
- **影响**: `src/data/equipment.json` + `src/assets/equipment/*/data.json` — 磁盘浪费 ~20KB
- **方案**: 保留 equipment.json 为唯一数据源，删除 35 个独立 data.json
- **风险**: 低 — 需确保所有读取路径走内存

### 11. src/assets/expressions/ 空目录
- **问题**: PaperDoll 有 expression 层逻辑但无文件
- **影响**: 无运行时影响
- **方案**: ComfyUI 生成 happy/sad/surprised/angry 表情层后填充
- **风险**: 低

### 12. 根目录散落 PNG
- **问题**: `src/assets/d21_dice.png`, `dice_frame.png`, `tray_icon.png` 在根级
- **影响**: 组织混乱
- **方案**: 移到 `src/assets/ui/` 或 `src/assets/dice/`
- **风险**: 低 — 需同步更新引用路径

### 13. 跨平台 powerMonitor 行为差异
- **问题**: `getSystemIdleTime()` 在 Windows/macOS/Linux 返回不同精度
- **影响**: `src/main/activity-tracker.js` — 阈值可能需按平台校准
- **方案**: 仅在 Windows 测试通过，其他平台待验证
- **风险**: 低 — 当前仅 Windows 部署

---

## 统计

| 优先级 | 数量 | 预估工时 |
|--------|------|----------|
| 🔴 高 | 4 | ~6h |
| 🟡 中 | 5 | ~3h |
| 🟢 低 | 4 | ~1h |
| **合计** | **13** | **~10h** |

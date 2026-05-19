# 🎲 DND 21面骰子 — 桌面宠物

> 一颗有生命的魔法骰子，悬浮在你的桌面上，等待你的每一次掷骰。

<p align="center">
  <img src="https://img.shields.io/badge/平台-Windows-blue?style=flat-square" alt="platform">
  <img src="https://img.shields.io/badge/引擎-Electron-9b59b6?style=flat-square" alt="engine">
  <img src="https://img.shields.io/badge/风格-暗黑奇幻酒馆-8e44ad?style=flat-square" alt="style">
  <img src="https://img.shields.io/badge/许可-MIT-green?style=flat-square" alt="license">
</p>

---

## ✦ 这是什么？

一个 **DND 跑团风格的桌面宠物**——一颗 21 面骰子悬浮在你的桌面上，会呼吸、会浮动、会说话。

点击它，掷出命运。它会随机生成搞怪的奇幻冒险事件，根据骰子结果给出**因果关联的结局**。

---

## ✦ 玩法流程

```
  [遭遇事件]          [投掷命运骰]          [结果结算]
  ─────────          ───────────          ─────────
 生成 DND 冒险场景    21面骰旋转判定        场景 + 骰值
 "你在酒馆发现一    ⚀⚁⚂⚃⚄🔄⚅     →   因果结局弹出
  只会说话的烤鸡"                           "你成了烤鸡先知"
```

---

## ✦ 核心特色

### 🎯 三阶段跑团交互
不是一键出结果——先**遭遇事件**，再**亲手掷骰**，最后看**因果结局**。
每一骰都让你参与其中，像真正的跑团。

### 🧩 模块化事件引擎
- **36 种行为** × **36 个地点** × **35 个目标** → 千万级事件组合
- 骰子结果**与事件因果绑定**：大失败和大成功会产生**完全不同的后果**
- 事件元素涵盖：暗精灵、半兽人、传奇幽灵、龙族、矮人、哥布林、诅咒物品、天气系统……

### 🎭 有性格的骰子
骰子会根据你的表现**变化情绪**——连续大失败会嘲讽你，长时间不玩会抱怨"地下城长蘑菇了"，深夜会低语"地下城在呼唤你"。

### 🛡️ 角色状态系统
冒险中获得**醉酒、诅咒、幸运、哥布林气味、地牢通缉、圣光庇护**等状态，影响后续事件走向。

### 🏆 成就系统
13 个搞怪成就等你解锁——从"欢迎来到地牢"到"天选之人"。

### 👻 幽灵模式
长时间不互动，骰子自动半透明化。鼠标靠近时恢复——像漂浮的魔法遗物。

### 📜 冒险日志
完整记录每次掷骰：时间、事件、结果、获得状态。支持搜索和导出。

---

## ✦ 右键菜单

右键骰子弹出菜单：
- 📜 **冒险日志** — 查看所有冒险记录
- 🏆 **成就系统** — 13个解锁成就
- ⚙ **设置** — 透明度、缩放、音效、夜间静音……
- 👁 **显示/隐藏** — 隐藏到系统托盘
- 🚪 **退出**

---

## ✦ 安装与运行

### 方式一：直接运行（推荐）

下载 `DND-Dice-Pet-v1.0.0.zip`，解压后双击 `DND Dice Pet.exe`。

### 方式二：从源码运行

```bash
# 克隆仓库
git clone git@github.com:sunset331/dnd21-.git
cd dnd21-

# 安装依赖
npm install

# 启动
npm start
```

> 中国网络环境可能需要配置镜像：
> ```bash
> ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm install
> ```

---

## ✦ 项目结构

```
dnd-dice-pet/
├── main.js                  # Electron 主进程：透明置顶窗口
├── preload.js               # 安全 IPC 桥接
├── package.json             # 项目配置 + 构建脚本
├── src/
│   ├── renderer/
│   │   ├── index.html       # 主界面 + SVG 水晶骰子
│   │   ├── app.js           # 核心协调器
│   │   ├── dice.js          # 骰子状态机
│   │   ├── scenario.js      # 模块化事件引擎（组件池+组合器）
│   │   ├── status.js        # 角色状态管理
│   │   ├── mood.js          # 骰子情绪系统
│   │   ├── ghost.js         # 幽灵模式
│   │   ├── achievements.js  # 成就系统
│   │   ├── adventure-log.js # 冒险日志
│   │   ├── context-menu.js  # 右键菜单
│   │   ├── settings.js      # 设置面板+持久化
│   │   ├── ui-manager.js    # 弹窗单例管理
│   │   ├── audio.js         # Web Audio 过程化音效
│   │   ├── animation.js     # 粒子特效
│   │   └── result-popup.js  # 判定弹窗
│   └── styles/
│       ├── main.css         # CSS 变量 + 暗黑主题
│       ├── dice.css         # 骰子水晶造型 + 情绪辉光
│       ├── animations.css   # 呼吸/旋转/弹窗动画
│       ├── particles.css    # 粒子爆发
│       ├── popup.css        # 判定卡片
│       ├── ui.css           # 按钮/状态栏/指示器
│       └── settings.css     # 设置面板/成就列表/日志面板
└── README.md
```

**零框架依赖** — 纯 HTML/CSS/JS + Electron，14 个 JS 模块，职责清晰。

---

## ✦ 技术亮点

| 特性 | 实现 |
|---|---|
| 透明浮动窗口 | Electron `transparent:true` + `alwaysOnTop` |
| 点击穿透 | CSS `pointer-events` 精确控制 |
| 拖拽移动 | `-webkit-app-region` 拖拽体系 |
| 过程化音效 | Web Audio API 合成（零外部音频文件） |
| 粒子特效 | CSS `@keyframes` GPU 合成 |
| 设置持久化 | `settings.json` 原子合并写入 |
| 系统托盘 | Electron `Tray` API + 程序化图标 |
| 右键菜单 | 动态 DOM 创建 + 定位算法 |

---

## ✦ 构建与发布

```bash
npm run build          # 构建 Windows 便携版
npm run build:installer  # 构建安装包
```

产物在 `dist/` 目录。

---

## ✦ 致谢

灵感来自 DND 跑团文化、奇幻酒馆传说，以及所有曾经掷出过大失败依然笑着继续的冒险者。

> *"21个面，21种可能。幸运女神说她今天请假。"*
> — 一颗有职业素养的骰子

---

<p align="center">Made with 🎲, ☕, and questionable life choices</p>

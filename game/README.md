# Kaboom.js 小游戏

基于 React + Vite + Kaboom.js 的纯前端小游戏项目。

## 技术栈

- **React 19** - 前端框架
- **Vite 8** - 构建工具
- **Kaboom.js** - 游戏引擎

## 开发

```bash
npm install
npm run dev
```

访问 http://localhost:5173/ 查看游戏。

## 构建

```bash
npm run build
```

输出在 `dist/` 目录。

## 项目结构

```
game/
├── src/
│   ├── components/
│   │   ├── Game.jsx    # Kaboom 游戏主组件
│   │   └── Game.css
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── package.json
└── vite.config.js
```

## 当前功能

- 基础 Kaboom 游戏场景
- 使用方向键或 WASD 移动的蓝色方块
- 边界碰撞限制

## 扩展建议

可在 `src/components/Game.jsx` 的 `k.scene("main", () => {...})` 内扩展游戏逻辑，如：

- 添加精灵图 `loadSprite()`
- 添加更多场景 `k.scene()`
- 物理系统 `body()`, `area()`, `onCollide()`
- 音效与背景音乐

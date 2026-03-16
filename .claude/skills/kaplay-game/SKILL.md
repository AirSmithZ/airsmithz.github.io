---
name: kaplay-game
description: Build 2D games using KAPLAY.js. Use when developing games with KAPLAY, kaplayjs, or when the user asks to create browser-based 2D games, runners, platformers, or arcade games. Follow official KAPLAY documentation at https://kaplayjs.com/docs/guides/
---

# KAPLAY.js 游戏开发

本技能指导使用 [KAPLAY.js](https://kaplayjs.com) 开发 2D 游戏。KAPLAY 是基于组件的 JavaScript 游戏库，概念类似剧场：**Scenes** 是幕、**Game Objects** 是演员、**Components** 是剧本。

## 安装

**推荐**：使用 create-kaplay 脚手架

```bash
npx create-kaplay myGame
cd myGame && npm run dev
```

开发服务器：https://localhost:5173

**npm 安装**：

```bash
npm install kaplay
```

```js
import kaplay from "kaplay";
kaplay();
```

**无打包器（CDN）**：

```html
<body>
  <script type="module" src="./main.js"></script>
</body>
```

```js
// main.js
import kaplay from "https://unpkg.com/kaplay@3001.0.19/dist/kaplay.mjs";
kaplay();
```

## 核心概念

### 初始化

```js
kaplay(); // 默认配置

kaplay({
  width: 800,
  height: 600,
  background: "#2d2d2d",
  scale: 2,
  canvas: document.getElementById("canvas"),
});
```

### 游戏对象 (Game Objects)

使用 `add([组件和标签])` 创建游戏对象：

```js
const player = add([
  rect(32, 32),  // 绘制矩形
  pos(80, 80),   // 位置
  "player",      // 标签
]);

player.move(200, 0);  // pos() 提供的 move
player.is("player");  // 检查标签
```

### 组件 (Components)

常用组件：

| 组件 | 作用 |
|------|------|
| `rect(w, h)` | 矩形 |
| `circle(r)` | 圆形 |
| `sprite(name)` | 精灵图 |
| `pos(x, y)` | 位置，提供 `move()`, `moveBy()` |
| `scale(n)` | 缩放 |
| `color(r, g, b)` | 颜色 |
| `text(str)` | 文本 |
| `area()` | 碰撞区域，提供 `onCollide()` |
| `body()` | 物理体，提供 `jump()`, `isGrounded()` |
| `anchor(pt)` | 锚点：`"topleft"`, `"center"`, `"botleft"` 等 |
| `stay()` | 场景切换时保留对象 |

动态添加/移除：

```js
obj.use(sprite("bean"));
obj.unuse("sprite");
obj.has("sprite");
```

### 场景 (Scenes)

```js
scene("game", () => {
  add([sprite("bean"), pos(100, 100)]);
});

scene("lose", (score) => {
  add([text(`Game Over - ${score}`), pos(center()), anchor("center")]);
  onKeyPress("space", () => go("game"));
});

go("game");           // 进入 game 场景
go("lose", 1000);     // 传参
go("game", { score: 100, level: 2 });  // 多参数用对象
```

### 事件 (Events)

```js
onKeyPress("space", () => player.jump());
onKeyDown("right", () => player.move(200, 0));
onMousePress(() => player.jump());
onLoad(() => {});  // 资源加载完成

onUpdate(() => {  /* 每帧 */ });
onDraw(() => {    /* 每帧绘制后 */ });

// 按标签
onUpdate("enemy", (obj) => { obj.moveBy(-100 * dt(), 0); });
```

对象级事件：

```js
obj.onAdd(() => {});
obj.onDestroy(() => {});
obj.onUpdate(() => {});
obj.onCollide("enemy", () => {});
```

### 标签 (Tags)

```js
add([sprite("ghost"), "enemy", "boss"]);
obj.tag("friend");
obj.untag("enemy");
obj.is("enemy");
get("enemy");   // 获取所有带 "enemy" 标签的对象
get("*");       // 所有对象
```

## 精灵图

```js
loadSprite("bean", "sprites/bean.png");

add([sprite("bean"), pos(100, 100)]);

// 精灵表 + 动画
loadSprite("player", "sprites/player.png", {
  sliceX: 2,
  sliceY: 2,
  anims: {
    run: { from: 0, to: 3, loop: true },
    idle: { from: 4, to: 4 },
  },
});

add([
  sprite("player", { anim: "run", flipX: true }),
  pos(100, 100),
]);
player.play("run");
```

## 物理

```js
setGravity(1600);
setGravityDirection(vec2(0, -1));  // 反向重力

add([
  rect(32, 32),
  pos(80, 80),
  area(),
  body(),
]);

add([
  rect(width(), 48),
  pos(0, height() - 48),
  anchor("botleft"),
  area(),
  body({ isStatic: true }),
  color(127, 200, 255),
]);
```

碰撞：

```js
player.onCollide("tree", () => {
  addKaboom(player.pos);
  shake();
  go("lose", score);
});
```

## 常用 API

```js
width() / height()     // 画布尺寸
center()              // vec2(width/2, height/2)
dt()                  // 帧间隔（秒）
rand(0.5, 1.5)        // 随机数
LEFT, RIGHT, UP, DOWN // 方向常量
vec2(x, y)            // 向量

addKaboom(pos)        // 爆炸特效
shake()               // 屏幕震动
wait(1, () => {})     // 延迟执行
loop(1, () => {})     // 定时循环
destroy(obj)          // 销毁对象
```

## 游戏对象层级

```js
const parent = add([sprite("bag"), pos(100, 100)]);
const child = parent.add([sprite("bean"), pos(16, -16)]);  // 相对父对象
parent.remove(child);
parent.get("favorite", { recursive: true });
```

## 音频

```js
loadSound("jump", "sounds/jump.mp3");
play("jump", { volume: 0.5, speed: 1.2, loop: false });
const snd = play("bgm", { loop: true });
snd.pause();
snd.stop();
```

## 调试

按 `F1` 进入 inspect 模式，显示碰撞框。Chrome 用户可改键：

```js
kaplay({ debugKey: "w" });
```

## 发布

使用 `create-kaplay` 时，运行 `npm run build` 生成 `dist/`。详见 [Publishing Guide](https://kaplayjs.com/docs/guides/publishing)。

## 开发清单

1. 在 `scene()` 内组织游戏逻辑，用 `go()` 切换
2. 使用 `area()` + `body()` 做物理与碰撞
3. 给同类对象统一标签，用 `get("tag")` 批量操作
4. HUD/菜单等需跨场景保留时加 `stay()`
5. 场景之间用 `go("scene", data)` 传参
6. 动画用 `loadSprite` 的 `anims` 配置 + `obj.play("anim")`
7. 循环生成障碍物用 `wait(rand(...), spawnFn)` 递归

## 参考

- [官方文档](https://kaplayjs.com/docs/guides/)
- [API Reference](https://kaplayjs.com/docs/api)
- [KAPLAYGROUND 在线示例](https://play.kaplayjs.com/)
- [创建第一个游戏教程](https://kaplayjs.com/docs/guides/creating_your_first_game)

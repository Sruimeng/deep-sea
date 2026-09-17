---
id: deep-sea
type: guide
---

# VAST 断网大作战

Vue 3 + Three.js 单人街机游戏：依次穿过北京、上海、杭州、加州和深圳的三十个地点，击败“延迟之王”。每城包含六个不同布景的连续街段，每小关清场后三选一 Buff，再向右推进。12 种 Buff 各可叠至 5 级，可组合连击、机动、能量与生存打法。七类常规敌人与一名 Boss 混编登场，包含跳砸、投弹和维修支援。支持三段连击、浮空追击、连锁撞击、跳跃飞踢、冲刺、投掷、怒气大招和逐关肉鸽成长。拳脚带分招轨迹与姿势残影，大招分为蓄能、砸地和三重冲击波。

[在线游玩](https://vast-offline-arcade.vercel.app)

五地版本已部署到 Vercel。

| 操作                        | 按键          |
| --------------------------- | ------------- |
| 移动                        | WASD / 方向键 |
| 连击 / 跳跃                 | J / K         |
| 冲刺或浮空追击 / 拾取或投掷 | Space / E     |
| 怒气大招 / 暂停             | Q / Esc       |

三拳挑飞后按 Space 追击，把敌人打入人群可触发连锁撞击并砸碎道具。移动设备用“闪”触发追击；横竖屏镜头均跟随主角。离开窗口自动暂停；每小关起点与选卡状态自动存档到当前浏览器，刷新保留候选和成长，通关后清除进度并保留最高分。支持静音和关闭震屏。

## 本地开发

推荐 Node.js 24.x（`.node-version`）；最低版本 22.12.0。使用 npm。

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` 执行类型检查、Vite 构建和离线缓存生成；`preview` 预览 `dist/`。Vitest 覆盖战斗逻辑与存档校验。

生产版本首次联网完整加载，页脚显示“离线缓存就绪”后可离线游玩；开发模式不启用离线缓存。需使用 HTTPS 或 localhost，清除浏览器站点数据会同时删除缓存与存档。

11 份 GLB 模型由 Tripo P2 生成，保留 PBR 材质，经 Blender 处理并为主角制作 14 段骨骼动画。三种新增敌人为本地程序模型；三十个街段使用不同程序布景与生成地标组合；音效由 Web Audio 合成。品牌标识沿用 Tripo 原始素材，主题为品牌黄与灰黑白。来源和处理步骤见 [资源指南](llmdoc/guides/assets.md)。运行游戏不调用 Tripo API。

## Vercel

生产项目：`vast-offline-arcade`；工作区：`ruimengsuuuuu-6106s-projects`。

后续部署使用项目根目录、Node.js 24.x 和 `vercel.json`：Vite、`npm ci`、`npm run build`、输出目录 `dist`。若连接 Git，在现有 Vercel 项目的 Git 设置中关联仓库。

`.vercelignore` 排除凭据、临时资源、`art/` 和开发期 Tripo/Blender 脚本。`VITE_` 前缀的环境变量会公开给客户端，不得用于密钥。

当前成长版：逻辑测试覆盖 30 关与 30 次选卡、叠加上限、确定性候选、Buff 实际伤害与触发、v1 兼容和 v2 存档校验。浏览器检查新增街段布景、选卡刷新恢复与 390px 手机布局；完整战役由操作机器人验证，尚未逐关人工实战验证。

此前版本已验证生产离线缓存和断网游玩。此次构建已生成新离线缓存，未重复完整断网流程。

项目规范见 [llmdoc/index.md](llmdoc/index.md)。

---
id: tech-stack
type: reference
---

# 技术栈

| 项目        | 配置                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| 运行环境    | 推荐 Node.js 24.x（`.node-version`）；`engines` 下限 22.12.0；npm        |
| 前端        | Vue 3.5、TypeScript 5.9                                                  |
| 3D / 音频   | Three.js 0.186、Web Audio API                                            |
| 构建        | Vite 8                                                                   |
| 测试        | Vitest 5；`npm test`                                                     |
| 类型检查    | `vue-tsc --noEmit`                                                       |
| 开发 / 预览 | `npm run dev` / `npm run preview`                                        |
| 生产构建    | `npm run typecheck && vite build && node scripts/build_offline.mjs`      |
| 生产站点    | [vast-offline-arcade.vercel.app](https://vast-offline-arcade.vercel.app) |

`index.html → src/main.ts → src/App.vue → src/components/game/GameShell.vue`。

| 文件                                                            | 职责                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/game/types.ts`、`content.ts`                               | 状态契约、关卡与升级配置                                                   |
| `src/game/simulation.ts`                                        | 战斗与关卡状态；不依赖渲染                                                 |
| `src/game/street.ts`                                            | 街段间距、边界与镜头目标位置                                               |
| `src/game/attacks.ts`、`combat-feedback.ts`、`enemy-tactics.ts` | 招式时序、命中反馈、数字运动与敌人战术目标                                 |
| `src/game/action-presentation.ts`、`skill-effects.ts`           | 招式姿势叠加与接触帧映射；技能几何特效、姿势残影与资源释放                 |
| `src/game/renderer.ts`                                          | Three.js 场景、模型、动画与特效                                            |
| `src/game/blocks.ts`、`enemy-models.ts`                         | 街段名称、地面与道具配置；三种新增敌人的程序模型                           |
| `src/game/cities.ts`                                            | 五地十五个街段的程序场景与城市细节                                         |
| `src/game/input.ts`、`audio.ts`                                 | 键盘/触控输入、合成音频                                                    |
| `src/game/storage.ts`                                           | localStorage 存档与最高分                                                  |
| `src/game/offline.ts`                                           | Service Worker 注册与离线缓存状态                                          |
| `src/components/game/`                                          | 菜单、HUD、弹层、触控；StreetPrompt 提示前进与追击；GameShell 协调生命周期 |
| `public/models/`                                                | 11 份本地 P2 GLB：角色、敌人和五地地标                                     |
| `public/brand/`                                                 | Tripo 标识与字标                                                           |
| `art/*.blend`、`art/manifest.json`                              | 每份模型的可编辑源文件、来源与体积清单                                     |
| `scripts/build_offline.mjs`                                     | 按构建产物内容生成版本化 `dist/sw.js`                                      |

GameShell 挂载时调用 `prepareOfflineCache`，仅生产模式注册 Service Worker，并在页脚显示缓存状态。预缓存同源构建文件；导航优先联网，失败时回退缓存。无服务端、路由或状态库，游戏运行不依赖外部 API。

构建产物内容决定缓存版本。新 Worker 完整缓存成功后执行 `skipWaiting`，激活时清理旧版本并接管页面；原页面已有控制器时，控制器更换触发一次刷新。模型请求带 `?v=action-crowd-20260917`，避免旧请求缓存；当前 Worker 按路径读取当前版本缓存，支持离线模型加载。

`vercel.json` 指定 `framework: vite`、安装命令 `npm ci`、构建命令 `npm run build`、产物目录 `dist`；部署在站点根路径。

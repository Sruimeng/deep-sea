---
id: constitution
type: reference
---

# 项目约束

- Deep Sea 仓库承载“VAST 断网大作战”，使用纯前端技术，不保留旧 Godot 工程。
- 使用 Vue Composition API、`<script setup lang="ts">` 和 TypeScript。
- Vue 组件使用 PascalCase；TypeScript 变量与函数使用 camelCase。
- 类型与接口先于实现；注释只解释原因。
- 新增路由、状态库或 API 前，先明确需求与边界。
- 战斗模拟独立于 Vue、Three.js 和浏览器存储；界面通过快照展示状态。
- 游戏资源随站点发布；Tripo 仅用于开发期生成资源，运行时不调用生成服务。
- 品牌使用已提供的 Tripo 标识与字标，主题沿用 `@tripo3d/design` 的 `#F9CF00` 和灰黑白。
- 存档只保留关卡起点、分数与升级；存储不可用时仍允许游玩。
- 客户端代码和 `VITE_` 环境变量不得存放密钥。
- `.env.tripo` 和生成任务缓存留在忽略目录；不提交凭据或带签名的下载链接。正式 Blender 源文件与来源清单位于 `art/`，由 `.vercelignore` 排除部署。
- 交付前执行 `npm test` 与 `npm run build`，覆盖逻辑测试、类型检查、生产构建和离线缓存生成。
- 未经用户授权，不提交代码或执行实际部署。

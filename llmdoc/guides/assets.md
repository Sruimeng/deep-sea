---
id: assets
type: guide
---

# 资源处理

| 产物                                                            | 来源与处理                                          |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `public/models/hero.glb`                                        | Tripo P2 生成、自动绑定；Blender 制作 14 段骨骼动画 |
| `packet`、`spinner`、`guard`、`charger`、`router` GLB           | Tripo P2 生成的五种敌人模型                         |
| `beijing`、`shanghai`、`hangzhou`、`california`、`shenzhen` GLB | Tripo P2 生成的五地地标                             |
| `art/*.blend`                                                   | 11 份正式可编辑模型源文件                           |
| `art/manifest.json`                                             | 模型版本、生成/绑定任务 ID、面数、字节数和动作名    |
| 城市办公室与道具                                                | `src/game/cities.ts`、`renderer.ts` 程序建模        |
| 音效与背景节奏                                                  | `src/game/audio.ts` 使用 Web Audio 合成             |

模型保留原始 P2 几何和 PBR 材质，每份约 2.2–2.7 万面；贴图最长边 1536，主角与 Boss 为 2048。11 份发布模型合计约 22.5 MB，准确体积以清单为准。

主角动作：`idle`、`run`、`jab`、`cross`、`uppercut`、`kick`、`special`、`dash`、`jump`、`hurt`、`fall`、`sweep`、`lunge`、`land`。

## 品牌来源

用户指定的参考仓库 `agent/fe-tripo-studio` 提供 `public/favicon.svg` 和 `public/images/tripo-text.png`，分别复制为 `public/brand/tripo-mark.svg` 与 `public/brand/tripo-wordmark.png`；站点图标沿用原 SVG。主题沿用 `@tripo3d/design` 的 `#F9CF00` 与灰黑白。

## 生成与处理

`Tripo P2 生成 → 主角自动绑定 → 下载到 .llmdoc-tmp/ → Blender 材质与动画处理 → public/models/ + art/`。

- `scripts/tripo.py` 使用 [Tripo 官方 v3 文生模型 API](https://developers.tripo3d.ai/en/docs/generation-text-to-model/p)，公开模型标识为 `P2-20260801`，默认请求 24000 面、PBR 和详细纹理。
- 旧 v2 API 不接受内部名称 `Nexus-v2.0-20260801`；当前资源由 v3 的 `P2-20260801` 成功生成。
- 脚本提供 `generate`、`status`、`rig`、`download`。凭据来自 `TRIPO_API_KEY` 或权限 `600` 的 `.env.tripo`；不输出凭据或记录签名下载链接。
- 原始 GLB 和任务缓存位于忽略的 `.llmdoc-tmp/`。任务缓存为空时，Tripo 脚本从 `art/manifest.json` 恢复任务 ID，P2 任务补齐 `-p2` 后缀，绑定任务使用 `-p2-rig`；缓存文件缺失时写回磁盘，供下载与 Blender 处理复用。
- `scripts/hero_motion.py` 定义关键姿势与双骨 IK，控制手腕和脚踝落点；躯干转动、重心和脚步共同驱动攻击。
- `scripts/prepare_assets.py` 保留几何与 PBR、限制贴图尺寸、统一朝向、重建主角动作，导出各模型 GLB、对应 `.blend` 和来源清单。

```sh
blender --background --python scripts/prepare_assets.py -- --only hero
npm run build
```

处理脚本读取 `.llmdoc-tmp/<name>-p2.glb`；主角读取 `hero-p2-rig.glb`，任务清单使用对应 `-p2` 名称。重新处理后检查朝向、14 段动作、材质和体积。

`.vercelignore` 排除 `.env*`、临时目录、`art/` 和开发期生成脚本。生产构建缓存发布后的模型；首次联网完整缓存后可离线，运行时不调用 Tripo API。

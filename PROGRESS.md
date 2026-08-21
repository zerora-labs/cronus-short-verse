# CronusShortVerse 开发进度

> 最后更新：2026-08-20

## 当前状态：Phase 1 MVP 基本完成

### 完成清单

| 功能 | 后端 API | 前端页面 | 完成日期 | 备注 |
|------|:--------:|:--------:|:--------:|------|
| 用户注册/登录 | ✅ | ✅ | 2026-08-15 | JWT 认证 |
| 宇宙 CRUD | ✅ | ✅ | 2026-08-15 | 含复制(fork)、导出编年史 |
| 角色 CRUD（含天体类型） | ✅ | ✅ | 2026-08-15 | 5 种天体类型 |
| Galaxy Engine 星图 | ✅ | ✅ | 2026-08-15 | Canvas 交互式星图，拖拽/缩放 |
| 引力关系管理 | ✅ | ✅ | 2026-08-20 | 4 种关系类型 |
| 提案 + 投票 | ✅ | ✅ | 2026-08-20 | 简单计数投票，多数决自动通过 |
| 弧与剧集管理 | ✅ | ✅ | 2026-08-21 | 含剧集 CRUD，嵌入宇宙详情 Tab |
| 事件追踪（信号/噪声） | ✅ | ✅ | 2026-08-21 | 含信号/噪音筛选，嵌入宇宙详情 Tab |
| 变更历史 | ✅ | ✅ | 2026-08-21 | 按宇宙筛选，嵌入宇宙详情 Tab |
| 角色详情页 | — | ✅ | 2026-08-20 | Character Book 完整视图 |
| 提案中心页面 | — | ✅ | 2026-08-20 | 创建提案 + 投票面板 |

### Phase 1 完成 ✅

Phase 1 全部功能已于 2026-08-21 补全：
- [x] Galaxy 星图展示提案演化标记（已有 pulsing E badge）
- [x] 弧/剧集管理前端页面
- [x] 事件管理前端页面
- [x] 变更历史前端页面
- [x] 关系管理 CRUD UI（创建/编辑/删除）

### 数据库状态

`db.js` 定义了 **14 张表**（全部已创建）：

```
users, universes, characters, relationships, arcs, episodes,
proposals, votes, character_episodes, events, event_characters,
ai_sessions, history, notifications
```

> 注意：proposals 表已新增 `universe_id` 字段（2026-08-20），旧数据库需重建。

### 项目文件结构

```
packages/server/
├── package.json
├── data/                        # SQLite 数据库（自动创建）
└── src/
    ├── index.js                 # Express 入口，注册所有路由
    ├── db.js                    # 数据库初始化（14 张表）
    ├── middleware/
    │   └── auth.js              # JWT 认证中间件
    └── routes/
        ├── auth.js              # 用户注册/登录/信息
        ├── universes.js         # 宇宙 CRUD + fork + export
        ├── characters.js        # 角色 CRUD + Galaxy 数据 + 关系
        ├── proposals.js         # 提案 CRUD + 投票 + 自动通过
        ├── arcs.js              # 弧 + 剧集 CRUD
        ├── events.js            # 事件管理 + 角色关联
        └── history.js           # 变更历史查询

packages/web/
├── index.html                   # SPA 入口，所有页面 div
├── app.js                       # 前端逻辑（路由、API 调用）
└── galaxy.js                    # Galaxy Engine Canvas 渲染
```

### 启动方式

```bash
# 后端
cd packages/server
npm install
npm run dev          # http://localhost:3001

# 前端（直接浏览器打开）
open packages/web/index.html
```

> 前端 API_BASE 硬编码为 http://localhost:3001/api，后端必须先启动。

### API 测试

```bash
# 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

---

## 开发日志

### 2026-08-21

1. **后端补全**：
   - `characters.js` 新增关系更新/删除 API (`PUT/DELETE /api/characters/relationships/:id`)
   - `arcs.js` 新增剧集更新/删除 API (`PUT/DELETE /api/arcs/:arcId/episodes/:episodeId`)
   - `history.js` 新增按宇宙筛选支持 (`?universe_id=`)
2. **前端重构**：
   - 宇宙详情页改为 Tab 布局：角色、引力关系、弧与剧集、事件、变更历史
   - 关系管理 UI：创建/编辑/删除关系，下拉选角色
   - 弧与剧集管理：创建/编辑/删除弧，内嵌剧集列表及 CRUD
   - 事件管理：创建/删除事件，信号/噪音筛选
   - 变更历史：按宇宙展示，支持展开查看变更详情
3. **文档同步**：README / README.zh-CN / PROGRESS.md 更新为实际完成状态

### 2026-08-20

1. **README 更新**：新增「开发状态」「TODO」章节，中英双语同步，语言切换 badge 对齐 cronus-cycle 风格
2. **后端补全**：
   - `db.js` 新增 6 张缺失表（character_episodes, events, event_characters, ai_sessions, history, notifications）
   - 新增 `proposals.js`：提案 CRUD + 投票 + 多数决自动通过 + 变更应用
   - 新增 `arcs.js`：弧 + 剧集 CRUD
   - 新增 `events.js`：事件管理 + 角色关联
   - 新增 `history.js`：变更历史查询（支持筛选）
   - `proposals` 表增加 `universe_id` 字段，修复提案列表查询逻辑
3. **前端补全**：
   - 提案中心页面（列表 + 创建 + 投票）
   - 角色详情页（Character Book：属性、目标、引力关系）
   - 宇宙详情改进：角色名可点击跳转详情，新增提案中心入口
4. **Bug 修复**：提案列表查询通过 target_id 子匹配有漏洞，改为直接用 universe_id

---

## 下一步（Phase 2）

### 核心功能增强
- [ ] Galaxy Engine 动态轨道动画（当前为静态平衡态）
- [ ] 信号/噪声事件可视化
- [ ] 历史版本回滚 UI
- [ ] 通知系统

### Phase 3 — AI 集成（Q4 2026）
- [ ] AI 故事分支生成（OpenAI / Anthropic API）
- [ ] AI 会话管理 + 提交为提案
- [ ] 逻辑审计（角色一致性检查）

---

## 技术栈

- **后端**：Express + SQLite（better-sqlite3）+ JWT
- **前端**：原生 JS + TailwindCSS（CDN）+ Canvas（Galaxy Engine）
- **数据库**：SQLite（本地文件，WAL 模式）
- **认证**：JWT token

# CronusShortVerse 架构方案

> 版本：v1.0 | 日期：2026-08-15

## 1. 数据库表设计

### 核心实体

| 表名 | 字段 | 说明 |
|------|------|------|
| **users** | id, username, email, password_hash, avatar_url, reputation_score, created_at, updated_at | 用户账户，reputation 用于投票权重 |
| **universes** | id, name, description, rules (JSON), creator_id → users, created_at, updated_at | 世界观/World Book |
| **characters** | id, name, description, celestial_type (star/planet/comet/meteor/black_hole), universe_id → universes, creator_id → users, mass (叙事重要性), traits (JSON), goals (JSON), backstory, created_at, updated_at | 角色/Character Book |
| **arcs** | id, name, description, universe_id → universes, season_number, created_at, updated_at | 故事弧 |
| **episodes** | id, title, description, sequence_number, arc_id → arcs, duration_seconds, created_at, updated_at | 剧集（约2分钟） |

### 关系与事件

| 表名 | 字段 | 说明 |
|------|------|------|
| **relationships** | id, character_a_id → characters, character_b_id → characters, type (attraction/repulsion/orbit/collision), strength, description, created_at, updated_at | 引力互动 |
| **character_episodes** | id, character_id → characters, episode_id → episodes, role (protagonist/supporting/guest), created_at | 角色出场 |
| **events** | id, name, description, event_type (signal/noise), episode_id → episodes, universe_id → universes, created_at | 叙事事件 |
| **event_characters** | id, event_id → events, character_id → characters, impact_description, created_at | 事件影响的角色 |

### 演化系统

| 表名 | 字段 | 说明 |
|------|------|------|
| **proposals** | id, title, description, proposer_id → users, target_type (character/universe/relationship), target_id, proposed_changes (JSON), status (pending/approved/rejected), voting_end_at, created_at, updated_at | 演化提案 |
| **votes** | id, proposal_id → proposals, voter_id → users, vote (approve/reject), weight, created_at | 投票 |
| **ai_sessions** | id, user_id → users, universe_id → universes, prompt, model_used, response (JSON), selected_branch_id, created_at | AI 生成会话 |
| **history** | id, entity_type, entity_id, action (create/update/delete), before_state (JSON), after_state (JSON), trigger_type (proposal/ai/manual), trigger_id, user_id → users, created_at | 变更历史日志 |
| **notifications** | id, user_id → users, type, message, is_read, data (JSON), created_at | 通知 |

---

## 2. API 接口设计

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |

### 宇宙管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes` | 宇宙列表 |
| POST | `/api/universes` | 创建宇宙 |
| GET | `/api/universes/:id` | 宇宙详情 |
| PUT | `/api/universes/:id` | 更新宇宙 |

### 角色管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes/:uid/characters` | 宇宙下的角色列表 |
| POST | `/api/universes/:uid/characters` | 创建角色 |
| GET | `/api/characters/:id` | 角色详情 |
| PUT | `/api/characters/:id` | 更新角色 |
| GET | `/api/characters/:id/history` | 角色演化历史 |

### 关系与事件
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes/:uid/relationships` | 引力关系列表 |
| POST | `/api/universes/:uid/relationships` | 创建关系 |
| GET | `/api/universes/:uid/events` | 事件列表 |
| POST | `/api/universes/:uid/events` | 创建事件 |

### 弧与剧集
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes/:uid/arcs` | 弧列表 |
| POST | `/api/universes/:uid/arcs` | 创建弧 |
| GET | `/api/arcs/:aid/episodes` | 剧集列表 |
| POST | `/api/arcs/:aid/episodes` | 创建剧集 |

### 提案与投票
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes/:uid/proposals` | 提案列表 |
| POST | `/api/universes/:uid/proposals` | 创建提案 |
| POST | `/api/proposals/:id/vote` | 投票 |

### AI 生成
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/generate` | 生成故事分支（流式） |
| POST | `/api/ai/sessions/:id/commit` | 提交 AI 生成内容 |

### 可视化与历史
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/universes/:uid/galaxy` | Galaxy Engine 数据（节点+边） |
| GET | `/api/history` | 变更历史（支持筛选） |

---

## 3. 前端页面与组件

### 页面
| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 平台介绍、热门宇宙推荐 |
| 宇宙列表 | `/universes` | 浏览所有宇宙 |
| 宇宙详情 | `/universes/:id` | Galaxy 星图 + 角色列表 + 剧集 |
| 角色详情 | `/characters/:id` | Character Book、关系、历史时间线 |
| 提案中心 | `/universes/:id/proposals` | 创建/投票提案 |
| AI 工作室 | `/ai-studio` | AI 故事生成界面 |
| 个人中心 | `/profile` | 用户信息、参与的宇宙 |

### 核心组件
- **GalaxyEngine** — 交互式星图（D3.js/Canvas，节点=角色，边=关系）
- **CharacterCard** — 角色卡片（显示天体类型、质量、属性）
- **RelationshipGraph** — 关系可视化
- **ProposalForm** — 提案创建表单
- **VotingPanel** — 投票面板
- **AIGenerator** — AI 故事生成器（流式输出）
- **HistoryTimeline** — 演化历史时间线
- **CelestialBadge** — 天体类型标识（Star/Planet/Comet 等）

---

## 4. 推荐技术栈

```
后端:
  - Node.js + TypeScript
  - Fastify（高性能 HTTP 框架）
  - Prisma ORM + PostgreSQL
  - Redis（缓存 + 会话）

前端:
  - React 18 + TypeScript
  - Vite（构建工具）
  - TailwindCSS（样式）
  - D3.js（Galaxy Engine 可视化）
  - TanStack Query（数据请求）

AI 集成:
  - OpenAI / Anthropic API（可插拔）
  - Server-Sent Events（流式生成）

基础设施:
  - Docker + Docker Compose
  - GitHub Actions（CI/CD）
```

---

## 5. 实现优先级

### Phase 1: MVP（最小可用版本）
1. 用户注册/登录
2. 宇宙 CRUD
3. 角色 CRUD（含天体类型）
4. 基础 Galaxy Engine（2D 静态星图）
5. 简单提案 + 投票

### Phase 2: 核心功能
1. 引力关系管理
2. 弧与剧集管理
3. 事件追踪（信号/噪声）
4. 历史记录与回滚
5. Galaxy Engine 动画（轨道运行）

### Phase 3: AI 集成
1. AI 故事分支生成
2. AI 会话管理
3. 提交 AI 生成内容为提案
4. 逻辑审计（检查角色一致性）

### Phase 4: 完善与移动端
1. 通知系统
2. 移动端适配
3. 性能优化
4. iOS/Android App

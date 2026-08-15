# CronusShortVerse 开发进度

> 最后更新：2026-08-15

## 当前状态

### Phase 1: MVP（最小可用版本）

| 功能 | 后端 API | 前端页面 | 状态 |
|------|---------|---------|------|
| 用户注册/登录 | ✅ 完成 | ⏳ 待实现 | 后端 OK |
| 宇宙 CRUD | ✅ 完成 | ⏳ 待实现 | 后端 OK |
| 角色 CRUD（含天体类型） | ✅ 完成 | ⏳ 待实现 | 后端 OK |
| 基础 Galaxy Engine | ❌ | ⏳ 待实现 | — |
| 简单提案 + 投票 | ❌ | ⏳ 待实现 | — |

### 已完成的文件

```
packages/server/
├── package.json          # 依赖配置
├── data/                 # SQLite 数据库（自动创建）
└── src/
    ├── index.js          # Express 服务器入口
    ├── db.js             # 数据库初始化（SQLite + 14 张表）
    ├── middleware/
    │   └── auth.js       # JWT 认证中间件
    └── routes/
        ├── auth.js       # 用户注册/登录/信息
        ├── universes.js  # 宇宙 CRUD
        └── characters.js # 角色 CRUD
```

### 技术栈（当前）

- **后端**：Express + SQLite（better-sqlite3）+ JWT
- **数据库**：SQLite（本地文件，无需安装）
- **认证**：JWT token

### 启动方式

```bash
cd packages/server
npm install
npm start
# 服务器运行在 http://localhost:3001
```

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

## 下一步计划

### 前端 Web 界面（当前任务）

1. 首页 — 平台介绍、热门宇宙
2. 宇宙列表 — 浏览所有宇宙
3. 宇宙详情 — 角色列表 + Galaxy 星图
4. 角色详情 — Character Book
5. 用户注册/登录页面

### 后端待实现

1. 关系管理 API（引力关系）
2. 提案 + 投票 API
3. 剧集管理 API
4. Galaxy Engine 数据 API

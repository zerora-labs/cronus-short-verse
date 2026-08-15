const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== 用户路由 ==========
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ========== 宇宙路由 ==========
const universeRouter = require('./routes/universes');
app.use('/api/universes', universeRouter);

// ========== 角色路由 ==========
const characterRouter = require('./routes/characters');
app.use('/api/characters', characterRouter);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🌌 CronusShortVerse server running on http://localhost:${PORT}`);
});

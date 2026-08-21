const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// 安全中间件
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// 生产环境安全头
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// ========== API 路由 ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/universes', require('./routes/universes'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/arcs', require('./routes/arcs'));
app.use('/api/events', require('./routes/events'));
app.use('/api/history', require('./routes/history'));

// ========== 生产环境：serve 前端静态文件 ==========
if (NODE_ENV === 'production') {
  const webDir = path.join(__dirname, '..', '..', 'web');
  app.use(express.static(webDir));
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌌 CronusShortVerse [${NODE_ENV}] running on http://0.0.0.0:${PORT}`);
});

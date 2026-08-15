const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cronus-short-verse-secret-key';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId };

    next();
  } catch (error) {
    res.status(401).json({ error: '无效的 token' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
